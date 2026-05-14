// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";
import { deterministicSerialize } from "./serde";
import type { OperationalEvent } from "./operational-memory";

export interface ReplayEnvelope {
  version: "1";
  exportedAt: string;
  eventCount: number;
  events: OperationalEvent[];
  digest: string;
}

export function buildReplayEnvelope(events: OperationalEvent[], exportedAt: string): ReplayEnvelope {
  const sorted = [...events].sort((a, b) => a.sequence - b.sequence);
  const digest = createHash("sha256").update(deterministicSerialize(sorted)).digest("base64url");
  return { version: "1", exportedAt, eventCount: sorted.length, events: sorted, digest };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function eventPayload(event: OperationalEvent): Record<string, unknown> {
  return isRecord(event.payload) ? event.payload : {};
}

function replayReasonCode(event: OperationalEvent): string {
  const payload = eventPayload(event);
  const degraded = isRecord(payload.degraded) ? payload.degraded : undefined;
  const degradedStateTrigger = isRecord(payload.degraded_state_trigger)
    ? payload.degraded_state_trigger
    : isRecord(payload.degradedStateTrigger)
      ? payload.degradedStateTrigger
      : undefined;
  const policyDecision = isRecord(payload.policyDecision) ? payload.policyDecision : undefined;
  const policyReasons = Array.isArray(policyDecision?.reasons) ? policyDecision.reasons : [];
  const firstPolicyReason = policyReasons.find(isRecord);
  return String(degraded?.reasonCode ?? degradedStateTrigger?.reason ?? firstPolicyReason?.code ?? "").trim();
}

function replayEventShapeIssues(events: unknown[]): string[] {
  const reasons: string[] = [];
  for (const event of events) {
    if (!isRecord(event)) {
      reasons.push("malformed_replay_event");
      continue;
    }
    if (!Number.isInteger(event.sequence)) reasons.push("malformed_replay_event");
    if (!String(event.category ?? "").trim()) reasons.push("malformed_replay_event");
    if (!isRecord(event.payload)) reasons.push("malformed_replay_event");
  }
  return reasons;
}

export function validateReplayEnvelope(envelope: ReplayEnvelope): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!isRecord(envelope)) return { ok: false, reasons: ["malformed_replay_envelope"] };
  if (envelope.version !== "1") reasons.push("unsupported_replay_version");
  if (typeof envelope.eventCount !== "number") reasons.push("malformed_replay_event_count");
  if (!Array.isArray(envelope.events)) {
    return { ok: false, reasons: [...new Set([...reasons, "malformed_replay_events"])] };
  }
  if (!String(envelope.digest ?? "").trim()) reasons.push("missing_replay_digest");
  for (const reason of replayEventShapeIssues(envelope.events)) reasons.push(reason);
  if (envelope.eventCount !== envelope.events.length) reasons.push("event_count_mismatch");
  if (envelope.events.some((e, i) => e.sequence !== i)) reasons.push("sequence_mismatch");
  if (envelope.events.some((e) => !e.replayRef?.lineage?.length)) reasons.push("missing_replay_lineage");
  if (envelope.events.some((e) => (e.category === "degraded_state" || e.category === "degraded_state_trigger" || e.category === "policy_outcome") && !replayReasonCode(e))) reasons.push("missing_replay_reason_code");
  for (const reason of validateExecutionReplayGovernance(envelope.events)) reasons.push(reason);
  const expectedDigest = createHash("sha256").update(deterministicSerialize(envelope.events)).digest("base64url");
  if (expectedDigest !== envelope.digest) reasons.push("digest_mismatch");
  return { ok: reasons.length === 0, reasons: [...new Set(reasons)] };
}

const EXECUTION_EVENT_PREFIX = "execution_";

export function validateExecutionReplayGovernance(events: OperationalEvent[]): string[] {
  const reasons: string[] = [];
  for (const event of events) {
    const payload = eventPayload(event);
    const receipt = (payload as { receipt?: { executionLineage?: Record<string, unknown> } }).receipt;
    const lineage = receipt?.executionLineage;
    if (lineage) {
      if (!String(lineage.executionPlanId ?? "").trim()) reasons.push("missing_execution_plan_lineage");
      if (!String(lineage.executionApprovalId ?? "").trim()) reasons.push("missing_approval_lineage");
      if (!String(lineage.executionIntentHash ?? "").trim()) reasons.push("execution_intent_mismatch");
      if (!String(lineage.executionPolicySnapshotHash ?? "").trim()) reasons.push("policy_snapshot_mismatch");
      if (!String(lineage.executionTrustSnapshotHash ?? "").trim()) reasons.push("trust_snapshot_mismatch");
      if (!String(lineage.authorizationLineageId ?? "").trim()) reasons.push("stale_authorization");
      if (!String(lineage.replayReferenceId ?? "").trim()) reasons.push("missing_replay_lineage");
    }
    if (!event.category.startsWith(EXECUTION_EVENT_PREFIX)) continue;
    if (!String(payload.planId ?? "").trim()) reasons.push("missing_execution_plan_lineage");
    if (!String(payload.reasonCode ?? "").trim()) reasons.push("missing_governance_reason_code");
    if (["execution_approval_requested", "execution_plan_approved", "execution_plan_rejected", "execution_plan_revoked", "execution_plan_expired"].includes(event.category) && !String(payload.approvalId ?? "").trim()) reasons.push("missing_approval_lineage");
    if (["execution_authorization_granted", "execution_authorization_denied"].includes(event.category) && !String(payload.authorizationLineageId ?? "").trim()) reasons.push("stale_authorization");
    if (event.category === "execution_policy_snapshot_recorded" && !String(payload.policySnapshotHash ?? "").trim()) reasons.push("policy_snapshot_mismatch");
    if (event.category === "execution_trust_snapshot_recorded" && !String(payload.trustSnapshotHash ?? "").trim()) reasons.push("trust_snapshot_mismatch");
  }
  return [...new Set(reasons)].sort();
}
