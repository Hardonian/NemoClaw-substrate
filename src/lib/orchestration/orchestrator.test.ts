// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach } from "vitest";
import {
  OrchestrationEngine,
  InMemoryPlanStore,
  InMemoryRunStore,
} from "./orchestrator";
import {
  OrchestrationPlan,
  OrchestrationPolicy,
  OrchestrationReasonCode,
  ReceiptType,
} from "./types";

function createTestPolicy(): OrchestrationPolicy {
  return {
    policyId: "test-policy",
    name: "Test Policy",
    version: "1.0.0",
    enabled: true,
    maxConcurrentSteps: 5,
    maxPlanDurationMs: 300000,
    maxStepDurationMs: 60000,
    requiresApproval: false,
    minimumTrustLevel: "low",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function createTestPlan(overrides?: Partial<OrchestrationPlan>): OrchestrationPlan {
  const base: OrchestrationPlan = {
    planId: "test-plan",
    name: "Test Plan",
    description: "A test orchestration plan",
    status: "draft",
    steps: [],
    policy: createTestPolicy(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return { ...base, ...overrides };
}

describe("orchestration engine", () => {
  let engine: OrchestrationEngine;
  let planStore: InMemoryPlanStore;
  let runStore: InMemoryRunStore;

  beforeEach(() => {
    planStore = new InMemoryPlanStore();
    runStore = new InMemoryRunStore();
    engine = new OrchestrationEngine(planStore, runStore);
  });

  describe("orchestration disabled by default", () => {
    it("should reject plan creation when orchestration is disabled", () => {
      const originalEnv = process.env.NEMOCLAW_ORCHESTRATION;
      try {
        delete process.env.NEMOCLAW_ORCHESTRATION;

        const plan = createTestPlan();
        const decision = engine.createPlan(plan);

        expect(decision.allowed).toBe(false);
        expect(decision.reasonCode).toBe(OrchestrationReasonCode.ORCHESTRATION_DISABLED);
      } finally {
        if (originalEnv !== undefined) {
          process.env.NEMOCLAW_ORCHESTRATION = originalEnv;
        }
      }
    });

    it("should allow plan creation when orchestration is enabled", () => {
      const originalEnv = process.env.NEMOCLAW_ORCHESTRATION;
      try {
        process.env.NEMOCLAW_ORCHESTRATION = "1";

        const plan = createTestPlan();
        const decision = engine.createPlan(plan);

        expect(decision.allowed).toBe(true);
        expect(decision.reasonCode).toBe(OrchestrationReasonCode.PLAN_CREATED);
      } finally {
        if (originalEnv !== undefined) {
          process.env.NEMOCLAW_ORCHESTRATION = originalEnv;
        }
      }
    });
  });

  describe("plan lifecycle", () => {
    beforeEach(() => {
      process.env.NEMOCLAW_ORCHESTRATION = "1";
    });

    it("should create a plan and emit a receipt", () => {
      const plan = createTestPlan();
      const decision = engine.createPlan(plan);

      expect(decision.allowed).toBe(true);
      expect(engine.getPlan("test-plan")).toBeDefined();
      expect(engine.getAllReceipts().length).toBeGreaterThan(0);
    });

    it("should reject plans not in draft status", () => {
      const plan = createTestPlan({ status: "running" });
      const decision = engine.createPlan(plan);

      expect(decision.allowed).toBe(false);
      expect(decision.reasonCode).toBe(OrchestrationReasonCode.VALIDATION_FAILED);
    });

    it("should start a plan and create a run", () => {
      const plan = createTestPlan();
      engine.createPlan(plan);

      const decision = engine.startPlan("test-plan", "test-run");

      expect(decision.allowed).toBe(true);
      expect(engine.getRun("test-run")).toBeDefined();
    });

    it("should complete a plan", () => {
      const plan = createTestPlan();
      engine.createPlan(plan);
      engine.startPlan("test-plan", "test-run");

      const decision = engine.completePlan("test-plan", "test-run");

      expect(decision.allowed).toBe(true);
      expect(decision.reasonCode).toBe(OrchestrationReasonCode.PLAN_COMPLETED);
    });

    it("should fail a plan with a reason", () => {
      const plan = createTestPlan();
      engine.createPlan(plan);
      engine.startPlan("test-plan", "test-run");

      const decision = engine.failPlan("test-plan", "test-run", "Test failure");

      expect(decision.allowed).toBe(false);
      expect(decision.reasonCode).toBe(OrchestrationReasonCode.PLAN_FAILED);
    });

    it("should cancel a plan", () => {
      const plan = createTestPlan();
      engine.createPlan(plan);
      engine.startPlan("test-plan", "test-run");

      const decision = engine.cancelPlan("test-plan", "test-run");

      expect(decision.allowed).toBe(true);
      expect(decision.reasonCode).toBe(OrchestrationReasonCode.PLAN_CANCELLED);
    });
  });

  describe("step lifecycle", () => {
    beforeEach(() => {
      process.env.NEMOCLAW_ORCHESTRATION = "1";
    });

    it("should start a step", () => {
      const plan = createTestPlan();
      engine.createPlan(plan);
      engine.startPlan("test-plan", "test-run");

      const step = {
        stepId: "step-1",
        planId: "test-plan",
        name: "Test Step",
        status: "pending",
        dependsOnStepIds: [],
        payload: {},
        approvalRequired: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        retryCount: 0,
        maxRetries: 0,
      };

      const decision = engine.startStep("test-plan", "test-run", step);

      expect(decision.allowed).toBe(true);
      expect(decision.reasonCode).toBe(OrchestrationReasonCode.STEP_STARTED);
    });

    it("should complete a step", () => {
      const plan = createTestPlan();
      engine.createPlan(plan);
      engine.startPlan("test-plan", "test-run");

      const step = {
        stepId: "step-1",
        planId: "test-plan",
        name: "Test Step",
        status: "in_progress",
        dependsOnStepIds: [],
        payload: {},
        approvalRequired: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        retryCount: 0,
        maxRetries: 0,
      };
      engine.startStep("test-plan", "test-run", step);

      const decision = engine.completeStep("test-plan", "test-run", "step-1");

      expect(decision.allowed).toBe(true);
      expect(decision.reasonCode).toBe(OrchestrationReasonCode.STEP_COMPLETED);
    });

    it("should fail a step with reason code", () => {
      const plan = createTestPlan();
      engine.createPlan(plan);
      engine.startPlan("test-plan", "test-run");

      const step = {
        stepId: "step-1",
        planId: "test-plan",
        name: "Test Step",
        status: "in_progress",
        dependsOnStepIds: [],
        payload: {},
        approvalRequired: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        retryCount: 0,
        maxRetries: 0,
      };
      engine.startStep("test-plan", "test-run", step);

      const decision = engine.failStep(
        "test-plan",
        "test-run",
        "step-1",
        OrchestrationReasonCode.POLICY_DENIED,
        "Policy denied",
      );

      expect(decision.allowed).toBe(false);
      expect(decision.reasonCode).toBe(OrchestrationReasonCode.POLICY_DENIED);
    });

    it("should skip a step with reason", () => {
      const plan = createTestPlan();
      engine.createPlan(plan);
      engine.startPlan("test-plan", "test-run");

      const step = {
        stepId: "step-1",
        planId: "test-plan",
        name: "Test Step",
        status: "pending",
        dependsOnStepIds: [],
        payload: {},
        approvalRequired: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        retryCount: 0,
        maxRetries: 0,
      };
      engine.startStep("test-plan", "test-run", step);

      const decision = engine.skipStep("test-plan", "test-run", "step-1", "Not needed");

      expect(decision.allowed).toBe(true);
      expect(decision.reasonCode).toBe(OrchestrationReasonCode.STEP_SKIPPED);
    });
  });

  describe("policy evaluation", () => {
    it("should reject when policy is not enabled", () => {
      const policy: OrchestrationPolicy = {
        ...createTestPolicy(),
        enabled: false,
      };

      const decision = engine.evaluatePolicy(
        "test-plan",
        "test-run",
        "step-1",
        policy,
        "high",
        true,
      );

      expect(decision.allowed).toBe(false);
      expect(decision.reasonCode).toBe(OrchestrationReasonCode.POLICY_MISSING);
    });

    it("should reject when policy has expired", () => {
      const policy: OrchestrationPolicy = {
        ...createTestPolicy(),
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      };

      const decision = engine.evaluatePolicy(
        "test-plan",
        "test-run",
        "step-1",
        policy,
        "high",
        true,
      );

      expect(decision.allowed).toBe(false);
      expect(decision.reasonCode).toBe(OrchestrationReasonCode.POLICY_EXPIRED);
    });

    it("should reject when trust is insufficient", () => {
      const policy: OrchestrationPolicy = {
        ...createTestPolicy(),
        minimumTrustLevel: "high",
      };

      const decision = engine.evaluatePolicy(
        "test-plan",
        "test-run",
        "step-1",
        policy,
        "low",
        true,
      );

      expect(decision.allowed).toBe(false);
      expect(decision.reasonCode).toBe(OrchestrationReasonCode.TRUST_INSUFFICIENT);
    });

    it("should reject when approval is required but not granted", () => {
      const policy: OrchestrationPolicy = {
        ...createTestPolicy(),
        requiresApproval: true,
      };

      const decision = engine.evaluatePolicy(
        "test-plan",
        "test-run",
        "step-1",
        policy,
        "high",
        false,
      );

      expect(decision.allowed).toBe(false);
      expect(decision.reasonCode).toBe(OrchestrationReasonCode.APPROVAL_REQUIRED);
    });

    it("should pass policy evaluation when all gates are met", () => {
      const policy = createTestPolicy();

      const decision = engine.evaluatePolicy(
        "test-plan",
        "test-run",
        "step-1",
        policy,
        "high",
        true,
      );

      expect(decision.allowed).toBe(true);
    });
  });

  describe("replay detection", () => {
    beforeEach(() => {
      process.env.NEMOCLAW_ORCHESTRATION = "1";
    });

    it("should detect missing original run as drift", () => {
      const plan = createTestPlan();
      engine.createPlan(plan);

      const replayRef = engine.replayPlan(
        "missing-run",
        "replay-run",
        "test-plan",
        plan,
      );

      expect(replayRef.driftDetected).toBe(true);
      expect(replayRef.consistent).toBe(false);
    });

    it("should report consistent when no drift detected", () => {
      const plan = createTestPlan();
      engine.createPlan(plan);
      engine.startPlan("test-plan", "test-run");

      const replayRef = engine.replayPlan(
        "test-run",
        "replay-run",
        "test-plan",
        plan,
      );

      expect(replayRef.driftDetected).toBe(false);
      expect(replayRef.consistent).toBe(true);
    });
  });

  describe("receipt emission", () => {
    beforeEach(() => {
      process.env.NEMOCLAW_ORCHESTRATION = "1";
    });

    it("should emit receipts for plan lifecycle events", () => {
      const plan = createTestPlan();
      engine.createPlan(plan);
      engine.startPlan("test-plan", "test-run");
      engine.completePlan("test-plan", "test-run");

      const receipts = engine.getAllReceipts();
      expect(receipts.length).toBe(3);
      expect(receipts[0].type).toBe(ReceiptType.PLAN_CREATED);
      expect(receipts[1].type).toBe(ReceiptType.PLAN_STARTED);
      expect(receipts[2].type).toBe(ReceiptType.PLAN_COMPLETED);
    });

    it("should emit receipts for step lifecycle events", () => {
      const plan = createTestPlan();
      engine.createPlan(plan);
      engine.startPlan("test-plan", "test-run");

      const step = {
        stepId: "step-1",
        planId: "test-plan",
        name: "Test Step",
        status: "pending",
        dependsOnStepIds: [],
        payload: {},
        approvalRequired: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        retryCount: 0,
        maxRetries: 0,
      };
      engine.startStep("test-plan", "test-run", step);
      engine.completeStep("test-plan", "test-run", "step-1");

      const receipts = engine.getAllReceipts();
      expect(receipts.some((r) => r.type === ReceiptType.STEP_STARTED)).toBe(true);
      expect(receipts.some((r) => r.type === ReceiptType.STEP_COMPLETED)).toBe(true);
    });
  });
});
