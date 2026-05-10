// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";

import { deterministicSerialize } from "./serde";

export type ExecutionPlanStatus = "planned" | "queued" | "leased" | "executing" | "completed" | "failed" | "blocked" | "degraded" | "cancelled" | "expired";
export type ExecutionPlanPhase = "governance" | "planning" | "queueing" | "leasing" | "execution" | "execution_lifecycle" | "receipt" | "receipts" | "replay" | "proofpack" | "diagnostics";
export type QueueState = Exclude<ExecutionPlanStatus, "planned">;

export type ExecutionLifecycleReasonCode =
  | "ok"
  | "invalid_transition"
  | "plan_expired"
  | "plan_cancelled"
  | "missing_idempotency_key"
  | "missing_governance_metadata"
  | "missing_trust_metadata"
  | "missing_lineage"
  | "missing_invariants"
  | "unenforced_invariant"
  | "missing_degraded_reason"
  | "missing_cancellation_reason"
  | "missing_expiration_semantics"
  | "duplicate_lease_attempt"
  | "conflicting_ownership"
  | "stale_queue_ownership"
  | "queue_item_expired"
  | "orphaned_execution_state"
  | "lineage_drift"
  | "replay_drift"
  | "governance_drift"
  | "trust_drift"
  | "fallback_drift"
  | "candidate_mismatch"
  | "ownership_mismatch"
  | "lease_mismatch"
  | "receipt_mismatch"
  | "proofpack_integrity_mismatch"
  | "missing_execution_receipts"
  | "missing_queue_history"
  | "missing_lease_history"
  | "hidden_fallback_detected"
  | "hidden_retry_detected"
  | "idempotency_key_conflict"
  | "deterministic_rerun"
  | "cancellation_safe_replay_blocked";

export const EXECUTION_LIFECYCLE_EVENT_TAXONOMY = [
  "execution_plan_created",
  "execution_plan_blocked",
  "execution_plan_cancelled",
  "queue_item_queued",
  "queue_item_leased",
  "queue_item_expired",
  "queue_conflict_detected",
  "lease_acquired",
  "lease_expired",
  "lease_revoked",
  "lease_conflict_detected",
  "execution_started",
  "execution_completed",
  "execution_failed",
  "execution_cancelled",
  "execution_blocked",
  "proofpack_generated",
  "proofpack_validation_failed",
] as const;

export type ExecutionLifecycleEventType = (typeof EXECUTION_LIFECYCLE_EVENT_TAXONOMY)[number];

export type ExecutionObservationState =
  | "observed"
  | "inferred"
  | "unavailable"
  | "degraded"
  | "stale"
  | "conflicted"
  | "blocked"
  | "not_implemented";

export interface ExecutionPlanInvariant { code: string; description: string; enforced: boolean; reasonCode?: string }
export interface ExecutionPlanApproval { approvalId: string; actor: string; decidedAt: string; decision: "pending" | "approved" | "rejected" | "revoked" | "expired"; reasonCode: string; expiresAt?: string }
export interface ExecutionPlanReceiptReference { receiptId: string; receiptDigest: string; receiptType?: string; emittedAt?: string }
export interface ExecutionPlanReplayReference { replayReferenceId: string; lineage: string[]; replayDigest: string; replayVersion?: string }
export interface ExecutionPlanDegradedState { reasonCode: string; explanation: string; at: string; source?: string; severity?: "info" | "warning" | "error" | "critical" }
export type ExecutionPlanIdempotencyKey = string;

export interface ExecutionLifecycleTransition {
  from: ExecutionPlanStatus;
  to: ExecutionPlanStatus;
  phase: ExecutionPlanPhase;
  at: string;
  actor: string;
  reasonCode: string;
  receiptId?: string;
}

export interface ExecutionPlan {
  planId: string;
  idempotencyKey: ExecutionPlanIdempotencyKey;
  status: ExecutionPlanStatus;
  phase: ExecutionPlanPhase;
  governanceMetadata: Record<string, string>;
  trustMetadata: Record<string, string>;
  createdAt: string;
  expiresAt?: string;
  cancelledAt?: string;
  degradedState?: ExecutionPlanDegradedState;
  invariantSet: ExecutionPlanInvariant[];
  approvals: ExecutionPlanApproval[];
  receiptReferences: ExecutionPlanReceiptReference[];
  replayReference: ExecutionPlanReplayReference;
  updatedAt?: string;
  blockedReasonCode?: string;
  cancellationReasonCode?: string;
  authorizationMetadata?: Record<string, string>;
  fallbackMetadata?: { permitted: boolean; reasonCode?: string };
  candidateMetadata?: Record<string, string>;
  transitionHistory?: ExecutionLifecycleTransition[];
}

export interface QueueOwnership { ownerId: string; acquiredAt: string; leaseId?: string; generation?: number }
export interface QueueLease { leaseId: string; ownerId: string; acquiredAt: string; expiresAt: string; renewedAt?: string; revokedAt?: string; expiredAt?: string; renewalCount?: number }
export interface QueueReplayReference { replayReferenceId: string; lineageHash: string; replayDigest?: string; replayVersion?: string }
export interface QueueReceiptReference { receiptId: string; receiptDigest?: string; receiptType?: string }
export interface QueueDegradedState { reasonCode: string; at: string; explanation: string }

export interface QueueItem {
  queueItemId: string;
  planId: string;
  state: QueueState;
  sequence: number;
  ownership?: QueueOwnership;
  lease?: QueueLease;
  replayReference: QueueReplayReference;
  receiptReferences: QueueReceiptReference[];
  degradedState?: QueueDegradedState;
  createdAt: string;
  updatedAt?: string;
  expiresAt?: string;
  governanceMetadata?: Record<string, string>;
  trustMetadata?: Record<string, string>;
}

export type LeaseEventType = "lease_acquired" | "lease_renewed" | "lease_expired" | "lease_revoked" | "lease_conflict_detected";

export interface ExecutionLifecycleReceipt {
  receiptId: string;
  eventType: ExecutionLifecycleEventType;
  planId: string;
  occurredAt: string;
  reasonCode: string;
  digest: string;
  payload: Record<string, unknown>;
  queueItemId?: string;
  leaseId?: string;
  ownerId?: string;
  replayReferenceId?: string;
  lineageHash?: string;
}

export interface ExecutionLifecycleEvent {
  eventId: string;
  eventType: ExecutionLifecycleEventType;
  occurredAt: string;
  sequence: number;
  planId?: string;
  queueItemId?: string;
  leaseId?: string;
  ownerId?: string;
  reasonCode: string;
  payload: Record<string, unknown>;
}

export interface ExecutionLifecycleDecision<T> {
  ok: boolean;
  reasonCode: ExecutionLifecycleReasonCode;
  message: string;
  value?: T;
  receipts: ExecutionLifecycleReceipt[];
  events: ExecutionLifecycleEvent[];
  diagnostics: ExecutionDiagnosticFact[];
}

