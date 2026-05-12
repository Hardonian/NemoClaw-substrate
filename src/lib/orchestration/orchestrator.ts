// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Orchestration engine implementation.
 *
 * Governs orchestration plans with deterministic state transitions,
 * operator-visible decisions, and receipt-emitting execution.
 *
 * Hard rules:
 * - Orchestration disabled by default (NEMOCLAW_ORCHESTRATION=1 required)
 * - No implicit execution
 * - Every decision emits a receipt/event
 */

import {
  OrchestrationPlan,
  OrchestrationRun,
  OrchestrationStep,
  OrchestrationDecision,
  OrchestrationPolicy,
  OrchestrationReceipt,
  OrchestrationReasonCode,
  OrchestrationReplayReference,
  ReplayDriftDetail,
  StepStatus,
  ReceiptType,
  isOrchestrationEnabled,
  validateOrchestrationPlan,
  validateOrchestrationStep,
} from "./types";

export interface OrchestrationEngineOptions {
  now?: () => string;
}

const TERMINAL_PLAN_STATUSES = new Set<OrchestrationPlan["status"]>([
  "completed",
  "failed",
  "cancelled",
  "timed_out",
]);

const TERMINAL_STEP_STATUSES = new Set<OrchestrationStep["status"]>([
  "completed",
  "failed",
  "skipped",
  "cancelled",
  "timed_out",
]);

function appendUnique(values: string[], value: string): string[] {
  return values.includes(value) ? values : [...values, value];
}

function sanitizeIdPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_.:-]+/g, "_") || "none";
}

// ============================================================================
// Store interfaces
// ============================================================================

export interface OrchestrationPlanStore {
  get(planId: string): OrchestrationPlan | undefined;
  set(plan: OrchestrationPlan): void;
  getAll(): OrchestrationPlan[];
}

export interface OrchestrationRunStore {
  get(runId: string): OrchestrationRun | undefined;
  set(run: OrchestrationRun): void;
  getAll(): OrchestrationRun[];
}

// ============================================================================
// In-memory store implementations
// ============================================================================

export class InMemoryPlanStore implements OrchestrationPlanStore {
  private plans = new Map<string, OrchestrationPlan>();

  get(planId: string): OrchestrationPlan | undefined {
    return this.plans.get(planId);
  }

  set(plan: OrchestrationPlan): void {
    this.plans.set(plan.planId, plan);
  }

  getAll(): OrchestrationPlan[] {
    return Array.from(this.plans.values());
  }
}

export class InMemoryRunStore implements OrchestrationRunStore {
  private runs = new Map<string, OrchestrationRun>();

  get(runId: string): OrchestrationRun | undefined {
    return this.runs.get(runId);
  }

  set(run: OrchestrationRun): void {
    this.runs.set(run.runId, run);
  }

  getAll(): OrchestrationRun[] {
    return Array.from(this.runs.values());
  }
}

// ============================================================================
// Orchestration engine
// ============================================================================

export class OrchestrationEngine {
  private planStore: OrchestrationPlanStore;
  private runStore: OrchestrationRunStore;
  private receipts: OrchestrationReceipt[] = [];
  private decisions: OrchestrationDecision[] = [];
  private sequence = 0;
  private now: () => string;

  constructor(planStore: OrchestrationPlanStore, runStore: OrchestrationRunStore, options: OrchestrationEngineOptions = {}) {
    this.planStore = planStore;
    this.runStore = runStore;
    this.now = options.now ?? (() => new Date().toISOString());
  }

  // --------------------------------------------------------------------------
  // Plan management
  // --------------------------------------------------------------------------

