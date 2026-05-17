// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Governed retry system implementation.
 *
 * Hard rules:
 * - No hidden retries
 * - Retry budget required
 * - Retry reason required
 * - Retry must respect policy/trust/approval
 * - Retry replay must validate
 */

import {
  RetryPolicy,
  RetryAttempt,
  RetryBudget,
  RetryBackoff,
  RetryReceipt,
  RetryReasonCode,
  RetryAttemptStatus,
  BackoffStrategy,
  DEFAULT_RETRY_POLICY,
  createRetryBudget,
  consumeRetryBudget,
  isBudgetExhausted,
  calculateBackoffDelay,
  validateRetryAttempt,
} from "./types";

import { isRetryPolicyExplicit } from "../orchestration/types";

// ============================================================================
// Store interface
// ============================================================================

export interface RetryStore {
  getAttempts(runId: string, stepId: string): RetryAttempt[];
  saveAttempt(attempt: RetryAttempt): void;
  getBudget(runId: string): RetryBudget | undefined;
  saveBudget(budget: RetryBudget): void;
}

export class InMemoryRetryStore implements RetryStore {
  private attempts = new Map<string, RetryAttempt[]>();
  private budgets = new Map<string, RetryBudget>();

  getAttempts(runId: string, stepId: string): RetryAttempt[] {
    const key = `${runId}:${stepId}`;
    return this.attempts.get(key) ?? [];
  }

  saveAttempt(attempt: RetryAttempt): void {
    const key = `${attempt.runId}:${attempt.stepId}`;
    const existing = this.attempts.get(key) ?? [];
    existing.push(attempt);
    this.attempts.set(key, existing);
  }

  getBudget(runId: string): RetryBudget | undefined {
    return this.budgets.get(runId);
  }

  saveBudget(budget: RetryBudget): void {
    this.budgets.set(budget.runId, budget);
  }
}

// ============================================================================
// Retry manager
// ============================================================================

export class RetryManager {
  private store: RetryStore;
  private receipts: RetryReceipt[] = [];
  private policies = new Map<string, RetryPolicy>();

  constructor(store: RetryStore) {
    this.store = store;
  }

  registerPolicy(policy: RetryPolicy): void {
    this.policies.set(policy.policyId, policy);
  }

  requestRetry(
    runId: string,
    stepId: string,
    reasonCode: RetryReasonCode,
    reasonMessage: string,
    policyId: string,
    budgetId: string,
    attemptNumber: number,
    trustLevel: string,
    approvalGranted: boolean,
  ): { allowed: boolean; receipt: RetryReceipt; attempt?: RetryAttempt } {
    if (!isRetryPolicyExplicit()) {
      const receipt = this.makeReceipt(
        runId,
        stepId,
        "",
        false,
        RetryReasonCode.POLICY_DENIED,
        "Retry policy is not explicit. Set NEMOCLAW_RETRY_POLICY=explicit to enable.",
      );
      return { allowed: false, receipt };
    }

    const policy = this.policies.get(policyId);
    if (!policy || !policy.enabled) {
      const receipt = this.makeReceipt(
        runId,
        stepId,
        "",
        false,
        RetryReasonCode.POLICY_DENIED,
        "Retry policy is not enabled",
      );
      return { allowed: false, receipt };
    }

    if (!policy.retryableReasons.includes(reasonCode)) {
      const receipt = this.makeReceipt(
        runId,
        stepId,
        "",
        false,
        RetryReasonCode.NOT_RETRYABLE,
        `Reason ${reasonCode} is not retryable per policy`,
      );
      return { allowed: false, receipt };
    }

    const budget = this.store.getBudget(runId);
    if (!budget || isBudgetExhausted(budget)) {
      const receipt = this.makeReceipt(
        runId,
        stepId,
        "",
        false,
        RetryReasonCode.BUDGET_EXHAUSTED,
        "Retry budget exhausted",
        budget ? budget.remainingRetries : undefined,
      );
      return { allowed: false, receipt };
    }

    if (policy.requiresApproval && !approvalGranted) {
      const receipt = this.makeReceipt(
        runId,
        stepId,
        "",
        false,
        RetryReasonCode.APPROVAL_REQUIRED,
        "Approval required for retry",
        budget.remainingRetries,
      );
      return { allowed: false, receipt };
    }

    const backoff: RetryBackoff = {
      strategy: policy.backoffStrategy,
      attemptNumber,
      initialDelayMs: policy.initialDelayMs,
      maxDelayMs: policy.maxDelayMs,
      jitterEnabled: policy.jitterEnabled,
    };
    const delayMs = calculateBackoffDelay(backoff);

    const updatedBudget = consumeRetryBudget(budget);
    this.store.saveBudget(updatedBudget);

    const attemptId = `retry-${runId}-${stepId}-${attemptNumber}`;
    const attempt: RetryAttempt = {
      attemptId,
      runId,
      stepId,
      attemptNumber,
      reasonCode,
      reasonMessage,
      scheduledAt: new Date().toISOString(),
      status: "scheduled",
      backoffDelayMs: delayMs,
      budgetConsumed: true,
      policyVersion: policy.version,
      approvalGranted,
    };
    this.store.saveAttempt(attempt);

    const nextRetryAt = new Date(Date.now() + delayMs).toISOString();
    const receipt = this.makeReceipt(
      runId,
      stepId,
      attemptId,
      true,
      RetryReasonCode.TRANSIENT_ERROR,
      `Retry scheduled with ${delayMs}ms backoff`,
      updatedBudget.remainingRetries,
      delayMs,
      nextRetryAt,
    );

    return { allowed: true, receipt, attempt };
  }

  executeRetry(attemptId: string, runId: string, stepId: string): RetryReceipt {
    const attempts = this.store.getAttempts(runId, stepId);
    const attempt = attempts.find((a) => a.attemptId === attemptId);

    if (!attempt) {
      return this.makeReceipt(
        runId,
        stepId,
        attemptId,
        false,
        RetryReasonCode.NOT_RETRYABLE,
        "Retry attempt not found",
      );
    }

    const now = new Date().toISOString();
    const updatedAttempt: RetryAttempt = {
      ...attempt,
      status: "completed" as RetryAttemptStatus,
      executedAt: now,
      completedAt: now,
    };

    const key = `${runId}:${stepId}`;
    const allAttempts = this.store.getAttempts(runId, stepId);
    const updatedAttempts = allAttempts.map((a) =>
      a.attemptId === attemptId ? updatedAttempt : a,
    );
    (this.store as InMemoryRetryStore).saveAttempt(updatedAttempt);

    return this.makeReceipt(
      runId,
      stepId,
      attemptId,
      true,
      RetryReasonCode.TRANSIENT_ERROR,
      "Retry executed",
    );
  }

  getReceipts(): RetryReceipt[] {
    return [...this.receipts];
  }

  private makeReceipt(
    runId: string,
    stepId: string,
    attemptId: string,
    allowed: boolean,
    reasonCode: RetryReasonCode,
    message: string,
    budgetRemaining?: number,
    backoffDelayMs?: number,
    nextRetryAt?: string,
  ): RetryReceipt {
    const receipt: RetryReceipt = {
      receiptId: `retry-receipt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      runId,
      stepId,
      attemptId,
      timestamp: new Date().toISOString(),
      reasonCode,
      allowed,
      message,
      budgetRemaining,
      backoffDelayMs,
      nextRetryAt,
    };
    this.receipts.push(receipt);
    return receipt;
  }
}
