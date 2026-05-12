// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  OrchestrationEngine,
  InMemoryPlanStore,
  InMemoryRunStore,
} from "./orchestrator";
import {
  OrchestrationPlan,
  OrchestrationPolicy,
  OrchestrationReasonCode,
  OrchestrationStep,
  ReceiptType,
} from "./types";

const TEST_NOW = "2026-05-11T00:00:00.000Z";

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
    createdAt: TEST_NOW,
    updatedAt: TEST_NOW,
  };
}

function createTestStep(overrides?: Partial<OrchestrationStep>): OrchestrationStep {
  const base: OrchestrationStep = {
    stepId: "step-1",
    planId: "test-plan",
    name: "Test Step",
    status: "pending",
    dependsOnStepIds: [],
    payload: {},
    approvalRequired: false,
    createdAt: TEST_NOW,
    updatedAt: TEST_NOW,
    retryCount: 0,
    maxRetries: 0,
  };
  return { ...base, ...overrides };
}

function createTestPlan(overrides?: Partial<OrchestrationPlan>): OrchestrationPlan {
  const base: OrchestrationPlan = {
    planId: "test-plan",
    name: "Test Plan",
    description: "A test orchestration plan",
    status: "draft",
    steps: [],
    policy: createTestPolicy(),
    createdAt: TEST_NOW,
    updatedAt: TEST_NOW,
  };
  return { ...base, ...overrides };
}

