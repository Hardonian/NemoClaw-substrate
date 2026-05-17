// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach } from "vitest";
import {
  FanoutManager,
  InMemoryFanoutStore,
} from "./fanout";
import {
  FanoutPolicy,
  FanoutReasonCode,
  DEFAULT_FANOUT_POLICY,
} from "./types";

function createTestFanoutPolicy(overrides?: Partial<FanoutPolicy>): FanoutPolicy {
  const base: FanoutPolicy = {
    ...DEFAULT_FANOUT_POLICY,
    policyId: "test-fanout-policy",
    name: "Test Fanout Policy",
    enabled: true,
    maxCandidates: 3,
    timeoutMs: 30000,
    winnerSelectionStrategy: "first_complete",
  };
  return { ...base, ...overrides };
}

describe("fanout manager", () => {
  let manager: FanoutManager;
  let store: InMemoryFanoutStore;

  beforeEach(() => {
    store = new InMemoryFanoutStore();
    manager = new FanoutManager(store);
  });

  describe("fanout bounded", () => {
    it("should reject fanout when not enabled", () => {
      const originalEnv = process.env.NEMOCLAW_SPECULATIVE_FANOUT;
      try {
        delete process.env.NEMOCLAW_SPECULATIVE_FANOUT;

        const policy = createTestFanoutPolicy();
        manager.registerPolicy(policy);

        const result = manager.startFanout(
          "test-run",
          "test-fanout",
          "test-fanout-policy",
          [{}, {}, {}],
        );

        expect(result.allowed).toBe(false);
      } finally {
        if (originalEnv !== undefined) {
          process.env.NEMOCLAW_SPECULATIVE_FANOUT = originalEnv;
        }
      }
    });

    it("should reject fanout when max candidates exceeded", () => {
      const originalEnv = process.env.NEMOCLAW_SPECULATIVE_FANOUT;
      try {
        process.env.NEMOCLAW_SPECULATIVE_FANOUT = "1";

        const policy = createTestFanoutPolicy({ maxCandidates: 2 });
        manager.registerPolicy(policy);

        const result = manager.startFanout(
          "test-run",
          "test-fanout",
          "test-fanout-policy",
          [{}, {}, {}],
        );

        expect(result.allowed).toBe(false);
        expect(result.receipt.reasonCode).toBe(FanoutReasonCode.MAX_CANDIDATES_EXCEEDED);
      } finally {
        if (originalEnv !== undefined) {
          process.env.NEMOCLAW_SPECULATIVE_FANOUT = originalEnv;
        }
      }
    });

    it("should allow fanout within bounds", () => {
      const originalEnv = process.env.NEMOCLAW_SPECULATIVE_FANOUT;
      try {
        process.env.NEMOCLAW_SPECULATIVE_FANOUT = "1";

        const policy = createTestFanoutPolicy({ maxCandidates: 3 });
        manager.registerPolicy(policy);

        const result = manager.startFanout(
          "test-run",
          "test-fanout",
          "test-fanout-policy",
          [{}, {}, {}],
        );

        expect(result.allowed).toBe(true);
        expect(result.run?.candidates.length).toBe(3);
      } finally {
        if (originalEnv !== undefined) {
          process.env.NEMOCLAW_SPECULATIVE_FANOUT = originalEnv;
        }
      }
    });
  });

  describe("fanout cancellation receipts", () => {
    beforeEach(() => {
      process.env.NEMOCLAW_SPECULATIVE_FANOUT = "1";
    });

    it("should emit cancellation receipt when cancelling a candidate", () => {
      const policy = createTestFanoutPolicy();
      manager.registerPolicy(policy);

      manager.startFanout(
        "test-run",
        "test-fanout",
        "test-fanout-policy",
        [{}, {}, {}],
      );

      const receipt = manager.cancelCandidate(
        "test-fanout",
        "candidate-test-fanout-0",
        "Test cancellation",
      );

      expect(receipt.reasonCode).toBe(FanoutReasonCode.CANDIDATE_CANCELLED);
    });

    it("should emit cancellation receipt when cancelling entire fanout", () => {
      const policy = createTestFanoutPolicy();
      manager.registerPolicy(policy);

      manager.startFanout(
        "test-run",
        "test-fanout",
        "test-fanout-policy",
        [{}, {}, {}],
      );

      const receipt = manager.cancelFanout(
        "test-fanout",
        "Test fanout cancellation",
        "test-operator",
      );

      expect(receipt.reasonCode).toBe(FanoutReasonCode.FANOUT_CANCELLED);
    });
  });

  describe("winner selection", () => {
    beforeEach(() => {
      process.env.NEMOCLAW_SPECULATIVE_FANOUT = "1";
    });

    it("should select a winner and record losers", () => {
      const policy = createTestFanoutPolicy({ winnerSelectionStrategy: "first_complete" });
      manager.registerPolicy(policy);

      manager.startFanout(
        "test-run",
        "test-fanout",
        "test-fanout-policy",
        [{}, {}, {}],
      );

      manager.completeCandidate("test-fanout", "candidate-test-fanout-0", "hash-0");
      manager.completeCandidate("test-fanout", "candidate-test-fanout-1", "hash-1");

      const result = manager.selectWinner("test-fanout");

      expect(result.winnerId).toBe("candidate-test-fanout-0");
      expect(result.receipts.length).toBeGreaterThan(0);
    });
  });

  describe("policy denial prevents fanout", () => {
    it("should reject fanout when policy is not enabled", () => {
      const originalEnv = process.env.NEMOCLAW_SPECULATIVE_FANOUT;
      try {
        process.env.NEMOCLAW_SPECULATIVE_FANOUT = "1";

        const policy = createTestFanoutPolicy({ enabled: false });
        manager.registerPolicy(policy);

        const result = manager.startFanout(
          "test-run",
          "test-fanout",
          "test-fanout-policy",
          [{}],
        );

        expect(result.allowed).toBe(false);
        expect(result.receipt.reasonCode).toBe(FanoutReasonCode.POLICY_DENIED);
      } finally {
        if (originalEnv !== undefined) {
          process.env.NEMOCLAW_SPECULATIVE_FANOUT = originalEnv;
        }
      }
    });
  });
});