export interface ReplayValidationContext {
  currentGovernanceMetadata?: Record<string, string>;
  currentTrustMetadata?: Record<string, string>;
  candidatePlanId?: string;
  ownerId?: string;
  leaseId?: string;
  receiptReferences?: ExecutionPlanReceiptReference[];
  fallbackPermitted?: boolean;
  expectedFallbackPermitted?: boolean;
}

export interface ExecutionDiagnosticFact {
  name: string;
  state: ExecutionObservationState;
  reasonCode: string;
  explanation: string;
  source: string;
  observedAt: string;
  value?: unknown;
}

export interface ExecutionDiagnosticSnapshot {
  snapshotId: string;
  capturedAt: string;
  planId?: string;
  facts: ExecutionDiagnosticFact[];
}

export interface ExecutionProofpackReplayEnvelope {
  replayReferenceId: string;
  lineage: string[];
  digest: string;
  eventCount: number;
}

export interface ExecutionProofpackManifestArtifact {
  artifactId: string;
  kind:
    | "execution_plan"
    | "execution_receipts"
    | "replay_envelopes"
    | "telemetry_lineage"
    | "governance_lineage"
    | "trust_lineage"
    | "diagnostics_snapshots"
    | "degraded_state_artifacts"
    | "lease_history"
    | "queue_history"
    | "execution_transitions";
  digest: string;
  unavailable: boolean;
  reasonCode?: string;
}

export interface ExecutionProofpackManifest {
  version: "1";
  manifestId: string;
  generatedAt: string;
  artifactCount: number;
  digest: string;
  artifacts: ExecutionProofpackManifestArtifact[];
  lineageRoots: string[];
}

export interface ExecutionProofpack {
  version: "1";
  proofpackId: string;
  generatedAt: string;
  executionPlan: ExecutionPlan;
  executionReceipts: ExecutionLifecycleReceipt[];
  replayEnvelopes: ExecutionProofpackReplayEnvelope[];
  telemetryLineage: Record<string, unknown>;
  governanceLineage: Record<string, unknown>;
  trustLineage: Record<string, unknown>;
  diagnosticsSnapshots: ExecutionDiagnosticSnapshot[];
  degradedStateArtifacts: ExecutionPlanDegradedState[];
  leaseHistory: QueueLease[];
  queueHistory: QueueItem[];
  executionTransitions: ExecutionLifecycleTransition[];
  evidenceManifest: ExecutionProofpackManifest;
  digest: string;
}

export interface ExecutionProofpackValidation {
  ok: boolean;
  status: "passed" | "failed";
  reasons: ExecutionLifecycleReasonCode[];
  verifiedAt: string;
  digestMatch: boolean;
  manifestDigestMatch: boolean;
}

export function lineageHash(lineage: string[]): string {
  return createHash("sha256").update(deterministicSerialize([...lineage])).digest("base64url");
}

function digestValue(value: unknown): string {
  return createHash("sha256").update(deterministicSerialize(value)).digest("hex");
}

function stableId(prefix: string, value: unknown): string {
  return `${prefix}-${createHash("sha256").update(deterministicSerialize(value)).digest("base64url").slice(0, 24)}`;
}

function metadataDigest(value: Record<string, string> | undefined): string {
  return digestValue(value ?? {});
}

function isExpired(expiresAt: string | undefined, nowIso: string): boolean {
  return !!expiresAt && Date.parse(expiresAt) <= Date.parse(nowIso);
}

function hasMetadata(value: Record<string, string> | undefined): boolean {
  return !!value && Object.keys(value).length > 0;
}

function appendReference(
  references: QueueReceiptReference[],
  receipt: ExecutionLifecycleReceipt,
): QueueReceiptReference[] {
  return [...references, { receiptId: receipt.receiptId, receiptDigest: receipt.digest, receiptType: receipt.eventType }];
}

function receiptPlanReference(receipt: ExecutionLifecycleReceipt): ExecutionPlanReceiptReference {
  return { receiptId: receipt.receiptId, receiptDigest: receipt.digest, receiptType: receipt.eventType, emittedAt: receipt.occurredAt };
}

function eventTypeForState(to: ExecutionPlanStatus): ExecutionLifecycleEventType {
  if (to === "executing") return "execution_started";
  if (to === "completed") return "execution_completed";
  if (to === "failed") return "execution_failed";
  if (to === "cancelled") return "execution_cancelled";
  if (to === "blocked") return "execution_blocked";
  if (to === "expired") return "queue_item_expired";
  if (to === "leased") return "queue_item_leased";
  if (to === "queued") return "queue_item_queued";
  return "execution_blocked";
}

function makeEvent(input: {
  eventType: ExecutionLifecycleEventType;
  occurredAt: string;
  sequence?: number;
  planId?: string;
  queueItemId?: string;
  leaseId?: string;
  ownerId?: string;
  reasonCode: string;
  payload?: Record<string, unknown>;
}): ExecutionLifecycleEvent {
  const sequence = input.sequence ?? 0;
  const payload = input.payload ?? {};
  return {
    eventId: stableId("event", { ...input, payload, sequence }),
    eventType: input.eventType,
    occurredAt: input.occurredAt,
    sequence,
    planId: input.planId,
    queueItemId: input.queueItemId,
    leaseId: input.leaseId,
    ownerId: input.ownerId,
    reasonCode: input.reasonCode,
    payload,
  };
}

function makeReceipt(input: {
  eventType: ExecutionLifecycleEventType;
  plan: Pick<ExecutionPlan, "planId" | "replayReference">;
  occurredAt: string;
  reasonCode: string;
  payload?: Record<string, unknown>;
  queueItemId?: string;
  leaseId?: string;
  ownerId?: string;
}): ExecutionLifecycleReceipt {
  const payload = input.payload ?? {};
  const digest = digestValue({
    eventType: input.eventType,
    planId: input.plan.planId,
    queueItemId: input.queueItemId,
    leaseId: input.leaseId,
    ownerId: input.ownerId,
    occurredAt: input.occurredAt,
    reasonCode: input.reasonCode,
    payload,
    replayReferenceId: input.plan.replayReference.replayReferenceId,
    lineageHash: lineageHash(input.plan.replayReference.lineage),
  });
  return {
    receiptId: stableId("receipt", { eventType: input.eventType, planId: input.plan.planId, occurredAt: input.occurredAt, reasonCode: input.reasonCode, payload }),
    eventType: input.eventType,
    planId: input.plan.planId,
    occurredAt: input.occurredAt,
    reasonCode: input.reasonCode,
    digest,
    payload,
    queueItemId: input.queueItemId,
    leaseId: input.leaseId,
    ownerId: input.ownerId,
    replayReferenceId: input.plan.replayReference.replayReferenceId,
    lineageHash: lineageHash(input.plan.replayReference.lineage),
  };
}

function decision<T>(
  ok: boolean,
  reasonCode: ExecutionLifecycleReasonCode,
  message: string,
  value?: T,
  receipts: ExecutionLifecycleReceipt[] = [],
  events: ExecutionLifecycleEvent[] = [],
  diagnostics: ExecutionDiagnosticFact[] = [],
): ExecutionLifecycleDecision<T> {
  return { ok, reasonCode, message, value, receipts, events, diagnostics };
}

