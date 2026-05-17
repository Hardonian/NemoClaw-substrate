// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach } from "vitest";
import { RemoteEnablementEvaluator } from "./remote-enablement";
import {
  RemoteEnablementPolicy,
  RemoteWorkerProfile,
  RemoteTrustState,
  RemotePolicyState,
  RemoteApprovalState,
  RemoteEnablementReasonCode,
  DEFAULT_REMOTE_ENABLEMENT_POLICY,
} from "./types";

describe("remote enablement evaluator", () => {
  let evaluator: RemoteEnablementEvaluator;

  beforeEach(() => {
    evaluator = new RemoteEnablementEvaluator();
  });

  describe("remote enablement blocked without trust/approval", () => {
    it("should block when remote execution is not enabled", () => {
      const originalEnv = process.env.NEMOCLAW_REMOTE_EXECUTION;
      try {
        delete process.env.NEMOCLAW_REMOTE_EXECUTION;

        const snapshot = evaluator.evaluateEligibility(
          "worker-1",
          "test-run",
          null,
          { verified: false, revoked: false, expired: false, conflicted: false, trustLevel: "low" },
          { policyId: "test-policy", compliant: true, violations: [], expired: false },
          { required: false, granted: true, denied: false },
        );

        expect(snapshot.eligible).toBe(false);
        expect(snapshot.blockingReasons).toContain(RemoteEnablementReasonCode.REMOTE_BLOCKED_NOT_ENABLED);
      } finally {
        if (originalEnv !== undefined) {
          process.env.NEMOCLAW_REMOTE_EXECUTION = originalEnv;
        }
      }
    });

    it("should block when trust is not verified", () => {
      const originalEnv = process.env.NEMOCLAW_REMOTE_EXECUTION;
      try {
        process.env.NEMOCLAW_REMOTE_EXECUTION = "1";

        const snapshot = evaluator.evaluateEligibility(
          "worker-1",
          "test-run",
          null,
          { verified: false, revoked: false, expired: false, conflicted: false, trustLevel: "low" },
          { policyId: "test-policy", compliant: true, violations: [], expired: false },
          { required: false, granted: true, denied: false },
        );

        expect(snapshot.eligible).toBe(false);
        expect(snapshot.blockingReasons).toContain(RemoteEnablementReasonCode.REMOTE_BLOCKED_NO_TRUST);
      } finally {
        if (originalEnv !== undefined) {
          process.env.NEMOCLAW_REMOTE_EXECUTION = originalEnv;
        }
      }
    });

    it("should block when approval is required but not granted", () => {
      const originalEnv = process.env.NEMOCLAW_REMOTE_EXECUTION;
      try {
        process.env.NEMOCLAW_REMOTE_EXECUTION = "1";

        const policy: RemoteEnablementPolicy = {
          ...DEFAULT_REMOTE_ENABLEMENT_POLICY,
          enabled: true,
          requireTrust: false,
        };
        evaluator.updatePolicy(policy);

        const snapshot = evaluator.evaluateEligibility(
          "worker-1",
          "test-run",
          null,
          { verified: false, revoked: false, expired: false, conflicted: false, trustLevel: "low" },
          { policyId: "test-policy", compliant: true, violations: [], expired: false },
          { required: true, granted: false, denied: false },
        );

        expect(snapshot.eligible).toBe(false);
        expect(snapshot.blockingReasons).toContain(RemoteEnablementReasonCode.REMOTE_BLOCKED_NO_APPROVAL);
      } finally {
        if (originalEnv !== undefined) {
          process.env.NEMOCLAW_REMOTE_EXECUTION = originalEnv;
        }
      }
    });

    it("should block when trust is revoked", () => {
      const originalEnv = process.env.NEMOCLAW_REMOTE_EXECUTION;
      try {
        process.env.NEMOCLAW_REMOTE_EXECUTION = "1";

        const policy: RemoteEnablementPolicy = {
          ...DEFAULT_REMOTE_ENABLEMENT_POLICY,
          enabled: true,
          requireProfile: false,
        };
        evaluator.updatePolicy(policy);

        const snapshot = evaluator.evaluateEligibility(
          "worker-1",
          "test-run",
          null,
          { verified: true, revoked: true, revokedReason: "Security concern", expired: false, conflicted: false, trustLevel: "high" },
          { policyId: "test-policy", compliant: true, violations: [], expired: false },
          { required: false, granted: true, denied: false },
        );

        expect(snapshot.eligible).toBe(false);
        expect(snapshot.blockingReasons).toContain(RemoteEnablementReasonCode.TRUST_REVOKED);
      } finally {
        if (originalEnv !== undefined) {
          process.env.NEMOCLAW_REMOTE_EXECUTION = originalEnv;
        }
      }
    });

    it("should block when trust is expired", () => {
      const originalEnv = process.env.NEMOCLAW_REMOTE_EXECUTION;
      try {
        process.env.NEMOCLAW_REMOTE_EXECUTION = "1";

        const policy: RemoteEnablementPolicy = {
          ...DEFAULT_REMOTE_ENABLEMENT_POLICY,
          enabled: true,
          requireProfile: false,
        };
        evaluator.updatePolicy(policy);

        const snapshot = evaluator.evaluateEligibility(
          "worker-1",
          "test-run",
          null,
          { verified: true, revoked: false, expired: true, conflicted: false, trustLevel: "high" },
          { policyId: "test-policy", compliant: true, violations: [], expired: false },
          { required: false, granted: true, denied: false },
        );

        expect(snapshot.eligible).toBe(false);
        expect(snapshot.blockingReasons).toContain(RemoteEnablementReasonCode.TRUST_EXPIRED);
      } finally {
        if (originalEnv !== undefined) {
          process.env.NEMOCLAW_REMOTE_EXECUTION = originalEnv;
        }
      }
    });

    it("should block when trust is conflicted", () => {
      const originalEnv = process.env.NEMOCLAW_REMOTE_EXECUTION;
      try {
        process.env.NEMOCLAW_REMOTE_EXECUTION = "1";

        const policy: RemoteEnablementPolicy = {
          ...DEFAULT_REMOTE_ENABLEMENT_POLICY,
          enabled: true,
          requireProfile: false,
        };
        evaluator.updatePolicy(policy);

        const snapshot = evaluator.evaluateEligibility(
          "worker-1",
          "test-run",
          null,
          { verified: true, revoked: false, expired: false, conflicted: true, conflictReason: "Multiple trust sources", trustLevel: "high" },
          { policyId: "test-policy", compliant: true, violations: [], expired: false },
          { required: false, granted: true, denied: false },
        );

        expect(snapshot.eligible).toBe(false);
        expect(snapshot.blockingReasons).toContain(RemoteEnablementReasonCode.REMOTE_BLOCKED_CONFLICTED);
      } finally {
        if (originalEnv !== undefined) {
          process.env.NEMOCLAW_REMOTE_EXECUTION = originalEnv;
        }
      }
    });
  });

  describe("decision making", () => {
    it("should produce blocked decision for ineligible worker", () => {
      const snapshot = evaluator.evaluateEligibility(
        "worker-1",
        "test-run",
        null,
        { verified: false, revoked: false, expired: false, conflicted: false, trustLevel: "low" },
        { policyId: "test-policy", compliant: true, violations: [], expired: false },
        { required: false, granted: true, denied: false },
      );

      const decision = evaluator.makeEnablementDecision(snapshot, "test-run");

      expect(decision.enabled).toBe(false);
      expect(decision.diagnostics.length).toBeGreaterThan(0);
    });
  });
});
