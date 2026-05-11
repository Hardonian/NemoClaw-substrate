// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Governed retry system types.
 *
 * Hard rules:
 * - No hidden retries
 * - Retry budget required
 * - Retry reason required
 * - Retry must respect policy/trust/approval
 * - Retry replay must validate
 */

// ============================================================================
// Retry reason codes
// ============================================================================

export enum RetryReasonCode {
  // Allowed retries
  TRANSIENT_ERROR = "transient_error",
  TIMEOUT = "timeout",
  RESOURCE_UNAVAILABLE = "resource_unavailable",
  RATE_LIMITED = "rate_limited",
  NETWORK_ERROR = "network_error",
  LEASE_STALE = "lease_stale",

  // Denied retries
  BUDGET_EXHAUSTED = "budget_exhausted",
  NOT_RETRYABLE = "not_retryable",
  BACKOFF_PENDING = "backoff_pending",
  POLICY_DENIED = "policy_denied",
  TRUST_INSUFFICIENT = "trust_insufficient",
  APPROVAL_REQUIRED = "approval_required",
  MAX_RETRIES_REACHED = "max_retries_reached",
  FANOUT_CANCELLED = "fanout_cancelled",
}

// ============================================================================
// Retry policy
// ============================================================================

export interface RetryPolicy {
  policyId: string;
  name: string;
  version: string;
  enabled: boolean;
  retryableReasons: RetryReasonCode[];
  maxRetries: number;
  backoffStrategy: BackoffStrategy;
  initialDelayMs: number;
  maxDelayMs: number;
  jitterEnabled: boolean;
  budgetRequired: boolean;
  requiresApproval: boolean;
  createdAt: string;
  updatedAt: string;
}

export type BackoffStrategy = "exponential" | "linear" | "fixed" | "none";

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  policyId: "default",
  name: "Default Retry Policy",
  version: "1.0.0",
  enabled: false,
  retryableReasons: [],
  maxRetries: 0,
  backoffStrategy: "none",
  initialDelayMs: 0,
  maxDelayMs: 0,
  jitterEnabled: false,
  budgetRequired: true,
  requiresApproval: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ============================================================================
// Retry attempt
// ============================================================================

export interface RetryAttempt {
  attemptId: string;
  runId: string;
  stepId: string;
  attemptNumber: number;
  reasonCode: RetryReasonCode;
  reasonMessage: string;
  scheduledAt: string;
  executedAt?: string;
  completedAt?: string;
  status: RetryAttemptStatus;
  backoffDelayMs: number;
  budgetConsumed: boolean;
  policyVersion?: string;
  approvalGranted?: boolean;
  metadata?: Record<string, unknown>;
}

export type RetryAttemptStatus =
  | "scheduled"
  | "pending"
  | "executing"
  | "completed"
  | "failed"
  | "cancelled";

// ============================================================================
// Retry budget
// ============================================================================

export interface RetryBudget {
  budgetId: string;
  runId: string;
  maxRetries: number;
  consumedRetries: number;
  remainingRetries: number;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export function createRetryBudget(
  runId: string,
  maxRetries: number,
): RetryBudget {
  const now = new Date().toISOString();
  return {
    budgetId: `budget-${runId}`,
    runId,
    maxRetries,
    consumedRetries: 0,
    remainingRetries: maxRetries,
    createdAt: now,
    updatedAt: now,
  };
}

export function consumeRetryBudget(budget: RetryBudget): RetryBudget {
  if (budget.remainingRetries <= 0) {
    return budget;
  }
  return {
    ...budget,
    consumedRetries: budget.consumedRetries + 1,
    remainingRetries: budget.remainingRetries - 1,
    updatedAt: new Date().toISOString(),
  };
}

export function isBudgetExhausted(budget: RetryBudget): boolean {
  return budget.remainingRetries <= 0;
}

// ============================================================================
// Retry backoff
// ============================================================================

export interface RetryBackoff {
  strategy: BackoffStrategy;
  attemptNumber: number;
  initialDelayMs: number;
  maxDelayMs: number;
  jitterEnabled: boolean;
}

export function calculateBackoffDelay(backoff: RetryBackoff): number {
  let delayMs: number;

  switch (backoff.strategy) {
    case "exponential":
      delayMs = backoff.initialDelayMs * Math.pow(2, backoff.attemptNumber - 1);
      break;
    case "linear":
      delayMs = backoff.initialDelayMs * backoff.attemptNumber;
      break;
    case "fixed":
      delayMs = backoff.initialDelayMs;
      break;
    case "none":
      return 0;
    default:
      return 0;
  }

  delayMs = Math.min(delayMs, backoff.maxDelayMs);

  if (backoff.jitterEnabled) {
    const jitter = Math.random() * delayMs * 0.1;
    delayMs = Math.round(delayMs + jitter);
  }

  return delayMs;
}

// ============================================================================
// Retry receipt
// ============================================================================

export interface RetryReceipt {
  receiptId: string;
  runId: string;
  stepId: string;
  attemptId: string;
  timestamp: string;
  reasonCode: RetryReasonCode;
  allowed: boolean;
  message: string;
  budgetRemaining?: number;
  backoffDelayMs?: number;
  nextRetryAt?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Validation
// ============================================================================

export function validateRetryPolicy(policy: Partial<RetryPolicy>): string[] {
  const errors: string[] = [];

  if (!policy.policyId) {
    errors.push("policyId is required");
  }
  if (!policy.name) {
    errors.push("name is required");
  }
  if (!policy.version) {
    errors.push("version is required");
  }
  if (typeof policy.maxRetries !== "number" || policy.maxRetries < 0) {
    errors.push("maxRetries must be a non-negative number");
  }
  if (!policy.backoffStrategy) {
    errors.push("backoffStrategy is required");
  }
  if (typeof policy.initialDelayMs !== "number" || policy.initialDelayMs < 0) {
    errors.push("initialDelayMs must be a non-negative number");
  }

  return errors;
}

export function validateRetryAttempt(
  attempt: Partial<RetryAttempt>,
): string[] {
  const errors: string[] = [];

  if (!attempt.attemptId) {
    errors.push("attemptId is required");
  }
  if (!attempt.runId) {
    errors.push("runId is required");
  }
  if (!attempt.stepId) {
    errors.push("stepId is required");
  }
  if (typeof attempt.attemptNumber !== "number" || attempt.attemptNumber < 1) {
    errors.push("attemptNumber must be a positive number");
  }
  if (!attempt.reasonCode) {
    errors.push("reasonCode is required");
  }
  if (!attempt.status) {
    errors.push("status is required");
  }

  return errors;
}