function diagnostic(input: {
  name: string;
  state: ExecutionObservationState;
  reasonCode: string;
  explanation: string;
  source?: string;
  observedAt: string;
  value?: unknown;
}): ExecutionDiagnosticFact {
  return {
    name: input.name,
    state: input.state,
    reasonCode: input.reasonCode,
    explanation: input.explanation,
    source: input.source ?? "execution-lifecycle",
    observedAt: input.observedAt,
    value: input.value,
  };
}

export function createExecutionPlanIdempotencyKey(input: {
  requestId: string;
  actor: string;
  action: string;
  governanceMetadata?: Record<string, string>;
  trustMetadata?: Record<string, string>;
}): ExecutionPlanIdempotencyKey {
  return stableId("idem", {
    requestId: input.requestId,
    actor: input.actor,
    action: input.action,
    governanceDigest: metadataDigest(input.governanceMetadata),
    trustDigest: metadataDigest(input.trustMetadata),
  });
}

export function createLifecycleReceipt(input: Parameters<typeof makeReceipt>[0]): ExecutionLifecycleReceipt {
  return makeReceipt(input);
}

export function createLifecycleEvent(input: Parameters<typeof makeEvent>[0]): ExecutionLifecycleEvent {
  return makeEvent(input);
}

export function validateExecutionPlan(plan: ExecutionPlan, nowIso = plan.updatedAt ?? plan.createdAt): ExecutionLifecycleReasonCode[] {
  const reasons: ExecutionLifecycleReasonCode[] = [];
  if (!plan.idempotencyKey.trim()) reasons.push("missing_idempotency_key");
  if (!hasMetadata(plan.governanceMetadata)) reasons.push("missing_governance_metadata");
  if (!hasMetadata(plan.trustMetadata)) reasons.push("missing_trust_metadata");
  if (!plan.replayReference.lineage.length) reasons.push("missing_lineage");
  if (!plan.invariantSet.length) reasons.push("missing_invariants");
  if (plan.invariantSet.some((invariant) => !invariant.enforced)) reasons.push("unenforced_invariant");
  if ((plan.status === "degraded" || plan.status === "blocked") && !plan.degradedState?.reasonCode && !plan.blockedReasonCode) reasons.push("missing_degraded_reason");
  if (plan.status === "cancelled" && (!plan.cancelledAt || !plan.cancellationReasonCode)) reasons.push("missing_cancellation_reason");
  if (plan.status === "expired" && !plan.expiresAt) reasons.push("missing_expiration_semantics");
  if (isExpired(plan.expiresAt, nowIso) && plan.status !== "expired" && plan.status !== "cancelled") reasons.push("plan_expired");
  return [...new Set(reasons)];
}

export function validateReplayConsistency(plan: ExecutionPlan, queue: QueueItem, context: ReplayValidationContext = {}): ExecutionLifecycleReasonCode[] {
  const reasons: string[] = [];
  if (!plan.replayReference.lineage.length) reasons.push("missing_lineage");
  if (!Object.keys(plan.governanceMetadata).length) reasons.push("missing_governance_metadata");
  if (!Object.keys(plan.trustMetadata).length) reasons.push("missing_trust_metadata");
  if (plan.status === "degraded" && !plan.degradedState?.reasonCode) reasons.push("missing_degraded_reason");
  if (queue.state === "degraded" && !queue.degradedState?.reasonCode) reasons.push("missing_degraded_reason");
  if (queue.planId !== plan.planId) reasons.push("candidate_mismatch");
  if (context.candidatePlanId && context.candidatePlanId !== plan.planId) reasons.push("candidate_mismatch");
  if (queue.replayReference.replayReferenceId !== plan.replayReference.replayReferenceId) reasons.push("replay_drift");
  const expected = lineageHash(plan.replayReference.lineage);
  if (expected !== queue.replayReference.lineageHash) reasons.push("lineage_drift");
  if (queue.replayReference.replayDigest && queue.replayReference.replayDigest !== plan.replayReference.replayDigest) reasons.push("replay_drift");
  if (context.currentGovernanceMetadata && metadataDigest(context.currentGovernanceMetadata) !== metadataDigest(plan.governanceMetadata)) reasons.push("governance_drift");
  if (queue.governanceMetadata && metadataDigest(queue.governanceMetadata) !== metadataDigest(plan.governanceMetadata)) reasons.push("governance_drift");
  if (context.currentTrustMetadata && metadataDigest(context.currentTrustMetadata) !== metadataDigest(plan.trustMetadata)) reasons.push("trust_drift");
  if (queue.trustMetadata && metadataDigest(queue.trustMetadata) !== metadataDigest(plan.trustMetadata)) reasons.push("trust_drift");
  const expectedFallback = context.expectedFallbackPermitted ?? (plan.fallbackMetadata ? plan.fallbackMetadata.permitted : undefined);
  if (expectedFallback !== undefined && context.fallbackPermitted !== undefined && expectedFallback !== context.fallbackPermitted) reasons.push("fallback_drift");
  if (context.ownerId && queue.ownership?.ownerId !== context.ownerId) reasons.push("ownership_mismatch");
  if (queue.lease && queue.ownership && queue.lease.ownerId !== queue.ownership.ownerId) reasons.push("ownership_mismatch");
  if (context.leaseId && queue.lease?.leaseId !== context.leaseId) reasons.push("lease_mismatch");
  const receiptReferences = context.receiptReferences ?? (plan.receiptReferences.length ? plan.receiptReferences : undefined);
  if (receiptReferences) {
    const queueReceiptIds = new Set(queue.receiptReferences.map((ref) => ref.receiptId));
    const planReceiptIds = new Set(receiptReferences.map((ref) => ref.receiptId));
    if ([...planReceiptIds].some((receiptId) => !queueReceiptIds.has(receiptId))) reasons.push("receipt_mismatch");
    if (context.receiptReferences && [...queueReceiptIds].some((receiptId) => !planReceiptIds.has(receiptId))) reasons.push("receipt_mismatch");
  }
  return [...new Set(reasons)] as ExecutionLifecycleReasonCode[];
}

export function transitionExecutionState(current: ExecutionPlanStatus, next: ExecutionPlanStatus): boolean {
  const allowed: Record<ExecutionPlanStatus, ExecutionPlanStatus[]> = {
    planned: ["queued", "cancelled", "expired", "blocked", "degraded"],
    queued: ["leased", "cancelled", "expired", "blocked", "degraded"],
    leased: ["executing", "cancelled", "expired", "degraded", "blocked"],
    executing: ["completed", "failed", "cancelled", "degraded", "blocked"],
    completed: [],
    failed: [],
    blocked: ["cancelled", "expired", "degraded"],
    degraded: ["cancelled", "expired", "blocked"],
    cancelled: [],
    expired: [],
  };
  return allowed[current].includes(next);
}

