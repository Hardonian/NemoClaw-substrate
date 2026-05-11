// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach } from "vitest";
import {
  RetryManager,
  InMemoryRetryStore,
} from "./retry";
import {
  RetryPolicy,
  RetryReasonCode,
  createRetryBudget,
  DEFAULT_RETRY_POLICY,
} from "./types";

function createTestRetryPolicy(overrides?: Partial<RetryPolicy>): RetryPolicy {
  const base: RetryPolicy = {
    ...DEFAULT_RETRY_POLICY,
    policyId: "test-retry-policy",
    name: "Test Retry Policy",
    enabled: true,
    retryableReasons: [RetryReasonCode.TRANSIENT_ERROR, RetryReasonCode.TIMEOUT],
    maxRetries: 3,
    backoffStrategy: "exponential",
    initialDelayMs: 100,
    maxDelayMs: 5000,
    jitterEnabled: false,
  };
  return { ...base, ...overrides };
}

describe("retry manager", () => {
  let manager: RetryManager;
  let store: InMemoryRetryStore;

  beforeEach(() => {
    store = new InMemoryRetryStore();
    manager = new RetryManager(store);
  });

  describe("retry requires explicit policy", () => {
    it("should reject retry when policy is not explicit", () => {
      const originalEnv = process.env.NEMOCLAW_RETRY_POLICY;
      try {
        delete process.env.NEMOCLAW_RETRY_POLICY;

        const policy = createTestRetryPolicy();
        manager.registerPolicy(policy);

        const budget = createRetryBudget("test-run", 3);
        store.saveBudget(budget);

        const result = manager.requestRetry(
          "test-run",
          "test-step",
          RetryReasonCode.TRANSIENT_ERROR,
          "Transient error",
          "test-retry-policy",
          "budget-test-run",
          1,
          "high",
          true,
        );

        expect(result.allowed).toBe(false);
        expect(result.receipt.reasonCode).toBe(RetryReasonCode.POLICY_DENIED);
      } finally {
        if (originalEnv !== undefined) {
          process.env.NEMOCLAW_RETRY_POLICY = originalEnv;
        }
      }
    });

    it("should allow retry when policy is explicit", () => {
      const originalEnv = process.env.NEMOCLAW_RETRY_POLICY;
      try {
        process.env.NEMOCLAW_RETRY_POLICY = "explicit";

        const policy = createTestRetryPolicy();
        manager.registerPolicy(policy);

        const budget = createRetryBudget("test-run", 3);
        store.saveBudget(budget);

        const result = manager.requestRetry(
          "test-run",
          "test-step",
          RetryReasonCode.TRANSIENT_ERROR,
          "Transient error",
          "test-retry-policy",
          "budget-test-run",
          1,
          "high",
          true,
        );

        expect(result.allowed).toBe(true);
        expect(result.receipt.allowed).toBe(true);
      } finally {
        if (originalEnv !== undefined) {
          process.env.NEMOCLAW_RETRY_POLICY = originalEnv;
        }
      }
    });
  });

  describe("retry denied by policy", () => {
    beforeEach(() => {
      process.env.NEMOCLAW_RETRY_POLICY = "explicit";
    });

    it("should reject retry when policy is not enabled", () => {
      const policy = createTestRetryPolicy({ enabled: false });
      manager.registerPolicy(policy);

      const budget = createRetryBudget("test-run", 3);
      store.saveBudget(budget);

      const result = manager.requestRetry(
        "test-run",
        "test-step",
        RetryReasonCode.TRANSIENT_ERROR,
        "Transient error",
        "test-retry-policy",
        "budget-test-run",
        1,
        "high",
        true,
      );

      expect(result.allowed).toBe(false);
      expect(result.receipt.reasonCode).toBe(RetryReasonCode.POLICY_DENIED);
    });

    it("should reject retry for non-retryable reason", () => {
      const policy = createTestRetryPolicy({
        retryableReasons: [RetryReasonCode.TRANSIENT_ERROR],
      });
      manager.registerPolicy(policy);

      const budget = createRetryBudget("test-run", 3);
      store.saveBudget(budget);

      const result = manager.requestRetry(
        "test-run",
        "test-step",
        RetryReasonCode.NETWORK_ERROR,
        "Network error",
        "test-retry-policy",
        "budget-test-run",
        1,
        "high",
        true,
      );

      expect(result.allowed).toBe(false);
      expect(result.receipt.reasonCode).toBe(RetryReasonCode.NOT_RETRYABLE);
    });

    it("should reject retry when budget is exhausted", () => {
      const policy = createTestRetryPolicy();
      manager.registerPolicy(policy);

      const budget = createRetryBudget("test-run", 1);
      store.saveBudget(budget);

      manager.requestRetry(
        "test-run",
        "test-step",
        RetryReasonCode.TRANSIENT_ERROR,
        "Transient error",
        "test-retry-policy",
        "budget-test-run",
        1,
        "high",
        true,
      );

      const result = manager.requestRetry(
        "test-run",
        "test-step",
        RetryReasonCode.TRANSIENT_ERROR,
        "Second transient error",
        "test-retry-policy",
        "budget-test-run",
        2,
        "high",
        true,
      );

      expect(result.allowed).toBe(false);
      expect(result.receipt.reasonCode).toBe(RetryReasonCode.BUDGET_EXHAUSTED);
    });
  });

  describe("retry backoff", () => {
    it("should calculate exponential backoff", () => {
      const { calculateBackoffDelay, RetryBackoff } = require("./types");
      const backoff = {
        strategy: "exponential" as const,
        attemptNumber: 1,
        initialDelayMs: 100,
        maxDelayMs: 5000,
        jitterEnabled: false,
      };

      const delay = calculateBackoffDelay(backoff);
      expect(delay).toBe(100);
    });
  });
});