  createPlan(plan: OrchestrationPlan): OrchestrationDecision {
    if (!isOrchestrationEnabled()) {
      return this.makeDecision(
        plan.planId,
        "",
        false,
        OrchestrationReasonCode.ORCHESTRATION_DISABLED,
        "Orchestration is disabled. Set NEMOCLAW_ORCHESTRATION=1 to enable.",
      );
    }

    const errors = validateOrchestrationPlan(plan);
    if (errors.length > 0) {
      return this.makeDecision(
        plan.planId,
        "",
        false,
        OrchestrationReasonCode.VALIDATION_FAILED,
        `Plan validation failed: ${errors.join(", ")}`,
      );
    }

    if (plan.status !== "draft") {
      return this.makeDecision(
        plan.planId,
        "",
        false,
        OrchestrationReasonCode.VALIDATION_FAILED,
        "New plans must be in draft status",
      );
    }

    this.planStore.set(plan);
    this.emitReceipt(plan.planId, "", ReceiptType.PLAN_CREATED, OrchestrationReasonCode.PLAN_CREATED, {
      planName: plan.name,
    });

    return this.makeDecision(
      plan.planId,
      "",
      true,
      OrchestrationReasonCode.PLAN_CREATED,
      "Plan created successfully",
    );
  }

  startPlan(planId: string, runId: string): OrchestrationDecision {
    if (!isOrchestrationEnabled()) {
      return this.makeDecision(
        planId,
        runId,
        false,
        OrchestrationReasonCode.ORCHESTRATION_DISABLED,
        "Orchestration is disabled",
      );
    }

    const plan = this.planStore.get(planId);
    if (!plan) {
      return this.makeDecision(
        planId,
        runId,
        false,
        OrchestrationReasonCode.VALIDATION_FAILED,
        `Plan ${planId} not found`,
      );
    }

    if (plan.status !== "draft" && plan.status !== "pending") {
      return this.makeDecision(
        planId,
        runId,
        false,
        OrchestrationReasonCode.VALIDATION_FAILED,
        `Cannot start plan in ${plan.status} status`,
      );
    }

    const now = this.now();
    const updatedPlan: OrchestrationPlan = {
      ...plan,
      status: "running",
      startedAt: now,
      updatedAt: now,
    };
    this.planStore.set(updatedPlan);

    const run: OrchestrationRun = {
      runId,
      planId,
      status: "executing",
      currentStepId: undefined,
      completedStepIds: [],
      failedStepIds: [],
      skippedStepIds: [],
      startedAt: now,
      receipts: [],
      decisions: [],
    };
    this.runStore.set(run);

    this.emitReceipt(planId, runId, ReceiptType.PLAN_STARTED, OrchestrationReasonCode.PLAN_STARTED, {
      planName: plan.name,
    });

    return this.makeDecision(
      planId,
      runId,
      true,
      OrchestrationReasonCode.PLAN_STARTED,
      "Plan started successfully",
    );
  }

  completePlan(planId: string, runId: string): OrchestrationDecision {
    if (!isOrchestrationEnabled()) {
      return this.makeDecision(
        planId,
        runId,
        false,
        OrchestrationReasonCode.ORCHESTRATION_DISABLED,
        "Orchestration is disabled",
      );
    }

    const plan = this.planStore.get(planId);
    if (!plan) {
      return this.makeDecision(
        planId,
        runId,
        false,
        OrchestrationReasonCode.VALIDATION_FAILED,
        `Plan ${planId} not found`,
      );
    }

    if (plan.status !== "running") {
      return this.makeDecision(
        planId,
        runId,
        false,
        OrchestrationReasonCode.VALIDATION_FAILED,
        `Cannot complete plan in ${plan.status} status`,
      );
    }

    const incompleteSteps = plan.steps.filter((step) => !["completed", "skipped"].includes(step.status));
    if (incompleteSteps.length > 0) {
      return this.makeDecision(
        planId,
        runId,
        false,
        OrchestrationReasonCode.VALIDATION_FAILED,
        `Cannot complete plan with unfinished steps: ${incompleteSteps.map((step) => step.stepId).join(", ")}`,
      );
    }

    const now = this.now();
    this.planStore.set({
      ...plan,
      status: "completed",
      completedAt: now,
      updatedAt: now,
    });

    const run = this.runStore.get(runId);
    if (run) {
      this.runStore.set({
        ...run,
        status: "completed",
        completedAt: now,
      });
    }

    this.emitReceipt(planId, runId, ReceiptType.PLAN_COMPLETED, OrchestrationReasonCode.PLAN_COMPLETED, {});

    return this.makeDecision(
      planId,
      runId,
      true,
      OrchestrationReasonCode.PLAN_COMPLETED,
      "Plan completed successfully",
    );
  }