export function transitionExecutionPlan(input: {
  plan: ExecutionPlan;
  next: ExecutionPlanStatus;
  phase: ExecutionPlanPhase;
  at: string;
  actor: string;
  reasonCode: string;
  degradedState?: ExecutionPlanDegradedState;
}): ExecutionLifecycleDecision<{ plan: ExecutionPlan; transition: ExecutionLifecycleTransition }> {
  if (input.plan.status === "cancelled") return decision(false, "plan_cancelled", "execution plan is already cancelled");
  if (isExpired(input.plan.expiresAt, input.at) && input.next !== "expired" && input.next !== "cancelled") return decision(false, "plan_expired", "execution plan is expired");
  if (!transitionExecutionState(input.plan.status, input.next)) return decision(false, "invalid_transition", `invalid transition from ${input.plan.status} to ${input.next}`);

  const eventType = eventTypeForState(input.next);
  const receipt = makeReceipt({
    eventType,
    plan: input.plan,
    occurredAt: input.at,
    reasonCode: input.reasonCode,
    payload: { from: input.plan.status, to: input.next, phase: input.phase },
  });
  const transition: ExecutionLifecycleTransition = {
    from: input.plan.status,
    to: input.next,
    phase: input.phase,
    at: input.at,
    actor: input.actor,
    reasonCode: input.reasonCode,
    receiptId: receipt.receiptId,
  };
  const nextPlan: ExecutionPlan = {
    ...input.plan,
    status: input.next,
    phase: input.phase,
    updatedAt: input.at,
    cancelledAt: input.next === "cancelled" ? input.at : input.plan.cancelledAt,
    cancellationReasonCode: input.next === "cancelled" ? input.reasonCode : input.plan.cancellationReasonCode,
    blockedReasonCode: input.next === "blocked" ? input.reasonCode : input.plan.blockedReasonCode,
    degradedState: input.degradedState ?? input.plan.degradedState,
    receiptReferences: [...input.plan.receiptReferences, receiptPlanReference(receipt)],
    transitionHistory: [...(input.plan.transitionHistory ?? []), transition],
  };
  const event = makeEvent({
    eventType,
    occurredAt: input.at,
    planId: input.plan.planId,
    reasonCode: input.reasonCode,
    payload: { from: input.plan.status, to: input.next, phase: input.phase },
  });
  return decision(true, "ok", `transitioned to ${input.next}`, { plan: nextPlan, transition }, [receipt], [event]);
}

export function createQueueItemFromPlan(input: {
  plan: ExecutionPlan;
  queueItemId: string;
  sequence: number;
  createdAt: string;
  expiresAt?: string;
}): ExecutionLifecycleDecision<{ queueItem: QueueItem; receipt: ExecutionLifecycleReceipt }> {
  const planReasons = validateExecutionPlan(input.plan, input.createdAt);
  if (planReasons.length) return decision(false, planReasons[0] ?? "missing_governance_metadata", `execution plan is not queueable: ${planReasons.join(",")}`);
  if (["completed", "failed", "cancelled", "expired"].includes(input.plan.status)) return decision(false, "invalid_transition", `terminal plan ${input.plan.status} cannot be queued`);
  const receipt = makeReceipt({
    eventType: "queue_item_queued",
    plan: input.plan,
    occurredAt: input.createdAt,
    reasonCode: "queue_item_queued",
    queueItemId: input.queueItemId,
    payload: { sequence: input.sequence },
  });
  const queueItem: QueueItem = {
    queueItemId: input.queueItemId,
    planId: input.plan.planId,
    state: "queued",
    sequence: input.sequence,
    replayReference: {
      replayReferenceId: input.plan.replayReference.replayReferenceId,
      lineageHash: lineageHash(input.plan.replayReference.lineage),
      replayDigest: input.plan.replayReference.replayDigest,
      replayVersion: input.plan.replayReference.replayVersion,
    },
    receiptReferences: appendReference([], receipt),
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
    expiresAt: input.expiresAt,
    governanceMetadata: input.plan.governanceMetadata,
    trustMetadata: input.plan.trustMetadata,
  };
  const event = makeEvent({ eventType: "queue_item_queued", occurredAt: input.createdAt, planId: input.plan.planId, queueItemId: input.queueItemId, reasonCode: "queue_item_queued", payload: { sequence: input.sequence } });
  return decision(true, "ok", "queue item created", { queueItem, receipt }, [receipt], [event]);
}

export function detectLeaseConflict(existing: QueueLease | undefined, ownerId: string, nowIso: string): "none" | "split_brain" | "stale_owner" | "duplicate_lease_attempt" {
  if (!existing) return "none";
  if (existing.revokedAt) return "none";
  if (existing.expiredAt) return "none";
  if (existing.ownerId !== ownerId && existing.expiresAt > nowIso) return "split_brain";
  if (existing.ownerId === ownerId && existing.expiresAt <= nowIso) return "stale_owner";
  if (existing.ownerId === ownerId && existing.expiresAt > nowIso) return "duplicate_lease_attempt";
  return "none";
}

function leaseConflictReason(conflict: ReturnType<typeof detectLeaseConflict>): ExecutionLifecycleReasonCode {
  if (conflict === "split_brain") return "conflicting_ownership";
  if (conflict === "stale_owner") return "stale_queue_ownership";
  if (conflict === "duplicate_lease_attempt") return "duplicate_lease_attempt";
  return "ok";
}

