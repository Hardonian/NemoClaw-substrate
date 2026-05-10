// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";

import { deterministicSerialize } from "./serde";

export type ExecutionPlanStatus = "planned" | "queued" | "leased" | "executing" | "completed" | "failed" | "blocked" | "degraded" | "cancelled" | "expired";
export type ExecutionPlanPhase = "governance" | "planning" | "queueing" | "leasing" | "execution" | "receipt" | "replay" | "proofpack" | "diagnostics";
export type QueueState = Exclude<ExecutionPlanStatus, "planned">;

export interface ExecutionPlanInvariant { code: string; description: string; enforced: boolean }
export interface ExecutionPlanApproval { approvalId: string; actor: string; decidedAt: string; decision: "approved" | "rejected" | "revoked"; reasonCode: string }
export interface ExecutionPlanReceiptReference { receiptId: string; receiptDigest: string }
export interface ExecutionPlanReplayReference { replayReferenceId: string; lineage: string[]; replayDigest: string }
export interface ExecutionPlanDegradedState { reasonCode: string; explanation: string; at: string }
export type ExecutionPlanIdempotencyKey = string;

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
}

export interface QueueOwnership { ownerId: string; acquiredAt: string }
export interface QueueLease { leaseId: string; ownerId: string; acquiredAt: string; expiresAt: string; renewedAt?: string; revokedAt?: string }
export interface QueueReplayReference { replayReferenceId: string; lineageHash: string }
export interface QueueReceiptReference { receiptId: string }
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
  expiresAt?: string;
}

export type LeaseEventType = "lease_acquired" | "lease_renewed" | "lease_expired" | "lease_revoked" | "lease_conflict_detected";

export function lineageHash(lineage: string[]): string {
  return createHash("sha256").update(deterministicSerialize([...lineage])).digest("base64url");
}

export function validateReplayConsistency(plan: ExecutionPlan, queue: QueueItem): string[] {
  const reasons: string[] = [];
  if (!plan.replayReference.lineage.length) reasons.push("missing_lineage");
  if (!Object.keys(plan.governanceMetadata).length) reasons.push("missing_governance_metadata");
  if (!Object.keys(plan.trustMetadata).length) reasons.push("missing_trust_metadata");
  if (plan.status === "degraded" && !plan.degradedState?.reasonCode) reasons.push("missing_degraded_reason");
  if (queue.planId !== plan.planId) reasons.push("candidate_mismatch");
  if (queue.replayReference.replayReferenceId !== plan.replayReference.replayReferenceId) reasons.push("replay_drift");
  const expected = lineageHash(plan.replayReference.lineage);
  if (expected !== queue.replayReference.lineageHash) reasons.push("lineage_drift");
  return reasons;
}

export function transitionExecutionState(current: ExecutionPlanStatus, next: ExecutionPlanStatus): boolean {
  const allowed: Record<ExecutionPlanStatus, ExecutionPlanStatus[]> = {
    planned: ["queued", "cancelled", "expired", "blocked"],
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

export function detectLeaseConflict(existing: QueueLease | undefined, ownerId: string, nowIso: string): "none" | "split_brain" | "stale_owner" {
  if (!existing) return "none";
  if (existing.revokedAt) return "none";
  if (existing.ownerId !== ownerId && existing.expiresAt > nowIso) return "split_brain";
  if (existing.ownerId === ownerId && existing.expiresAt <= nowIso) return "stale_owner";
  return "none";
}