  failPlan(planId: string, runId: string, reason: string): OrchestrationDecision {
    if (!isOrchestrationEnabled()) {
      return this.makeDecision(
        planId,
        runId,
        false,
        OrchestrationReasonCode.ORCHESTRATION_DISABLED,
        "Orchestration is disabled",
      );
    }

    const plan = this.planStore.get(planId);
    if (!plan) {
      return this.makeDecision(
        planId,
        runId,
        false,
        OrchestrationReasonCode.VALIDATION_FAILED,
        `Plan ${planId} not found`,
      );
    }

    if (TERMINAL_PLAN_STATUSES.has(plan.status)) {
      return this.makeDecision(
        planId,
        runId,
        false,
        OrchestrationReasonCode.VALIDATION_FAILED,
        `Cannot fail terminal plan in ${plan.status} status`,
      );
    }

    const now = this.now();
    this.planStore.set({
      ...plan,
      status: "failed",
      failedAt: now,
      updatedAt: now,
    });

    const run = this.runStore.get(runId);
    if (run) {
      this.runStore.set({
        ...run,
        status: "failed",
        failedAt: now,
      });
    }

    this.emitReceipt(planId, runId, ReceiptType.PLAN_FAILED, OrchestrationReasonCode.PLAN_FAILED, {
      failureReason: reason,
    });

    return this.makeDecision(
      planId,
      runId,
      false,
      OrchestrationReasonCode.PLAN_FAILED,
      reason,
    );
  }

  cancelPlan(planId: string, runId: string): OrchestrationDecision {
    if (!isOrchestrationEnabled()) {
      return this.makeDecision(
        planId,
        runId,
        false,
        OrchestrationReasonCode.ORCHESTRATION_DISABLED,
        "Orchestration is disabled",
      );
    }

    const plan = this.planStore.get(planId);
    if (!plan) {
      return this.makeDecision(
        planId,
        runId,
        false,
        OrchestrationReasonCode.VALIDATION_FAILED,
        `Plan ${planId} not found`,
      );
    }

    if (TERMINAL_PLAN_STATUSES.has(plan.status)) {
      return this.makeDecision(
        planId,
        runId,
        false,
        OrchestrationReasonCode.VALIDATION_FAILED,
        `Cannot cancel terminal plan in ${plan.status} status`,
      );
    }

    const now = this.now();
    this.planStore.set({
      ...plan,
      status: "cancelled",
      cancelledAt: now,
      updatedAt: now,
    });

    const run = this.runStore.get(runId);
    if (run) {
      this.runStore.set({
        ...run,
        status: "cancelled",
        cancelledAt: now,
      });
    }

    this.emitReceipt(planId, runId, ReceiptType.PLAN_CANCELLED, OrchestrationReasonCode.PLAN_CANCELLED, {});

    return this.makeDecision(
      planId,
      runId,
      true,
      OrchestrationReasonCode.PLAN_CANCELLED,
      "Plan cancelled",
    );
  }

  // --------------------------------------------------------------------------
  // Step management
  // --------------------------------------------------------------------------