export function acquireQueueLease(input: {
  plan: ExecutionPlan;
  queueItem: QueueItem;
  ownerId: string;
  leaseId: string;
  acquiredAt: string;
  expiresAt: string;
}): ExecutionLifecycleDecision<{ queueItem: QueueItem; lease: QueueLease; receipt: ExecutionLifecycleReceipt }> {
  if (isExpired(input.queueItem.expiresAt, input.acquiredAt)) return decision(false, "queue_item_expired", "queue item is expired");
  const conflict = detectLeaseConflict(input.queueItem.lease, input.ownerId, input.acquiredAt);
  if (conflict !== "none") {
    const reason = leaseConflictReason(conflict);
    const event = makeEvent({
      eventType: conflict === "split_brain" ? "lease_conflict_detected" : "queue_conflict_detected",
      occurredAt: input.acquiredAt,
      planId: input.plan.planId,
      queueItemId: input.queueItem.queueItemId,
      leaseId: input.queueItem.lease?.leaseId,
      ownerId: input.ownerId,
      reasonCode: reason,
      payload: { conflict, existingOwnerId: input.queueItem.lease?.ownerId },
    });
    return decision(false, reason, `lease acquisition rejected: ${conflict}`, undefined, [], [event], [
      diagnostic({ name: "lease_conflict", state: "conflicted", reasonCode: reason, explanation: conflict, observedAt: input.acquiredAt }),
    ]);
  }
  if (input.queueItem.state !== "queued") return decision(false, "invalid_transition", `queue item must be queued, got ${input.queueItem.state}`);
  const replayReasons = validateReplayConsistency(input.plan, input.queueItem);
  if (replayReasons.length) return decision(false, replayReasons[0] ?? "replay_drift", `replay validation failed: ${replayReasons.join(",")}`);
  const lease: QueueLease = { leaseId: input.leaseId, ownerId: input.ownerId, acquiredAt: input.acquiredAt, expiresAt: input.expiresAt, renewalCount: 0 };
  const receipt = makeReceipt({
    eventType: "lease_acquired",
    plan: input.plan,
    occurredAt: input.acquiredAt,
    reasonCode: "lease_acquired",
    queueItemId: input.queueItem.queueItemId,
    leaseId: input.leaseId,
    ownerId: input.ownerId,
    payload: { expiresAt: input.expiresAt },
  });
  const queueItem: QueueItem = {
    ...input.queueItem,
    state: "leased",
    ownership: { ownerId: input.ownerId, acquiredAt: input.acquiredAt, leaseId: input.leaseId, generation: (input.queueItem.ownership?.generation ?? 0) + 1 },
    lease,
    updatedAt: input.acquiredAt,
    receiptReferences: appendReference(input.queueItem.receiptReferences, receipt),
  };
  const events = [
    makeEvent({ eventType: "lease_acquired", occurredAt: input.acquiredAt, planId: input.plan.planId, queueItemId: input.queueItem.queueItemId, leaseId: input.leaseId, ownerId: input.ownerId, reasonCode: "lease_acquired", payload: { expiresAt: input.expiresAt } }),
    makeEvent({ eventType: "queue_item_leased", occurredAt: input.acquiredAt, planId: input.plan.planId, queueItemId: input.queueItem.queueItemId, leaseId: input.leaseId, ownerId: input.ownerId, reasonCode: "queue_item_leased" }),
  ];
  return decision(true, "ok", "lease acquired", { queueItem, lease, receipt }, [receipt], events);
}

export function renewQueueLease(input: {
  plan: ExecutionPlan;
  queueItem: QueueItem;
  ownerId: string;
  renewedAt: string;
  expiresAt: string;
}): ExecutionLifecycleDecision<{ queueItem: QueueItem; lease: QueueLease; receipt: ExecutionLifecycleReceipt }> {
  const lease = input.queueItem.lease;
  if (!lease) return decision(false, "lease_mismatch", "queue item has no lease");
  if (lease.ownerId !== input.ownerId) return decision(false, "ownership_mismatch", "lease owner mismatch");
  if (lease.revokedAt) return decision(false, "lease_mismatch", "lease has been revoked");
  if (isExpired(lease.expiresAt, input.renewedAt)) return decision(false, "stale_queue_ownership", "lease is stale");
  if (Date.parse(input.expiresAt) <= Date.parse(input.renewedAt)) return decision(false, "invalid_transition", "renewed lease expiry must be in the future");
  const renewed: QueueLease = { ...lease, renewedAt: input.renewedAt, expiresAt: input.expiresAt, renewalCount: (lease.renewalCount ?? 0) + 1 };
  const receipt = makeReceipt({ eventType: "lease_acquired", plan: input.plan, occurredAt: input.renewedAt, reasonCode: "lease_renewed", queueItemId: input.queueItem.queueItemId, leaseId: lease.leaseId, ownerId: input.ownerId, payload: { expiresAt: input.expiresAt, renewalCount: renewed.renewalCount } });
  const queueItem = { ...input.queueItem, lease: renewed, updatedAt: input.renewedAt, receiptReferences: appendReference(input.queueItem.receiptReferences, receipt) };
  const event = makeEvent({ eventType: "lease_acquired", occurredAt: input.renewedAt, planId: input.plan.planId, queueItemId: input.queueItem.queueItemId, leaseId: lease.leaseId, ownerId: input.ownerId, reasonCode: "lease_renewed", payload: { expiresAt: input.expiresAt, renewalCount: renewed.renewalCount } });
  return decision(true, "ok", "lease renewed", { queueItem, lease: renewed, receipt }, [receipt], [event]);
}

export function expireQueueLease(input: {
  plan: ExecutionPlan;
  queueItem: QueueItem;
  expiredAt: string;
  reasonCode?: string;
}): ExecutionLifecycleDecision<{ queueItem: QueueItem; receipt: ExecutionLifecycleReceipt }> {
  if (!input.queueItem.lease) return decision(false, "lease_mismatch", "queue item has no lease");
  const reasonCode = input.reasonCode ?? "lease_expired";
  const lease = { ...input.queueItem.lease, expiredAt: input.expiredAt };
  const receipt = makeReceipt({ eventType: "lease_expired", plan: input.plan, occurredAt: input.expiredAt, reasonCode, queueItemId: input.queueItem.queueItemId, leaseId: lease.leaseId, ownerId: lease.ownerId, payload: { expiresAt: lease.expiresAt } });
  const queueItem: QueueItem = {
    ...input.queueItem,
    state: "expired",
    lease,
    updatedAt: input.expiredAt,
    degradedState: { reasonCode, at: input.expiredAt, explanation: "lease expired explicitly" },
    receiptReferences: appendReference(input.queueItem.receiptReferences, receipt),
  };
  const events = [
    makeEvent({ eventType: "lease_expired", occurredAt: input.expiredAt, planId: input.plan.planId, queueItemId: input.queueItem.queueItemId, leaseId: lease.leaseId, ownerId: lease.ownerId, reasonCode }),
    makeEvent({ eventType: "queue_item_expired", occurredAt: input.expiredAt, planId: input.plan.planId, queueItemId: input.queueItem.queueItemId, leaseId: lease.leaseId, ownerId: lease.ownerId, reasonCode: "queue_item_expired" }),
  ];
  return decision(true, "ok", "lease expired", { queueItem, receipt }, [receipt], events);
}

export function revokeQueueLease(input: {
  plan: ExecutionPlan;
  queueItem: QueueItem;
  ownerId?: string;
  revokedAt: string;
  reasonCode: string;
}): ExecutionLifecycleDecision<{ queueItem: QueueItem; receipt: ExecutionLifecycleReceipt }> {
  if (!input.queueItem.lease) return decision(false, "lease_mismatch", "queue item has no lease");
  if (input.ownerId && input.queueItem.lease.ownerId !== input.ownerId) return decision(false, "ownership_mismatch", "lease owner mismatch");
  const lease = { ...input.queueItem.lease, revokedAt: input.revokedAt };
  const receipt = makeReceipt({ eventType: "lease_revoked", plan: input.plan, occurredAt: input.revokedAt, reasonCode: input.reasonCode, queueItemId: input.queueItem.queueItemId, leaseId: lease.leaseId, ownerId: lease.ownerId });
  const queueItem: QueueItem = {
    ...input.queueItem,
    state: "blocked",
    lease,
    updatedAt: input.revokedAt,
    degradedState: { reasonCode: input.reasonCode, at: input.revokedAt, explanation: "lease revoked explicitly" },
    receiptReferences: appendReference(input.queueItem.receiptReferences, receipt),
  };
  const event = makeEvent({ eventType: "lease_revoked", occurredAt: input.revokedAt, planId: input.plan.planId, queueItemId: input.queueItem.queueItemId, leaseId: lease.leaseId, ownerId: lease.ownerId, reasonCode: input.reasonCode });
  return decision(true, "ok", "lease revoked", { queueItem, receipt }, [receipt], [event]);
}

