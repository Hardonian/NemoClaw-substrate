// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { OperationalMemoryLog } from "./operational-memory";
import { summarizeExecutionLifecycleEventCounts, summarizeExecutionLifecycleTruth } from "./observability";
import {
  EXECUTION_LIFECYCLE_EVENT_TAXONOMY,
  acquireQueueLease,
  blockExecution,
  buildExecutionDiagnostics,
  buildExecutionProofpack,
  cancelExecution,
  completeExecution,
  createExecutionPlanIdempotencyKey,
  createLifecycleReceipt,
  createQueueItemFromPlan,
  detectIdempotencyConflict,
  detectLeaseConflict,
  expireQueueLease,
  failExecution,
  lineageHash,
  renewQueueLease,
  revokeQueueLease,
  startExecution,
  transitionExecutionPlan,
  transitionExecutionState,
  validateExecutionPlan,
  validateExecutionProofpack,
  validateReplayConsistency,
  type ExecutionLifecycleReceipt,
  type ExecutionPlan,
  type QueueItem,
} from "./execution-lifecycle";

const now = "2026-05-10T00:00:00.000Z";
const later = "2026-05-10T00:05:00.000Z";

function plan(overrides: Partial<ExecutionPlan> = {}): ExecutionPlan {
  const governanceMetadata = {
    policyVersion: "policy-v1",
    fallbackPermitted: "false",
    approvalMode: "operator",
  };
  const trustMetadata = {
    trustLevel: "trusted_local",
    attestationState: "operator_approved",
  };
  return {
    planId: "plan-1",
    idempotencyKey: createExecutionPlanIdempotencyKey({
      requestId: "request-1",
      actor: "operator",
      action: "sandbox:diagnose",
      governanceMetadata,
      trustMetadata,
    }),
    status: "planned",
    phase: "planning",
    governanceMetadata,
    trustMetadata,
    createdAt: now,
    expiresAt: "2026-05-10T01:00:00.000Z",
    invariantSet: [
      { code: "deterministic", description: "plan identity is deterministic", enforced: true },
      { code: "no-hidden-retry", description: "execution retries require explicit operator action", enforced: true },
    ],
    approvals: [{ approvalId: "approval-1", actor: "operator", decidedAt: now, decision: "approved", reasonCode: "operator_approved" }],
    receiptReferences: [],
    replayReference: { replayReferenceId: "replay-1", lineage: ["plan-1", "governance", "queue"], replayDigest: "replay-digest", replayVersion: "1" },
    fallbackMetadata: { permitted: false, reasonCode: "fallback_not_permitted" },
    transitionHistory: [],
    ...overrides,
  };
}

function queuedPlanAndItem(): { plan: ExecutionPlan; queueItem: QueueItem; receipts: ExecutionLifecycleReceipt[] } {
  const basePlan = plan({ status: "planned" });
  const queued = transitionExecutionPlan({ plan: basePlan, next: "queued", phase: "queueing", at: now, actor: "operator", reasonCode: "queue_requested" });
  if (!queued.value) throw new Error("missing queued plan");
  const queuedPlan = queued.value.plan;
  const enqueued = createQueueItemFromPlan({ plan: queuedPlan, queueItemId: "queue-1", sequence: 1, createdAt: now, expiresAt: "2026-05-10T00:30:00.000Z" });
  if (!enqueued.value) throw new Error("missing queue item");
  return { plan: queuedPlan, queueItem: enqueued.value.queueItem, receipts: [...queued.receipts, ...enqueued.receipts] };
}

function leasedPlanAndItem(): { plan: ExecutionPlan; queueItem: QueueItem; receipts: ExecutionLifecycleReceipt[] } {
  const queued = queuedPlanAndItem();
  const lease = acquireQueueLease({
    plan: queued.plan,
    queueItem: queued.queueItem,
    ownerId: "owner-1",
    leaseId: "lease-1",
    acquiredAt: now,
    expiresAt: "2026-05-10T00:10:00.000Z",
  });
  if (!lease.value) throw new Error("missing lease");
  return { plan: queued.plan, queueItem: lease.value.queueItem, receipts: [...queued.receipts, ...lease.receipts] };
}