  startStep(planId: string, runId: string, step: OrchestrationStep): OrchestrationDecision {
    if (!isOrchestrationEnabled()) {
      return this.makeDecision(
        planId,
        runId,
        false,
        OrchestrationReasonCode.ORCHESTRATION_DISABLED,
        "Orchestration is disabled",
      );
    }

    const plan = this.planStore.get(planId);
    if (!plan) {
      return this.makeDecision(
        planId,
        runId,
        false,
        OrchestrationReasonCode.VALIDATION_FAILED,
        `Plan ${planId} not found`,
      );
    }

    const run = this.runStore.get(runId);
    if (!run) {
      return this.makeDecision(
        planId,
        runId,
        false,
        OrchestrationReasonCode.VALIDATION_FAILED,
        `Run ${runId} not found`,
      );
    }

    if (plan.status !== "running" || run.status !== "executing") {
      return this.makeDecision(
        planId,
        runId,
        false,
        OrchestrationReasonCode.VALIDATION_FAILED,
        `Cannot start step unless plan is running and run is executing (plan=${plan.status}, run=${run.status})`,
      );
    }

    const storedStep = plan.steps.find((candidate) => candidate.stepId === step.stepId);
    if (!storedStep) {
      return this.makeDecision(
        planId,
        runId,
        false,
        OrchestrationReasonCode.VALIDATION_FAILED,
        `Step ${step.stepId} is not part of plan ${planId}`,
      );
    }

    if (storedStep.status !== "pending") {
      return this.makeDecision(
        planId,
        runId,
        false,
        OrchestrationReasonCode.VALIDATION_FAILED,
        `Cannot start step ${step.stepId} from ${storedStep.status} status`,
      );
    }

    const incompleteDependencies = storedStep.dependsOnStepIds.filter((dependencyId) => {
      const dependency = plan.steps.find((candidate) => candidate.stepId === dependencyId);
      return dependency?.status !== "completed" && !run.completedStepIds.includes(dependencyId);
    });
    if (incompleteDependencies.length > 0) {
      return this.makeDecision(
        planId,
        runId,
        false,
        OrchestrationReasonCode.VALIDATION_FAILED,
        `Step ${step.stepId} has incomplete dependencies: ${incompleteDependencies.join(", ")}`,
      );
    }

    const errors = validateOrchestrationStep(storedStep);
    if (errors.length > 0) {
      return this.makeDecision(
        planId,
        runId,
        false,
        OrchestrationReasonCode.VALIDATION_FAILED,
        `Step validation failed: ${errors.join(", ")}`,
      );
    }

    const now = this.now();
    const updatedStep: OrchestrationStep = {
      ...storedStep,
      status: "in_progress",
      startedAt: now,
      updatedAt: now,
    };

    const updatedSteps = plan.steps.map((s) => (s.stepId === storedStep.stepId ? updatedStep : s));
    this.planStore.set({ ...plan, steps: updatedSteps, updatedAt: now });
    this.runStore.set({ ...run, currentStepId: storedStep.stepId });

    this.emitReceipt(planId, runId, ReceiptType.STEP_STARTED, OrchestrationReasonCode.STEP_STARTED, {
      stepId: storedStep.stepId,
      stepName: storedStep.name,
    });

    return this.makeDecision(
      planId,
      runId,
      true,
      OrchestrationReasonCode.STEP_STARTED,
      `Step ${storedStep.name} started`,
    );
  }

  completeStep(planId: string, runId: string, stepId: string): OrchestrationDecision {
    if (!isOrchestrationEnabled()) {
      return this.makeDecision(
        planId,
        runId,
        false,
        OrchestrationReasonCode.ORCHESTRATION_DISABLED,
        "Orchestration is disabled",
      );
    }

    const plan = this.planStore.get(planId);
    if (!plan) {
      return this.makeDecision(
        planId,
        runId,
        false,
        OrchestrationReasonCode.VALIDATION_FAILED,
        `Plan ${planId} not found`,
      );
    }

    const step = plan.steps.find((candidate) => candidate.stepId === stepId);
    if (!step) {
      return this.makeDecision(
        planId,
        runId,
        false,
        OrchestrationReasonCode.VALIDATION_FAILED,
        `Step ${stepId} not found in plan ${planId}`,
      );
    }
    if (step.status !== "in_progress") {
      return this.makeDecision(
        planId,
        runId,
        false,
        OrchestrationReasonCode.VALIDATION_FAILED,
        `Cannot complete step ${stepId} from ${step.status} status`,
      );
    }

    const now = this.now();
    const updatedSteps = plan.steps.map((s) => {
      if (s.stepId === stepId) {
        return { ...s, status: "completed" as StepStatus, completedAt: now, updatedAt: now };
      }
      return s;
    });

    this.planStore.set({ ...plan, steps: updatedSteps, updatedAt: now });

    const run = this.runStore.get(runId);
    if (run) {
      this.runStore.set({
        ...run,
        currentStepId: run.currentStepId === stepId ? undefined : run.currentStepId,
        completedStepIds: appendUnique(run.completedStepIds, stepId),
      });
    }

    this.emitReceipt(planId, runId, ReceiptType.STEP_COMPLETED, OrchestrationReasonCode.STEP_COMPLETED, {
      stepId,
    });

    return this.makeDecision(
      planId,
      runId,
      true,
      OrchestrationReasonCode.STEP_COMPLETED,
      "Step completed",
    );
  }