function requireActiveLease(queueItem: QueueItem, ownerId: string, nowIso: string): ExecutionLifecycleReasonCode | "ok" {
  if (!queueItem.lease) return "lease_mismatch";
  if (queueItem.lease.ownerId !== ownerId || queueItem.ownership?.ownerId !== ownerId) return "ownership_mismatch";
  if (queueItem.lease.revokedAt) return "lease_mismatch";
  if (isExpired(queueItem.lease.expiresAt, nowIso)) return "stale_queue_ownership";
  return "ok";
}

export function startExecution(input: {
  plan: ExecutionPlan;
  queueItem: QueueItem;
  ownerId: string;
  startedAt: string;
}): ExecutionLifecycleDecision<{ queueItem: QueueItem; receipt: ExecutionLifecycleReceipt }> {
  if (input.queueItem.state !== "leased") return decision(false, "invalid_transition", `execution can start only from leased state, got ${input.queueItem.state}`);
  const leaseCheck = requireActiveLease(input.queueItem, input.ownerId, input.startedAt);
  if (leaseCheck !== "ok") return decision(false, leaseCheck, "active lease validation failed");
  const receipt = makeReceipt({ eventType: "execution_started", plan: input.plan, occurredAt: input.startedAt, reasonCode: "execution_started", queueItemId: input.queueItem.queueItemId, leaseId: input.queueItem.lease?.leaseId, ownerId: input.ownerId });
  const queueItem = { ...input.queueItem, state: "executing" as const, updatedAt: input.startedAt, receiptReferences: appendReference(input.queueItem.receiptReferences, receipt) };
  const event = makeEvent({ eventType: "execution_started", occurredAt: input.startedAt, planId: input.plan.planId, queueItemId: input.queueItem.queueItemId, leaseId: input.queueItem.lease?.leaseId, ownerId: input.ownerId, reasonCode: "execution_started" });
  return decision(true, "ok", "execution started", { queueItem, receipt }, [receipt], [event]);
}

function finishExecution(input: {
  plan: ExecutionPlan;
  queueItem: QueueItem;
  ownerId: string;
  finishedAt: string;
  state: "completed" | "failed" | "cancelled" | "blocked";
  reasonCode: string;
  explanation?: string;
}): ExecutionLifecycleDecision<{ queueItem: QueueItem; receipt: ExecutionLifecycleReceipt }> {
  if (input.queueItem.state !== "executing") return decision(false, "invalid_transition", `execution can finish only from executing state, got ${input.queueItem.state}`);
  const leaseCheck = requireActiveLease(input.queueItem, input.ownerId, input.finishedAt);
  if (leaseCheck !== "ok") return decision(false, leaseCheck, "active lease validation failed");
  const eventType = eventTypeForState(input.state);
  const receipt = makeReceipt({ eventType, plan: input.plan, occurredAt: input.finishedAt, reasonCode: input.reasonCode, queueItemId: input.queueItem.queueItemId, leaseId: input.queueItem.lease?.leaseId, ownerId: input.ownerId, payload: { state: input.state, explanation: input.explanation } });
  const queueItem = {
    ...input.queueItem,
    state: input.state,
    updatedAt: input.finishedAt,
    degradedState: input.state === "blocked" || input.state === "failed" ? { reasonCode: input.reasonCode, at: input.finishedAt, explanation: input.explanation ?? input.reasonCode } : input.queueItem.degradedState,
    receiptReferences: appendReference(input.queueItem.receiptReferences, receipt),
  };
  const event = makeEvent({ eventType, occurredAt: input.finishedAt, planId: input.plan.planId, queueItemId: input.queueItem.queueItemId, leaseId: input.queueItem.lease?.leaseId, ownerId: input.ownerId, reasonCode: input.reasonCode, payload: { state: input.state, explanation: input.explanation } });
  return decision(true, "ok", `execution ${input.state}`, { queueItem, receipt }, [receipt], [event]);
}

export function completeExecution(input: Omit<Parameters<typeof finishExecution>[0], "state" | "reasonCode"> & { reasonCode?: string }): ExecutionLifecycleDecision<{ queueItem: QueueItem; receipt: ExecutionLifecycleReceipt }> {
  return finishExecution({ ...input, state: "completed", reasonCode: input.reasonCode ?? "execution_completed" });
}

export function failExecution(input: Omit<Parameters<typeof finishExecution>[0], "state">): ExecutionLifecycleDecision<{ queueItem: QueueItem; receipt: ExecutionLifecycleReceipt }> {
  return finishExecution({ ...input, state: "failed" });
}

export function cancelExecution(input: Omit<Parameters<typeof finishExecution>[0], "state">): ExecutionLifecycleDecision<{ queueItem: QueueItem; receipt: ExecutionLifecycleReceipt }> {
  return finishExecution({ ...input, state: "cancelled" });
}

export function blockExecution(input: Omit<Parameters<typeof finishExecution>[0], "state">): ExecutionLifecycleDecision<{ queueItem: QueueItem; receipt: ExecutionLifecycleReceipt }> {
  return finishExecution({ ...input, state: "blocked" });
}

export function detectIdempotencyConflict(existing: ExecutionPlan | undefined, candidate: ExecutionPlan): ExecutionLifecycleReasonCode {
  if (!existing) return "ok";
  if (existing.idempotencyKey !== candidate.idempotencyKey) return "ok";
  const existingDigest = digestValue({ ...existing, updatedAt: undefined, transitionHistory: undefined, receiptReferences: [] });
  const candidateDigest = digestValue({ ...candidate, updatedAt: undefined, transitionHistory: undefined, receiptReferences: [] });
  if (existing.status === "cancelled") return "cancellation_safe_replay_blocked";
  if (existingDigest === candidateDigest) return "deterministic_rerun";
  return "idempotency_key_conflict";
}