describe("orchestration engine", () => {
  let engine: OrchestrationEngine;
  let planStore: InMemoryPlanStore;
  let runStore: InMemoryRunStore;
  let originalOrchestrationEnv: string | undefined;

  beforeEach(() => {
    originalOrchestrationEnv = process.env.NEMOCLAW_ORCHESTRATION;
    planStore = new InMemoryPlanStore();
    runStore = new InMemoryRunStore();
    engine = new OrchestrationEngine(planStore, runStore, { now: () => TEST_NOW });
  });

  afterEach(() => {
    if (originalOrchestrationEnv === undefined) {
      delete process.env.NEMOCLAW_ORCHESTRATION;
    } else {
      process.env.NEMOCLAW_ORCHESTRATION = originalOrchestrationEnv;
    }
  });

  describe("orchestration disabled by default", () => {
    it("should reject plan creation when orchestration is disabled", () => {
      delete process.env.NEMOCLAW_ORCHESTRATION;

      const plan = createTestPlan();
      const decision = engine.createPlan(plan);

      expect(decision.allowed).toBe(false);
      expect(decision.reasonCode).toBe(OrchestrationReasonCode.ORCHESTRATION_DISABLED);
    });

    it("should allow plan creation when orchestration is enabled", () => {
      process.env.NEMOCLAW_ORCHESTRATION = "1";

      const plan = createTestPlan();
      const decision = engine.createPlan(plan);

      expect(decision.allowed).toBe(true);
      expect(decision.reasonCode).toBe(OrchestrationReasonCode.PLAN_CREATED);
    });

    it("fail-closes every mutating path when orchestration is disabled", () => {
      delete process.env.NEMOCLAW_ORCHESTRATION;
      const plan = createTestPlan();
      planStore.set(plan);

      expect(engine.startPlan("test-plan", "test-run").reasonCode).toBe(OrchestrationReasonCode.ORCHESTRATION_DISABLED);
      expect(engine.completePlan("test-plan", "test-run").reasonCode).toBe(OrchestrationReasonCode.ORCHESTRATION_DISABLED);
      expect(engine.failPlan("test-plan", "test-run", "nope").reasonCode).toBe(OrchestrationReasonCode.ORCHESTRATION_DISABLED);
      expect(engine.cancelPlan("test-plan", "test-run").reasonCode).toBe(OrchestrationReasonCode.ORCHESTRATION_DISABLED);
      expect(engine.startStep("test-plan", "test-run", createTestStep()).reasonCode).toBe(OrchestrationReasonCode.ORCHESTRATION_DISABLED);
      expect(engine.completeStep("test-plan", "test-run", "step-1").reasonCode).toBe(OrchestrationReasonCode.ORCHESTRATION_DISABLED);
      expect(engine.evaluatePolicy("test-plan", "test-run", "step-1", createTestPolicy(), "high", true).reasonCode).toBe(OrchestrationReasonCode.ORCHESTRATION_DISABLED);
      expect(engine.replayPlan("test-run", "replay-run", "test-plan", plan).consistent).toBe(false);
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
      const step = createTestStep();
      const plan = createTestPlan({ steps: [step] });
      engine.createPlan(plan);
      engine.startPlan("test-plan", "test-run");

      const decision = engine.startStep("test-plan", "test-run", step);

      expect(decision.allowed).toBe(true);
      expect(decision.reasonCode).toBe(OrchestrationReasonCode.STEP_STARTED);
      expect(engine.getRun("test-run")?.currentStepId).toBe("step-1");
    });

    it("should complete a step", () => {
      const step = createTestStep();
      const plan = createTestPlan({ steps: [step] });
      engine.createPlan(plan);
      engine.startPlan("test-plan", "test-run");

      engine.startStep("test-plan", "test-run", step);

      const decision = engine.completeStep("test-plan", "test-run", "step-1");

      expect(decision.allowed).toBe(true);
      expect(decision.reasonCode).toBe(OrchestrationReasonCode.STEP_COMPLETED);
      expect(engine.getRun("test-run")?.completedStepIds).toEqual(["step-1"]);
    });

    it("should fail a step with reason code", () => {
      const step = createTestStep();
      const plan = createTestPlan({ steps: [step] });
      engine.createPlan(plan);
      engine.startPlan("test-plan", "test-run");

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
      const step = createTestStep();
      const plan = createTestPlan({ steps: [step] });
      engine.createPlan(plan);
      engine.startPlan("test-plan", "test-run");

      const decision = engine.skipStep("test-plan", "test-run", "step-1", "Not needed");

      expect(decision.allowed).toBe(true);
      expect(decision.reasonCode).toBe(OrchestrationReasonCode.STEP_SKIPPED);
    });

    it("rejects out-of-plan steps and unmet dependencies", () => {
      const step = createTestStep({ dependsOnStepIds: ["setup"] });
      const plan = createTestPlan({ steps: [createTestStep({ stepId: "setup" }), step] });
      engine.createPlan(plan);
      engine.startPlan("test-plan", "test-run");

      expect(engine.startStep("test-plan", "test-run", createTestStep({ stepId: "missing" })).allowed).toBe(false);
      const blocked = engine.startStep("test-plan", "test-run", step);
      expect(blocked.allowed).toBe(false);
      expect(blocked.message).toContain("incomplete dependencies");
    });
  });

  describe("policy evaluation", () => {
    beforeEach(() => {
      process.env.NEMOCLAW_ORCHESTRATION = "1";
    });

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
        expiresAt: "2026-05-10T00:00:00.000Z",
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

    it("uses ranked trust levels instead of lexicographic comparison", () => {
      const policy: OrchestrationPolicy = {
        ...createTestPolicy(),
        minimumTrustLevel: "medium",
      };

      expect(engine.evaluatePolicy("test-plan", "test-run", "step-1", policy, "high", true).allowed).toBe(true);
      expect(engine.evaluatePolicy("test-plan", "test-run", "step-1", policy, "low", true).reasonCode).toBe(OrchestrationReasonCode.TRUST_INSUFFICIENT);
      expect(engine.evaluatePolicy("test-plan", "test-run", "step-1", policy, "unknown", true).reasonCode).toBe(OrchestrationReasonCode.TRUST_INSUFFICIENT);
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

    it("reports drift when replay receipts are missing", () => {
      const plan = createTestPlan();
      engine.createPlan(plan);
      engine.startPlan("test-plan", "test-run");

      const replayRef = engine.replayPlan(
        "test-run",
        "replay-run",
        "test-plan",
        plan,
      );

      expect(replayRef.driftDetected).toBe(true);
      expect(replayRef.consistent).toBe(false);
      expect(replayRef.driftDetails[0]?.description).toContain("Missing replay receipt");
    });

    it("reports consistent only when replay run emits matching receipts", () => {
      const plan = createTestPlan();
      engine.createPlan(plan);
      engine.startPlan("test-plan", "test-run");
      const replayPlan = createTestPlan({ planId: "test-plan-replay" });
      engine.createPlan(replayPlan);
      engine.startPlan("test-plan-replay", "replay-run");

      const replayRef = engine.replayPlan(
        "test-run",
        "replay-run",
        "test-plan",
        replayPlan,
      );

      expect(replayRef.driftDetected).toBe(false);
      expect(replayRef.consistent).toBe(true);
      expect(replayRef.replayedReceipts).toHaveLength(engine.getRun("test-run")?.receipts.length ?? 0);
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
      const step = createTestStep();
      const plan = createTestPlan({ steps: [step] });
      engine.createPlan(plan);
      engine.startPlan("test-plan", "test-run");

      engine.startStep("test-plan", "test-run", step);
      engine.completeStep("test-plan", "test-run", "step-1");

      const receipts = engine.getAllReceipts();
      expect(receipts.some((r) => r.type === ReceiptType.STEP_STARTED)).toBe(true);
      expect(receipts.some((r) => r.type === ReceiptType.STEP_COMPLETED)).toBe(true);
      expect(engine.getRun("test-run")?.receipts.map((r) => r.type)).toContain(ReceiptType.STEP_COMPLETED);
    });

    it("uses deterministic sequence ids instead of random receipt suffixes", () => {
      const plan = createTestPlan();
      engine.createPlan(plan);
      engine.startPlan("test-plan", "test-run");

      const receipts = engine.getAllReceipts();
      expect(receipts[0]?.receiptId).toBe("receipt-test-plan-none-plan_created-plan_created-2026-05-11T00:00:00.000Z-000001");
      expect(receipts[1]?.receiptId).toBe("receipt-test-plan-test-run-plan_started-plan_started-2026-05-11T00:00:00.000Z-000003");
    });
  });
});