  failStep(
    planId: string,
    runId: string,
    stepId: string,
    reasonCode: OrchestrationReasonCode,
    message: string,
  ): OrchestrationDecision {
    if (!isOrchestrationEnabled()) {
      return this.makeDecision(
        planId,
        runId,
        false,
        OrchestrationReasonCode.ORCHESTRATION_DISABLED,
        "Orchestration is disabled",
      );
    }

    const plan = this.planStore.get(planId);
    if (!plan) {
      return this.makeDecision(
        planId,
        runId,
        false,
        OrchestrationReasonCode.VALIDATION_FAILED,
        `Plan ${planId} not found`,
      );
    }

    const step = plan.steps.find((candidate) => candidate.stepId === stepId);
    if (!step) {
      return this.makeDecision(
        planId,
        runId,
        false,
        OrchestrationReasonCode.VALIDATION_FAILED,
        `Step ${stepId} not found in plan ${planId}`,
      );
    }
    if (step.status !== "in_progress") {
      return this.makeDecision(
        planId,
        runId,
        false,
        OrchestrationReasonCode.VALIDATION_FAILED,
        `Cannot fail step ${stepId} from ${step.status} status`,
      );
    }

    const now = this.now();
    const updatedSteps = plan.steps.map((s) => {
      if (s.stepId === stepId) {
        return {
          ...s,
          status: "failed" as StepStatus,
          failedAt: now,
          updatedAt: now,
          failureReason: reasonCode,
          failureMessage: message,
        };
      }
      return s;
    });

    this.planStore.set({ ...plan, steps: updatedSteps, updatedAt: now });

    const run = this.runStore.get(runId);
    if (run) {
      this.runStore.set({
        ...run,
        currentStepId: run.currentStepId === stepId ? undefined : run.currentStepId,
        failedStepIds: appendUnique(run.failedStepIds, stepId),
      });
    }

    this.emitReceipt(planId, runId, ReceiptType.STEP_FAILED, reasonCode, {
      stepId,
      message,
    });

    return this.makeDecision(planId, runId, false, reasonCode, message);
  }

  skipStep(planId: string, runId: string, stepId: string, reason: string): OrchestrationDecision {
    if (!isOrchestrationEnabled()) {
      return this.makeDecision(
        planId,
        runId,
        false,
        OrchestrationReasonCode.ORCHESTRATION_DISABLED,
        "Orchestration is disabled",
      );
    }

    const plan = this.planStore.get(planId);
    if (!plan) {
      return this.makeDecision(
        planId,
        runId,
        false,
        OrchestrationReasonCode.VALIDATION_FAILED,
        `Plan ${planId} not found`,
      );
    }

    const step = plan.steps.find((candidate) => candidate.stepId === stepId);
    if (!step) {
      return this.makeDecision(
        planId,
        runId,
        false,
        OrchestrationReasonCode.VALIDATION_FAILED,
        `Step ${stepId} not found in plan ${planId}`,
      );
    }
    if (TERMINAL_STEP_STATUSES.has(step.status)) {
      return this.makeDecision(
        planId,
        runId,
        false,
        OrchestrationReasonCode.VALIDATION_FAILED,
        `Cannot skip terminal step ${stepId} in ${step.status} status`,
      );
    }

    const now = this.now();
    const updatedSteps = plan.steps.map((s) => {
      if (s.stepId === stepId) {
        return { ...s, status: "skipped" as StepStatus, updatedAt: now };
      }
      return s;
    });

    this.planStore.set({ ...plan, steps: updatedSteps, updatedAt: now });

    const run = this.runStore.get(runId);
    if (run) {
      this.runStore.set({
        ...run,
        currentStepId: run.currentStepId === stepId ? undefined : run.currentStepId,
        skippedStepIds: appendUnique(run.skippedStepIds, stepId),
      });
    }

    this.emitReceipt(planId, runId, ReceiptType.STEP_SKIPPED, OrchestrationReasonCode.STEP_SKIPPED, {
      stepId,
      reason,
    });

    return this.makeDecision(
      planId,
      runId,
      true,
      OrchestrationReasonCode.STEP_SKIPPED,
      reason,
    );
  }