export function buildExecutionDiagnostics(input: {
  capturedAt: string;
  plan?: ExecutionPlan;
  queueItem?: QueueItem;
  proofpack?: ExecutionProofpack;
}): ExecutionDiagnosticSnapshot {
  const facts: ExecutionDiagnosticFact[] = [];
  const plan = input.plan;
  const queue = input.queueItem;
  facts.push(diagnostic({
    name: "execution_lifecycle",
    state: plan ? "observed" : "unavailable",
    reasonCode: plan ? plan.status : "execution_plan_unavailable",
    explanation: plan ? `execution status ${plan.status}` : "execution plan unavailable",
    observedAt: input.capturedAt,
    value: plan?.status,
  }));
  facts.push(diagnostic({
    name: "queue_state",
    state: queue ? (queue.state === "blocked" ? "blocked" : queue.state === "degraded" ? "degraded" : "observed") : "unavailable",
    reasonCode: queue ? queue.state : "queue_state_unavailable",
    explanation: queue ? `queue state ${queue.state}` : "queue item unavailable",
    observedAt: input.capturedAt,
    value: queue?.state,
  }));
  const lease = queue?.lease;
  facts.push(diagnostic({
    name: "lease_state",
    state: lease ? (lease.revokedAt ? "blocked" : isExpired(lease.expiresAt, input.capturedAt) ? "stale" : "observed") : "unavailable",
    reasonCode: lease ? (lease.revokedAt ? "lease_revoked" : isExpired(lease.expiresAt, input.capturedAt) ? "lease_expired" : "lease_observed") : "lease_unavailable",
    explanation: lease ? "lease state observed from queue item" : "lease unavailable",
    observedAt: input.capturedAt,
    value: lease,
  }));
  facts.push(diagnostic({
    name: "ownership",
    state: queue?.ownership && lease && queue.ownership.ownerId !== lease.ownerId ? "conflicted" : queue?.ownership ? "observed" : "unavailable",
    reasonCode: queue?.ownership && lease && queue.ownership.ownerId !== lease.ownerId ? "ownership_mismatch" : queue?.ownership ? "ownership_observed" : "ownership_unavailable",
    explanation: queue?.ownership ? "ownership state observed" : "ownership unavailable",
    observedAt: input.capturedAt,
    value: queue?.ownership,
  }));
  const replayReasons = plan && queue ? validateReplayConsistency(plan, queue) : ["missing_lineage"];
  facts.push(diagnostic({
    name: "replay_integrity",
    state: replayReasons.length === 0 ? "observed" : "conflicted",
    reasonCode: replayReasons[0] ?? "replay_integrity_observed",
    explanation: replayReasons.length === 0 ? "replay lineage consistent" : replayReasons.join(","),
    observedAt: input.capturedAt,
  }));
  const proofpackValidation = input.proofpack ? validateExecutionProofpack(input.proofpack, input.capturedAt) : undefined;
  facts.push(diagnostic({
    name: "proofpack_integrity",
    state: proofpackValidation ? (proofpackValidation.ok ? "observed" : "degraded") : "unavailable",
    reasonCode: proofpackValidation ? (proofpackValidation.reasons[0] ?? "proofpack_valid") : "proofpack_unavailable",
    explanation: proofpackValidation ? proofpackValidation.reasons.join(",") || "proofpack valid" : "proofpack unavailable",
    observedAt: input.capturedAt,
  }));
  facts.push(diagnostic({
    name: "degraded_state_propagation",
    state: plan?.degradedState || queue?.degradedState ? "degraded" : "observed",
    reasonCode: plan?.degradedState?.reasonCode ?? queue?.degradedState?.reasonCode ?? "none",
    explanation: plan?.degradedState?.explanation ?? queue?.degradedState?.explanation ?? "no degraded state observed",
    observedAt: input.capturedAt,
  }));
  facts.push(diagnostic({
    name: "governance_lineage",
    state: hasMetadata(plan?.governanceMetadata) ? "observed" : "unavailable",
    reasonCode: hasMetadata(plan?.governanceMetadata) ? "governance_metadata_observed" : "missing_governance_metadata",
    explanation: hasMetadata(plan?.governanceMetadata) ? "governance metadata present" : "governance metadata unavailable",
    observedAt: input.capturedAt,
  }));
  facts.push(diagnostic({
    name: "trust_lineage",
    state: hasMetadata(plan?.trustMetadata) ? "observed" : "unavailable",
    reasonCode: hasMetadata(plan?.trustMetadata) ? "trust_metadata_observed" : "missing_trust_metadata",
    explanation: hasMetadata(plan?.trustMetadata) ? "trust metadata present" : "trust metadata unavailable",
    observedAt: input.capturedAt,
  }));
  facts.push(diagnostic({
    name: "attestation_state",
    state: plan?.trustMetadata.attestationState || plan?.trustMetadata.workerAttestationStatus ? "observed" : "unavailable",
    reasonCode: plan?.trustMetadata.attestationState ?? plan?.trustMetadata.workerAttestationStatus ?? "attestation_unavailable",
    explanation: plan?.trustMetadata.attestationState || plan?.trustMetadata.workerAttestationStatus ? "attestation metadata observed" : "attestation state unavailable",
    observedAt: input.capturedAt,
  }));
  return {
    snapshotId: stableId("diag", { capturedAt: input.capturedAt, planId: plan?.planId, facts }),
    capturedAt: input.capturedAt,
    planId: plan?.planId,
    facts,
  };
}

function manifestArtifact(kind: ExecutionProofpackManifestArtifact["kind"], payload: unknown, reasonCode?: string): ExecutionProofpackManifestArtifact {
  const unavailable = payload === undefined || (Array.isArray(payload) && payload.length === 0);
  return {
    artifactId: stableId("artifact", { kind, payload }),
    kind,
    digest: digestValue(payload ?? null),
    unavailable,
    reasonCode: unavailable ? (reasonCode ?? "unavailable") : undefined,
  };
}

function buildProofpackManifest(input: {
  generatedAt: string;
  executionPlan: ExecutionPlan;
  executionReceipts: ExecutionLifecycleReceipt[];
  replayEnvelopes: ExecutionProofpackReplayEnvelope[];
  telemetryLineage: Record<string, unknown>;
  governanceLineage: Record<string, unknown>;
  trustLineage: Record<string, unknown>;
  diagnosticsSnapshots: ExecutionDiagnosticSnapshot[];
  degradedStateArtifacts: ExecutionPlanDegradedState[];
  leaseHistory: QueueLease[];
  queueHistory: QueueItem[];
  executionTransitions: ExecutionLifecycleTransition[];
}): ExecutionProofpackManifest {
  const artifacts = [
    manifestArtifact("execution_plan", input.executionPlan),
    manifestArtifact("execution_receipts", input.executionReceipts, "missing_execution_receipts"),
    manifestArtifact("replay_envelopes", input.replayEnvelopes, "missing_lineage"),
    manifestArtifact("telemetry_lineage", input.telemetryLineage),
    manifestArtifact("governance_lineage", input.governanceLineage, "missing_governance_metadata"),
    manifestArtifact("trust_lineage", input.trustLineage, "missing_trust_metadata"),
    manifestArtifact("diagnostics_snapshots", input.diagnosticsSnapshots),
    manifestArtifact("degraded_state_artifacts", input.degradedStateArtifacts),
    manifestArtifact("lease_history", input.leaseHistory, "missing_lease_history"),
    manifestArtifact("queue_history", input.queueHistory, "missing_queue_history"),
    manifestArtifact("execution_transitions", input.executionTransitions),
  ].sort((a, b) => a.kind.localeCompare(b.kind));
  const base = {
    version: "1" as const,
    generatedAt: input.generatedAt,
    artifactCount: artifacts.length,
    artifacts,
    lineageRoots: [...new Set([input.executionPlan.planId, ...input.executionPlan.replayReference.lineage])].sort(),
  };
  return {
    ...base,
    manifestId: stableId("manifest", base),
    digest: digestValue(base),
  };
}

