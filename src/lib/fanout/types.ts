// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Speculative fanout types.
 *
 * Hard rules:
 * - Opt-in only
 * - Bounded max candidates
 * - Explicit cancellation receipts
 * - Winner selection deterministic
 * - Losing branches recorded
 * - No fanout around policy denial
 */

// ============================================================================
// Fanout reason codes
// ============================================================================

export enum FanoutReasonCode {
  // Fanout lifecycle
  FANOUT_STARTED = "fanout_started",
  FANOUT_COMPLETED = "fanout_completed",
  FANOUT_CANCELLED = "fanout_cancelled",

  // Budget
  BUDGET_EXHAUSTED = "budget_exhausted",
  MAX_CANDIDATES_REACHED = "max_candidates_reached",

  // Candidate status
  CANDIDATE_STARTED = "candidate_started",
  CANDIDATE_COMPLETED = "candidate_completed",
  CANDIDATE_FAILED = "candidate_failed",
  CANDIDATE_CANCELLED = "candidate_cancelled",

  // Winner selection
  WINNER_SELECTED = "winner_selected",
  LOSER_RECORDED = "loser_recorded",

  // Policy gates
  FANOUT_NOT_ENABLED = "fanout_not_enabled",
  POLICY_DENIED = "policy_denied",
  BUDGET_REQUIRED = "budget_required",
  MAX_CANDIDATES_EXCEEDED = "max_candidates_exceeded",
}

// ============================================================================
// Fanout policy
// ============================================================================

export interface FanoutPolicy {
  policyId: string;
  name: string;
  version: string;
  enabled: boolean;
  maxCandidates: number;
  timeoutMs: number;
  winnerSelectionStrategy: WinnerSelectionStrategy;
  budgetRequired: boolean;
  requiresApproval: boolean;
  createdAt: string;
  updatedAt: string;
}

export type WinnerSelectionStrategy = "first_complete" | "best_result" | "lowest_cost";

export const DEFAULT_FANOUT_POLICY: FanoutPolicy = {
  policyId: "default",
  name: "Default Fanout Policy",
  version: "1.0.0",
  enabled: false,
  maxCandidates: 0,
  timeoutMs: 0,
  winnerSelectionStrategy: "first_complete",
  budgetRequired: true,
  requiresApproval: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ============================================================================
// Fanout candidate
// ============================================================================

export interface FanoutCandidate {
  candidateId: string;
  fanoutId: string;
  runId: string;
  candidateIndex: number;
  status: CandidateStatus;
  payload: Record<string, unknown>;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  cancelledAt?: string;
  resultHash?: string;
  costEstimate?: number;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

export type CandidateStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "timed_out";

// ============================================================================
// Fanout budget
// ============================================================================

export interface FanoutBudget {
  budgetId: string;
  runId: string;
  maxCandidates: number;
  allocatedCandidates: number;
  remainingCandidates: number;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export function createFanoutBudget(
  runId: string,
  maxCandidates: number,
): FanoutBudget {
  const now = new Date().toISOString();
  return {
    budgetId: `fanout-budget-${runId}`,
    runId,
    maxCandidates,
    allocatedCandidates: 0,
    remainingCandidates: maxCandidates,
    createdAt: now,
    updatedAt: now,
  };
}

export function allocateCandidate(budget: FanoutBudget): FanoutBudget | null {
  if (budget.remainingCandidates <= 0) {
    return null;
  }
  return {
    ...budget,
    allocatedCandidates: budget.allocatedCandidates + 1,
    remainingCandidates: budget.remainingCandidates - 1,
    updatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// Fanout cancellation
// ============================================================================

export interface FanoutCancellation {
  cancellationId: string;
  fanoutId: string;
  runId: string;
  cancelledCandidateIds: string[];
  reasonCode: FanoutReasonCode;
  reasonMessage: string;
  cancelledAt: string;
  cancelledBy?: string;
  receipts: FanoutReceipt[];
}

// ============================================================================
// Fanout receipt
// ============================================================================

export interface FanoutReceipt {
  receiptId: string;
  runId: string;
  fanoutId: string;
  candidateId?: string;
  timestamp: string;
  reasonCode: FanoutReasonCode;
  type: FanoutReceiptType;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export enum FanoutReceiptType {
  FANOUT_STARTED = "fanout_started",
  CANDIDATE_STARTED = "candidate_started",
  CANDIDATE_COMPLETED = "candidate_completed",
  CANDIDATE_FAILED = "candidate_failed",
  CANDIDATE_CANCELLED = "candidate_cancelled",
  WINNER_SELECTED = "winner_selected",
  LOSER_RECORDED = "loser_recorded",
  FANOUT_COMPLETED = "fanout_completed",
  FANOUT_CANCELLED = "fanout_cancelled",
}


// ============================================================================
// Fanout run
// ============================================================================

export interface FanoutRun {
  fanoutId: string;
  runId: string;
  policyId: string;
  budgetId?: string;
  candidates: FanoutCandidate[];
  status: FanoutStatus;
  winnerCandidateId?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  receipts: FanoutReceipt[];
  cancellations: FanoutCancellation[];
}

export type FanoutStatus =
  | "pending"
  | "running"
  | "completed"
  | "cancelled"
  | "timed_out";

// ============================================================================
// Validation
// ============================================================================

export function validateFanoutPolicy(policy: Partial<FanoutPolicy>): string[] {
  const errors: string[] = [];

  if (!policy.policyId) {
    errors.push("policyId is required");
  }
  if (!policy.name) {
    errors.push("name is required");
  }
  if (typeof policy.maxCandidates !== "number" || policy.maxCandidates < 1) {
    errors.push("maxCandidates must be a positive number");
  }
  if (typeof policy.timeoutMs !== "number" || policy.timeoutMs <= 0) {
    errors.push("timeoutMs must be a positive number");
  }

  return errors;
}

export function validateFanoutCandidate(
  candidate: Partial<FanoutCandidate>,
): string[] {
  const errors: string[] = [];

  if (!candidate.candidateId) {
    errors.push("candidateId is required");
  }
  if (!candidate.fanoutId) {
    errors.push("fanoutId is required");
  }
  if (!candidate.runId) {
    errors.push("runId is required");
  }
  if (typeof candidate.candidateIndex !== "number") {
    errors.push("candidateIndex is required");
  }

  return errors;
}