  // --------------------------------------------------------------------------
  // Replay
  // --------------------------------------------------------------------------

  replayPlan(
    originalRunId: string,
    replayRunId: string,
    originalPlanId: string,
    replayPlan: OrchestrationPlan,
  ): OrchestrationReplayReference {
    if (!isOrchestrationEnabled()) {
      return {
        replayId: replayRunId,
        originalRunId,
        originalPlanId,
        replayedAt: this.now(),
        originalReceipts: [],
        replayedReceipts: [],
        driftDetected: true,
        driftDetails: [
          {
            receiptId: "orchestration-disabled",
            expectedReasonCode: OrchestrationReasonCode.REPLAY_CONSISTENT,
            actualReasonCode: OrchestrationReasonCode.ORCHESTRATION_DISABLED,
            expectedData: {},
            actualData: { replayPlanId: replayPlan.planId },
            description: "Replay validation blocked because orchestration is disabled",
          },
        ],
        consistent: false,
      };
    }

    const originalRun = this.runStore.get(originalRunId);
    if (!originalRun) {
      return {
        replayId: replayRunId,
        originalRunId,
        originalPlanId,
        replayedAt: this.now(),
        originalReceipts: [],
        replayedReceipts: [],
        driftDetected: true,
        driftDetails: [
          {
            receiptId: "missing",
            expectedReasonCode: OrchestrationReasonCode.INTERNAL_ERROR,
            actualReasonCode: OrchestrationReasonCode.INTERNAL_ERROR,
            expectedData: {},
            actualData: {},
            description: `Original run ${originalRunId} not found for replay`,
          },
        ],
        consistent: false,
      };
    }

    const driftDetails: ReplayDriftDetail[] = [];
    const replayReceipts: string[] = [];

    for (const originalReceipt of originalRun.receipts) {
      const matchingReplay = this.receipts.find(
        (r) =>
          r.runId === replayRunId &&
          r.type === originalReceipt.type &&
          r.planId === replayPlan.planId &&
          r.stepId === originalReceipt.stepId,
      );

      if (matchingReplay) {
        replayReceipts.push(matchingReplay.receiptId);
        if (matchingReplay.reasonCode !== originalReceipt.reasonCode) {
          driftDetails.push({
            receiptId: matchingReplay.receiptId,
            expectedReasonCode: originalReceipt.reasonCode,
            actualReasonCode: matchingReplay.reasonCode,
            expectedData: originalReceipt.data,
            actualData: matchingReplay.data,
            description: `Reason code drift: expected ${originalReceipt.reasonCode}, got ${matchingReplay.reasonCode}`,
          });
        }
      } else {
        driftDetails.push({
          receiptId: originalReceipt.receiptId,
          expectedReasonCode: originalReceipt.reasonCode,
          actualReasonCode: OrchestrationReasonCode.INTERNAL_ERROR,
          expectedData: originalReceipt.data,
          actualData: {},
          description: `Missing replay receipt for ${originalReceipt.type}`,
        });
      }
    }

    const driftDetected = driftDetails.length > 0;

    if (driftDetected) {
      this.emitReceipt(originalPlanId, replayRunId, ReceiptType.REPLAY_DRIFT, OrchestrationReasonCode.REPLAY_DRIFT_DETECTED, {
        driftCount: driftDetails.length,
      });
    } else {
      this.emitReceipt(originalPlanId, replayRunId, ReceiptType.REPLAY_DRIFT, OrchestrationReasonCode.REPLAY_CONSISTENT, {});
    }

    return {
      replayId: replayRunId,
      originalRunId,
      originalPlanId,
      replayedAt: this.now(),
      originalReceipts: originalRun.receipts.map((r) => r.receiptId),
      replayedReceipts: replayReceipts,
      driftDetected,
      driftDetails,
      consistent: !driftDetected,
    };
  }

  // --------------------------------------------------------------------------
  // Policy evaluation
  // --------------------------------------------------------------------------