export function buildExecutionProofpack(input: {
  generatedAt: string;
  executionPlan: ExecutionPlan;
  executionReceipts: ExecutionLifecycleReceipt[];
  queueHistory: QueueItem[];
  leaseHistory?: QueueLease[];
  replayEnvelopes?: ExecutionProofpackReplayEnvelope[];
  telemetryLineage?: Record<string, unknown>;
  governanceLineage?: Record<string, unknown>;
  trustLineage?: Record<string, unknown>;
  diagnosticsSnapshots?: ExecutionDiagnosticSnapshot[];
  degradedStateArtifacts?: ExecutionPlanDegradedState[];
}): ExecutionProofpack {
  const leaseHistory = input.leaseHistory ?? input.queueHistory.flatMap((item) => (item.lease ? [item.lease] : []));
  const replayEnvelopes = input.replayEnvelopes ?? [{
    replayReferenceId: input.executionPlan.replayReference.replayReferenceId,
    lineage: input.executionPlan.replayReference.lineage,
    digest: input.executionPlan.replayReference.replayDigest,
    eventCount: input.executionReceipts.length,
  }];
  const diagnosticsSnapshots = input.diagnosticsSnapshots ?? [buildExecutionDiagnostics({ capturedAt: input.generatedAt, plan: input.executionPlan, queueItem: input.queueHistory.at(-1) })];
  const degradedStateArtifacts = input.degradedStateArtifacts ?? [
    ...(input.executionPlan.degradedState ? [input.executionPlan.degradedState] : []),
    ...input.queueHistory.flatMap((item) => (item.degradedState ? [{ reasonCode: item.degradedState.reasonCode, explanation: item.degradedState.explanation, at: item.degradedState.at, source: "queue" }] : [])),
  ];
  const telemetryLineage = input.telemetryLineage ?? { state: "unavailable", reasonCode: "telemetry_unavailable" };
  const governanceLineage = input.governanceLineage ?? input.executionPlan.governanceMetadata;
  const trustLineage = input.trustLineage ?? input.executionPlan.trustMetadata;
  const executionTransitions = input.executionPlan.transitionHistory ?? [];
  const evidenceManifest = buildProofpackManifest({
    generatedAt: input.generatedAt,
    executionPlan: input.executionPlan,
    executionReceipts: input.executionReceipts,
    replayEnvelopes,
    telemetryLineage,
    governanceLineage,
    trustLineage,
    diagnosticsSnapshots,
    degradedStateArtifacts,
    leaseHistory,
    queueHistory: input.queueHistory,
    executionTransitions,
  });
  const base = {
    version: "1" as const,
    generatedAt: input.generatedAt,
    executionPlan: input.executionPlan,
    executionReceipts: input.executionReceipts,
    replayEnvelopes,
    telemetryLineage,
    governanceLineage,
    trustLineage,
    diagnosticsSnapshots,
    degradedStateArtifacts,
    leaseHistory,
    queueHistory: input.queueHistory,
    executionTransitions,
    evidenceManifest,
  };
  return {
    ...base,
    proofpackId: stableId("proofpack", { planId: input.executionPlan.planId, generatedAt: input.generatedAt, manifestDigest: evidenceManifest.digest }),
    digest: digestValue(base),
  };
}

function detectForbiddenAutomation(receipts: ExecutionLifecycleReceipt[]): ExecutionLifecycleReasonCode[] {
  const reasons: ExecutionLifecycleReasonCode[] = [];
  for (const receipt of receipts) {
    const fallback = receipt.payload["fallback"] as { reason?: string; hidden?: boolean } | undefined;
    const retry = receipt.payload["retry"] as { automatic?: boolean; hidden?: boolean } | undefined;
    if (fallback && (fallback.hidden || !String(fallback.reason ?? "").trim())) reasons.push("hidden_fallback_detected");
    if (retry && (retry.automatic || retry.hidden)) reasons.push("hidden_retry_detected");
  }
  return reasons;
}

export function validateExecutionProofpack(proofpack: ExecutionProofpack, verifiedAt: string): ExecutionProofpackValidation {
  const reasons = new Set<ExecutionLifecycleReasonCode>();
  for (const reason of validateExecutionPlan(proofpack.executionPlan, verifiedAt)) reasons.add(reason);
  if (proofpack.executionReceipts.length === 0) reasons.add("missing_execution_receipts");
  if (proofpack.queueHistory.length === 0) reasons.add("missing_queue_history");
  if (proofpack.leaseHistory.length === 0) reasons.add("missing_lease_history");
  if (!proofpack.replayEnvelopes.some((envelope) => envelope.replayReferenceId === proofpack.executionPlan.replayReference.replayReferenceId)) reasons.add("replay_drift");
  for (const queue of proofpack.queueHistory) {
    for (const reason of validateReplayConsistency(proofpack.executionPlan, queue)) reasons.add(reason);
  }
  for (const receipt of proofpack.executionReceipts) {
    if (receipt.planId !== proofpack.executionPlan.planId) reasons.add("receipt_mismatch");
    if (receipt.replayReferenceId && receipt.replayReferenceId !== proofpack.executionPlan.replayReference.replayReferenceId) reasons.add("replay_drift");
    if (receipt.lineageHash && receipt.lineageHash !== lineageHash(proofpack.executionPlan.replayReference.lineage)) reasons.add("lineage_drift");
  }
  for (const artifact of proofpack.degradedStateArtifacts) {
    if (!artifact.reasonCode.trim()) reasons.add("missing_degraded_reason");
  }
  for (const reason of detectForbiddenAutomation(proofpack.executionReceipts)) reasons.add(reason);
  const rebuilt = buildExecutionProofpack({
    generatedAt: proofpack.generatedAt,
    executionPlan: proofpack.executionPlan,
    executionReceipts: proofpack.executionReceipts,
    replayEnvelopes: proofpack.replayEnvelopes,
    telemetryLineage: proofpack.telemetryLineage,
    governanceLineage: proofpack.governanceLineage,
    trustLineage: proofpack.trustLineage,
    diagnosticsSnapshots: proofpack.diagnosticsSnapshots,
    degradedStateArtifacts: proofpack.degradedStateArtifacts,
    leaseHistory: proofpack.leaseHistory,
    queueHistory: proofpack.queueHistory,
  });
  const manifestDigestMatch = rebuilt.evidenceManifest.digest === proofpack.evidenceManifest.digest;
  const digestMatch = rebuilt.digest === proofpack.digest;
  if (!manifestDigestMatch || !digestMatch) reasons.add("proofpack_integrity_mismatch");
  const reasonList = [...reasons].sort();
  return {
    ok: reasonList.length === 0,
    status: reasonList.length === 0 ? "passed" : "failed",
    reasons: reasonList,
    verifiedAt,
    digestMatch,
    manifestDigestMatch,
  };
}