describe("execution lifecycle substrate", () => {
  it("defines the canonical non-autonomous event taxonomy", () => {
    expect(EXECUTION_LIFECYCLE_EVENT_TAXONOMY).toEqual([
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
    ]);
  });

  it("accepts legal lifecycle transitions and rejects illegal transitions", () => {
    expect(transitionExecutionState("planned", "queued")).toBe(true);
    expect(transitionExecutionState("queued", "leased")).toBe(true);
    expect(transitionExecutionState("leased", "executing")).toBe(true);
    expect(transitionExecutionState("executing", "completed")).toBe(true);
    expect(transitionExecutionState("queued", "executing")).toBe(false);

    const illegal = transitionExecutionPlan({ plan: plan({ status: "completed" }), next: "executing", phase: "execution", at: now, actor: "operator", reasonCode: "bad_replay" });
    expect(illegal.ok).toBe(false);
    expect(illegal.reasonCode).toBe("invalid_transition");
  });

  it("validates plans fail-closed for missing governance, trust, invariants, and degraded reasons", () => {
    expect(validateExecutionPlan(plan())).toEqual([]);
    const reasons = validateExecutionPlan(plan({
      governanceMetadata: {},
      trustMetadata: {},
      invariantSet: [{ code: "no-hidden-retry", description: "not enforced", enforced: false }],
      status: "degraded",
    }));
    expect(reasons).toEqual(["missing_governance_metadata", "missing_trust_metadata", "unenforced_invariant", "missing_degraded_reason"]);
  });

  it("creates queue items with deterministic lineage and detects replay drift", () => {
    const { plan: queuedPlan, queueItem } = queuedPlanAndItem();
    expect(queueItem.replayReference.lineageHash).toBe(lineageHash(queuedPlan.replayReference.lineage));
    expect(validateReplayConsistency(queuedPlan, queueItem)).toEqual([]);

    const drift = validateReplayConsistency(
      { ...queuedPlan, governanceMetadata: {} },
      { ...queueItem, replayReference: { ...queueItem.replayReference, replayReferenceId: "other" } },
      {
        currentTrustMetadata: { trustLevel: "revoked" },
        candidatePlanId: "plan-other",
        fallbackPermitted: true,
        ownerId: "owner-x",
        leaseId: "lease-x",
        receiptReferences: [{ receiptId: "expected", receiptDigest: "digest" }],
      },
    );
    expect(drift).toContain("missing_governance_metadata");
    expect(drift).toContain("replay_drift");
    expect(drift).toContain("trust_drift");
    expect(drift).toContain("fallback_drift");
    expect(drift).toContain("candidate_mismatch");
    expect(drift).toContain("ownership_mismatch");
    expect(drift).toContain("lease_mismatch");
    expect(drift).toContain("receipt_mismatch");
  });

  it("acquires, renews, expires, and revokes leases only through explicit state changes", () => {
    const { plan: queuedPlan, queueItem } = queuedPlanAndItem();
    const leased = acquireQueueLease({ plan: queuedPlan, queueItem, ownerId: "owner-1", leaseId: "lease-1", acquiredAt: now, expiresAt: "2026-05-10T00:10:00.000Z" });
    expect(leased.ok).toBe(true);
    expect(leased.value?.queueItem.state).toBe("leased");
    expect(leased.events.map((event) => event.eventType)).toEqual(["lease_acquired", "queue_item_leased"]);

    const duplicate = acquireQueueLease({ plan: queuedPlan, queueItem: leased.value!.queueItem, ownerId: "owner-1", leaseId: "lease-1b", acquiredAt: now, expiresAt: "2026-05-10T00:10:00.000Z" });
    expect(duplicate.ok).toBe(false);
    expect(duplicate.reasonCode).toBe("invalid_transition");

    const conflict = detectLeaseConflict(leased.value?.lease, "owner-2", "2026-05-10T00:01:00.000Z");
    expect(conflict).toBe("split_brain");

    const renewed = renewQueueLease({ plan: queuedPlan, queueItem: leased.value!.queueItem, ownerId: "owner-1", renewedAt: "2026-05-10T00:02:00.000Z", expiresAt: "2026-05-10T00:20:00.000Z" });
    expect(renewed.ok).toBe(true);
    expect(renewed.value?.lease.renewalCount).toBe(1);

    const expired = expireQueueLease({ plan: queuedPlan, queueItem: renewed.value!.queueItem, expiredAt: "2026-05-10T00:21:00.000Z" });
    expect(expired.ok).toBe(true);
    expect(expired.value?.queueItem.state).toBe("expired");
    expect(expired.value?.queueItem.degradedState?.reasonCode).toBe("lease_expired");

    const revoked = revokeQueueLease({ plan: queuedPlan, queueItem: renewed.value!.queueItem, ownerId: "owner-1", revokedAt: "2026-05-10T00:03:00.000Z", reasonCode: "operator_revoked" });
    expect(revoked.ok).toBe(true);
    expect(revoked.value?.queueItem.state).toBe("blocked");
  });

  it("rejects split-brain and stale-owner execution attempts", () => {
    const { plan: queuedPlan, queueItem } = leasedPlanAndItem();
    const wrongOwner = startExecution({ plan: queuedPlan, queueItem, ownerId: "owner-2", startedAt: later });
    expect(wrongOwner.ok).toBe(false);
    expect(wrongOwner.reasonCode).toBe("ownership_mismatch");

    const stale = startExecution({ plan: queuedPlan, queueItem, ownerId: "owner-1", startedAt: "2026-05-10T00:11:00.000Z" });
    expect(stale.ok).toBe(false);
    expect(stale.reasonCode).toBe("stale_queue_ownership");
  });

  it("records execution start, completion, failure, cancellation, and blocked receipts", () => {
    const { plan: queuedPlan, queueItem } = leasedPlanAndItem();
    const started = startExecution({ plan: queuedPlan, queueItem, ownerId: "owner-1", startedAt: later });
    expect(started.value?.queueItem.state).toBe("executing");

    const completed = completeExecution({ plan: queuedPlan, queueItem: started.value!.queueItem, ownerId: "owner-1", finishedAt: "2026-05-10T00:06:00.000Z" });
    expect(completed.value?.queueItem.state).toBe("completed");

    const failedStart = startExecution({ plan: queuedPlan, queueItem, ownerId: "owner-1", startedAt: later });
    const failed = failExecution({ plan: queuedPlan, queueItem: failedStart.value!.queueItem, ownerId: "owner-1", finishedAt: "2026-05-10T00:06:00.000Z", reasonCode: "trust_invalidated_mid_flow" });
    expect(failed.value?.queueItem.state).toBe("failed");
    expect(failed.value?.queueItem.degradedState?.reasonCode).toBe("trust_invalidated_mid_flow");

    const cancelledStart = startExecution({ plan: queuedPlan, queueItem, ownerId: "owner-1", startedAt: later });
    const cancelled = cancelExecution({ plan: queuedPlan, queueItem: cancelledStart.value!.queueItem, ownerId: "owner-1", finishedAt: "2026-05-10T00:06:00.000Z", reasonCode: "operator_cancelled" });
    expect(cancelled.value?.queueItem.state).toBe("cancelled");

    const blockedStart = startExecution({ plan: queuedPlan, queueItem, ownerId: "owner-1", startedAt: later });
    const blocked = blockExecution({ plan: queuedPlan, queueItem: blockedStart.value!.queueItem, ownerId: "owner-1", finishedAt: "2026-05-10T00:06:00.000Z", reasonCode: "governance_metadata_loss" });
    expect(blocked.value?.queueItem.state).toBe("blocked");
    expect(blocked.events[0]?.eventType).toBe("execution_blocked");
  });

  it("deduplicates deterministic reruns and blocks cancellation-safe replay", () => {
    const base = plan();
    expect(detectIdempotencyConflict(undefined, base)).toBe("ok");
    expect(detectIdempotencyConflict(base, base)).toBe("deterministic_rerun");
    expect(detectIdempotencyConflict({ ...base, status: "cancelled", cancelledAt: now, cancellationReasonCode: "operator_cancelled" }, base)).toBe("cancellation_safe_replay_blocked");
    expect(detectIdempotencyConflict(base, { ...base, planId: "plan-2", trustMetadata: { trustLevel: "revoked" } })).toBe("idempotency_key_conflict");
  });

  it("builds deterministic execution proofpacks and rejects tampering", () => {
    const { plan: queuedPlan, queueItem, receipts } = leasedPlanAndItem();
    const started = startExecution({ plan: queuedPlan, queueItem, ownerId: "owner-1", startedAt: later });
    const completed = completeExecution({ plan: queuedPlan, queueItem: started.value!.queueItem, ownerId: "owner-1", finishedAt: "2026-05-10T00:06:00.000Z" });
    const allReceipts = [...receipts, ...started.receipts, ...completed.receipts];
    const proofpack = buildExecutionProofpack({
      generatedAt: "2026-05-10T00:07:00.000Z",
      executionPlan: queuedPlan,
      executionReceipts: allReceipts,
      queueHistory: [queueItem, started.value!.queueItem, completed.value!.queueItem],
      telemetryLineage: { state: "unavailable", reasonCode: "telemetry_unavailable" },
    });
    expect(proofpack.evidenceManifest.artifacts.map((artifact) => artifact.kind)).toContain("execution_plan");
    expect(validateExecutionProofpack(proofpack, "2026-05-10T00:07:00.000Z")).toMatchObject({ ok: true, status: "passed", digestMatch: true, manifestDigestMatch: true });

    const tampered = { ...proofpack, digest: "tampered" };
    expect(validateExecutionProofpack(tampered, "2026-05-10T00:07:00.000Z").reasons).toContain("proofpack_integrity_mismatch");

    const hiddenFallbackReceipt = createLifecycleReceipt({
      eventType: "execution_failed",
      plan: queuedPlan,
      occurredAt: "2026-05-10T00:08:00.000Z",
      reasonCode: "fallback_missing_reason",
      payload: { fallback: { hidden: true } },
    });
    const unsafe = buildExecutionProofpack({
      generatedAt: "2026-05-10T00:09:00.000Z",
      executionPlan: queuedPlan,
      executionReceipts: [...allReceipts, hiddenFallbackReceipt],
      queueHistory: [queueItem],
      leaseHistory: [queueItem.lease!],
    });
    expect(validateExecutionProofpack(unsafe, "2026-05-10T00:09:00.000Z").reasons).toContain("hidden_fallback_detected");
  });

  it("distinguishes observed, unavailable, stale, conflicted, degraded, and blocked diagnostics", () => {
    const { plan: queuedPlan, queueItem } = leasedPlanAndItem();
    const conflicted: QueueItem = {
      ...queueItem,
      state: "blocked",
      ownership: { ownerId: "owner-x", acquiredAt: now },
      lease: { ...queueItem.lease!, ownerId: "owner-1", expiresAt: "2026-05-10T00:01:00.000Z" },
      degradedState: { reasonCode: "lease_conflict_detected", at: later, explanation: "split brain" },
    };
    const snapshot = buildExecutionDiagnostics({ capturedAt: later, plan: queuedPlan, queueItem: conflicted });
    const states = new Set(snapshot.facts.map((fact) => fact.state));
    expect(states).toEqual(new Set(["observed", "blocked", "stale", "conflicted", "degraded"]));

    const unavailable = buildExecutionDiagnostics({ capturedAt: later });
    expect(new Set(unavailable.facts.map((fact) => fact.state))).toContain("unavailable");
  });

  it("surfaces lifecycle events in observability aggregation without fabricated completeness", () => {
    const log = new OperationalMemoryLog();
    log.append({ occurredAt: now, category: "queue_item_queued", source: "test", provenance: { requestId: "request-1" }, replayRef: { lineage: ["plan-1"], replayVersion: "1" }, payload: { state: "observed", reasonCode: "queue_item_queued" } });
    log.append({ occurredAt: later, category: "lease_conflict_detected", source: "test", provenance: { requestId: "request-1" }, replayRef: { lineage: ["plan-1"], replayVersion: "1" }, payload: { state: "conflicted", reasonCode: "conflicting_ownership" } });
    log.append({ occurredAt: later, category: "proofpack_validation_failed", source: "test", provenance: { requestId: "request-1" }, replayRef: { lineage: ["plan-1"], replayVersion: "1" }, payload: { state: "degraded", reasonCode: "proofpack_integrity_mismatch" } });

    expect(summarizeExecutionLifecycleEventCounts(log.list())).toEqual({
      lease_conflict_detected: 1,
      proofpack_validation_failed: 1,
      queue_item_queued: 1,
    });
    expect(summarizeExecutionLifecycleTruth(log.list())).toMatchObject({ observed: 1, conflicted: 1, degraded: 1, unavailable: 0 });
  });

  it("keeps old split-brain and stale-owner helper behavior stable", () => {
    expect(detectLeaseConflict(undefined, "owner-a", now)).toBe("none");
    expect(detectLeaseConflict({ leaseId: "l1", ownerId: "owner-a", acquiredAt: now, expiresAt: "2026-05-10T01:00:00.000Z" }, "owner-b", later)).toBe("split_brain");
    expect(detectLeaseConflict({ leaseId: "l1", ownerId: "owner-a", acquiredAt: now, expiresAt: "2026-05-10T00:01:00.000Z" }, "owner-a", later)).toBe("stale_owner");
  });
});
