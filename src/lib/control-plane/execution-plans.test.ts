// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import type { PolicyBundle } from "./governance";
import { evaluatePolicy } from "./governance";
import { buildExecutionPlanEvents, OperationalMemoryLog } from "./operational-memory";
import { buildReplayEnvelope, validateReplayEnvelope } from "./replay";
import type { NodeDescriptor } from "./types";
import {
  approveExecutionPlan,
  createExecutionApproval,
  createExecutionPlan,
  createExecutionPolicySnapshot,
  createExecutionTrustSnapshot,
  expireExecutionApproval,
  hashExecutionIntent,
  hashExecutionPolicySnapshot,
  hashExecutionTrustSnapshot,
  rejectExecutionPlan,
  revokeExecutionApproval,
  validateExecutionAuthorization,
  validateExecutionSnapshotIntegrity,
} from "./execution-plans";
import { summarizeExecutionPlanEventCounts } from "./observability";

const now = "2026-05-09T00:00:00.000Z";
const allowPolicy: PolicyBundle = { id: "allow", version: "1", defaultEffect: "allow", rules: [] };
const denyPolicy: PolicyBundle = { id: "deny", version: "1", defaultEffect: "deny", rules: [] };
const approvalPolicy: PolicyBundle = {
  id: "approval",
  version: "1",
  defaultEffect: "allow",
  rules: [{ id: "approval-rule", order: 1, description: "operator approval", effect: "approval_required", reasonCode: "policy_rule_approval_required", matches: () => true }],
};

function request(action = "worker:execute") {
  return { version: "1", requestId: "r-plan", receivedAt: now, source: "test", actor: "operator", action, constraints: [], metadata: {} };
}

function trustedNode(overrides: Partial<NodeDescriptor> = {}): NodeDescriptor {
  return {
    version: "1",
    nodeId: "worker-1",
    role: "remote",
    transport: "http",
    endpoint: "https://worker",
    trustClass: "trusted",
    registeredAt: now,
    lastHeartbeatAt: now,
    health: "healthy",
    metadata: {},
    workerTrustLevel: "trusted_remote",
    workerAttestationStatus: "operator_approved",
    workerTrustReasonCodes: ["operator_approved"],
    workerLastAttestedAt: now,
    capabilities: { version: "1", capturedAt: now, source: "test", runtimeBackend: "mock", executionMode: "remote", gpus: [], models: [], policyTags: [], reliabilityTags: [], runtimeTags: [], transportRequirements: [] },
    ...overrides,
  };
}

function planFrom(policyBundle = approvalPolicy, node: NodeDescriptor | null = trustedNode()) {
  const intent = { requestId: "r-plan", actor: "operator", action: "worker:execute", command: "run:model", targetNodeId: "worker-1", executionMode: "remote" as const, metadata: {} };
  const policy = evaluatePolicy(policyBundle, { request: request(), actionClass: "generic" });
  const policySnapshot = createExecutionPolicySnapshot({
    capturedAt: now,
    governedRoutingEnabled: true,
    heterogeneousRoutingEnabled: true,
    remoteExecutionEnabled: true,
    policy,
    degradedStateTriggerPermitted: false,
    selectedCandidateClass: "remote_worker",
    workerTrustLevel: node?.workerTrustLevel,
    workerAttestationStatus: node?.workerAttestationStatus,
    executionMode: "remote",
  });
  const trustSnapshot = createExecutionTrustSnapshot({ capturedAt: now, node });
  return createExecutionPlan({ intent, policySnapshot, trustSnapshot, createdAt: now, actor: "operator" });
}