  evaluatePolicy(
    planId: string,
    runId: string,
    stepId: string,
    policy: OrchestrationPolicy,
    trustLevel: string,
    approvalGranted: boolean,
  ): OrchestrationDecision {
    if (!isOrchestrationEnabled()) {
      return this.makeDecision(
        planId,
        runId,
        false,
        OrchestrationReasonCode.ORCHESTRATION_DISABLED,
        "Orchestration is disabled",
      );
    }

    if (!policy.enabled) {
      return this.makeDecision(
        planId,
        runId,
        false,
        OrchestrationReasonCode.POLICY_MISSING,
        "Policy is not enabled",
      );
    }

    if (policy.expiresAt && Date.parse(policy.expiresAt) <= Date.parse(this.now())) {
      return this.makeDecision(
        planId,
        runId,
        false,
        OrchestrationReasonCode.POLICY_EXPIRED,
        "Policy has expired",
      );
    }

    const trustRank = this.trustRank(trustLevel);
    const minimumTrustRank = this.trustRank(policy.minimumTrustLevel);
    if (trustRank === undefined || minimumTrustRank === undefined || trustRank < minimumTrustRank) {
      return this.makeDecision(
        planId,
        runId,
        false,
        OrchestrationReasonCode.TRUST_INSUFFICIENT,
        `Trust level ${trustLevel} is below minimum ${policy.minimumTrustLevel}`,
      );
    }

    if (policy.requiresApproval && !approvalGranted) {
      return this.makeDecision(
        planId,
        runId,
        false,
        OrchestrationReasonCode.APPROVAL_REQUIRED,
        "Approval is required but not granted",
      );
    }

    return this.makeDecision(
      planId,
      runId,
      true,
      OrchestrationReasonCode.PLAN_STARTED,
      "Policy evaluation passed",
    );
  }

  // --------------------------------------------------------------------------
  // Accessors
  // --------------------------------------------------------------------------

  getPlan(planId: string): OrchestrationPlan | undefined {
    return this.planStore.get(planId);
  }

  getRun(runId: string): OrchestrationRun | undefined {
    return this.runStore.get(runId);
  }

  getAllPlans(): OrchestrationPlan[] {
    return this.planStore.getAll();
  }

  getAllRuns(): OrchestrationRun[] {
    return this.runStore.getAll();
  }

  getAllReceipts(): OrchestrationReceipt[] {
    return [...this.receipts];
  }

  getAllDecisions(): OrchestrationDecision[] {
    return [...this.decisions];
  }

  // --------------------------------------------------------------------------
  // Internal helpers
  // --------------------------------------------------------------------------

  private makeDecision(
    planId: string,
    runId: string,
    allowed: boolean,
    reasonCode: OrchestrationReasonCode,
    message: string,
  ): OrchestrationDecision {
    const decidedAt = this.now();
    const decision: OrchestrationDecision = {
      decisionId: this.nextId("decision", planId, runId, reasonCode, decidedAt),
      runId,
      planId,
      allowed,
      reasonCode,
      message,
      decidedAt,
      approvalRequired: false,
    };
    this.decisions.push(decision);
    const run = this.runStore.get(runId);
    if (run) {
      this.runStore.set({ ...run, decisions: [...run.decisions, decision] });
    }
    return decision;
  }

  private emitReceipt(
    planId: string,
    runId: string,
    type: ReceiptType,
    reasonCode: OrchestrationReasonCode,
    data: Record<string, unknown>,
  ): OrchestrationReceipt {
    const timestamp = this.now();
    const receipt: OrchestrationReceipt = {
      receiptId: this.nextId("receipt", planId, runId, type, reasonCode, timestamp),
      type,
      runId,
      planId,
      timestamp,
      reasonCode,
      data,
    };
    this.receipts.push(receipt);
    const run = this.runStore.get(runId);
    if (run) {
      this.runStore.set({ ...run, receipts: [...run.receipts, receipt] });
    }
    return receipt;
  }

  private nextId(prefix: string, ...parts: string[]): string {
    this.sequence += 1;
    return [prefix, ...parts.map(sanitizeIdPart), String(this.sequence).padStart(6, "0")].join("-");
  }

  private trustRank(level: string): number | undefined {
    const ranks: Record<string, number> = {
      none: 0,
      untrusted: 0,
      low: 1,
      medium: 2,
      high: 3,
      trusted: 4,
    };
    return ranks[level.trim().toLowerCase()];
  }
}