describe("execution plans and approval lineage", () => {
  it("creates deterministic plan ids and intent/snapshot hashes", () => {
    const a = planFrom();
    const b = planFrom();
    expect(a.planId).toBe(b.planId);
    expect(a.intentHash).toBe(hashExecutionIntent(a.intent));
    expect(a.policySnapshotHash).toBe(hashExecutionPolicySnapshot(a.policySnapshot));
    expect(a.trustSnapshotHash).toBe(hashExecutionTrustSnapshot(a.trustSnapshot));
  });

  it("records append-only phase transitions and approval lineage", () => {
    const plan = planFrom();
    const { plan: approved, approval } = approveExecutionPlan(plan, { actor: "operator", approvedAt: now, expiresAt: "2026-05-09T01:00:00.000Z" });
    expect(approved.transitions.length).toBeGreaterThan(plan.transitions.length);
    expect(plan.transitions.length).toBe(3);
    expect(approval.planId).toBe(plan.planId);
    expect(approval.intentHash).toBe(plan.intentHash);
  });

  it("blocks rejected, expired, revoked, and scope-mismatched approvals", () => {
    const plan = planFrom();
    const rejected = rejectExecutionPlan(plan, { actor: "operator", rejectedAt: now }).plan;
    expect(validateExecutionAuthorization({ nowIso: now, plan: rejected, approval: rejected.approvals[0] }).reasonCodes).toContain("plan_rejected");

    const { plan: approved, approval } = approveExecutionPlan(plan, { actor: "operator", approvedAt: now, expiresAt: "2026-05-09T00:00:01.000Z" });
    expect(validateExecutionAuthorization({ nowIso: "2026-05-09T00:00:02.000Z", plan: approved, approval }).reasonCodes).toContain("approval_expired");

    const revoked = revokeExecutionApproval(plan, approval, { actor: "operator", revokedAt: now }).plan;
    expect(validateExecutionAuthorization({ nowIso: now, plan: revoked, approval: revoked.approvals[0] }).reasonCodes).toContain("approval_revoked");

    const mismatched = { ...approval, intentHash: "intent-other" };
    expect(validateExecutionAuthorization({ nowIso: now, plan: approved, approval: mismatched }).reasonCodes).toContain("approval_scope_mismatch");
  });

  it("rejects policy drift, degraded state trigger drift, and intent drift", () => {
    const plan = planFrom(allowPolicy);
    const denySnapshot = createExecutionPolicySnapshot({
      ...plan.policySnapshot,
      policy: evaluatePolicy(denyPolicy, { request: request(), actionClass: "generic" }),
      fallbackPermitted: false,
      capturedAt: now,
      executionMode: "remote",
      governedRoutingEnabled: true,
      heterogeneousRoutingEnabled: true,
      remoteExecutionEnabled: true,
    });
    expect(validateExecutionSnapshotIntegrity({ plan, currentPolicySnapshot: denySnapshot })).toContain("policy_snapshot_mismatch");
    expect(validateExecutionAuthorization({ nowIso: now, plan, degradedStateTriggerPermitted: true }).reasonCodes).toContain("degraded_state_trigger_permission_mismatch");
    expect(validateExecutionSnapshotIntegrity({ plan, currentIntent: { ...plan.intent, command: "different" } })).toContain("execution_intent_mismatch");
  });

  it("rejects trust drift and unsafe worker trust states", () => {
    const revoked = planFrom(allowPolicy, trustedNode({ workerTrustLevel: "revoked" }));
    expect(validateExecutionAuthorization({ nowIso: now, plan: revoked }).reasonCodes).toContain("worker_trust_revoked");

    const conflicted = planFrom(allowPolicy, trustedNode({ workerTrustLevel: "untrusted", workerAttestationStatus: "conflict_detected" }));
    expect(validateExecutionAuthorization({ nowIso: now, plan: conflicted }).reasonCodes).toContain("attestation_conflict");

    const expired = planFrom(allowPolicy, trustedNode({ workerTrustLevel: "untrusted", workerAttestationStatus: "expired" }));
    expect(validateExecutionAuthorization({ nowIso: now, plan: expired }).reasonCodes).toContain("attestation_expired");
    expect(validateExecutionAuthorization({ nowIso: now, plan: expired }).reasonCodes).toContain("insufficient_trust");
  });

  it("emits deterministic execution events and aggregates them", () => {
    const { plan, approval } = approveExecutionPlan(planFrom(), { actor: "operator", approvedAt: now });
    const auth = validateExecutionAuthorization({ nowIso: now, plan, approval });
    const log = new OperationalMemoryLog();
    const events = buildExecutionPlanEvents({ plan, approval, authorization: auth, existingLog: log });
    expect(events.map((event) => event.sequence)).toEqual(events.map((_, index) => index));
    expect(events.some((event) => event.category === "execution_plan_created")).toBe(true);
    expect(events.some((event) => event.category === "execution_plan_approved")).toBe(true);
    expect(events.some((event) => event.category === "execution_authorization_granted")).toBe(true);
    expect(summarizeExecutionPlanEventCounts(events).execution_plan_created).toBe(1);
  });

  it("fails replay closed for missing plan, approval, snapshot, and authorization lineage", () => {
    const envelope = buildReplayEnvelope([
      { eventId: "e0", occurredAt: now, sequence: 0, category: "execution_authorization_denied", source: "test", provenance: {}, replayRef: { lineage: ["execution-plan"], replayVersion: "1" }, payload: { reasonCode: "" } },
      { eventId: "e1", occurredAt: now, sequence: 1, category: "receipt", source: "test", provenance: {}, replayRef: { lineage: ["execution-plan"], replayVersion: "1" }, payload: { receipt: { executionLineage: { executionPlanId: "plan-1" } } } },
    ], now);
    const reasons = validateReplayEnvelope(envelope).reasons;
    expect(reasons).toContain("missing_execution_plan_lineage");
    expect(reasons).toContain("missing_approval_lineage");
    expect(reasons).toContain("policy_snapshot_mismatch");
    expect(reasons).toContain("trust_snapshot_mismatch");
    expect(reasons).toContain("execution_intent_mismatch");
    expect(reasons).toContain("stale_authorization");
    expect(reasons).toContain("missing_governance_reason_code");
  });

  it("models expiration as an explicit non-successful approval state", () => {
    const { plan, approval } = approveExecutionPlan(planFrom(), { actor: "operator", approvedAt: now });
    const expired = expireExecutionApproval(plan, approval, { actor: "operator", expiredAt: now });
    expect(expired.approval.state).toBe("expired");
    expect(validateExecutionAuthorization({ nowIso: now, plan: expired.plan, approval: expired.approval }).granted).toBe(false);
  });

  it("keeps authorization, approval, and execution success separate", () => {
    const plan = planFrom();
    const pending = createExecutionApproval({ plan, actor: "operator", decidedAt: now });
    const denied = validateExecutionAuthorization({ nowIso: now, plan, approval: pending });
    expect(plan.status).toBe("approval_required");
    expect(pending.state).toBe("requested");
    expect(denied.granted).toBe(false);
  });
});
