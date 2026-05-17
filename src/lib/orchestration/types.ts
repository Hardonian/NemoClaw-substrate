// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Orchestration contract types.
 * All types are designed for deterministic state transitions,
 * operator-visible decisions, and replay-safe execution.
 *
 * Hard rules:
 * - No implicit execution
 * - Every decision emits a receipt/event
 * - State transitions are deterministic
 * - Orchestration is disabled by default (NEMOCLAW_ORCHESTRATION=1 required)
 */

// ============================================================================
// Orchestration enablement
// ============================================================================

export const ORCHESTRATION_ENV_FLAG = "NEMOCLAW_ORCHESTRATION";
export const DAEMON_SCHEDULER_ENV_FLAG = "NEMOCLAW_DAEMON_SCHEDULER";
export const RETRY_POLICY_ENV_FLAG = "NEMOCLAW_RETRY_POLICY";
export const SPECULATIVE_FANOUT_ENV_FLAG = "NEMOCLAW_SPECULATIVE_FANOUT";
export const GPU_AWARE_SCHEDULING_ENV_FLAG = "NEMOCLAW_GPU_AWARE_SCHEDULING";
export const DYNAMO_ADAPTER_ENV_FLAG = "NEMOCLAW_DYNAMO_ADAPTER";
export const REMOTE_EXECUTION_ENV_FLAG = "NEMOCLAW_REMOTE_EXECUTION";

export function isOrchestrationEnabled(): boolean {
  return process.env[ORCHESTRATION_ENV_FLAG] === "1";
}

export function isDaemonSchedulerEnabled(): boolean {
  return process.env[DAEMON_SCHEDULER_ENV_FLAG] === "1";
}

export function isRetryPolicyExplicit(): boolean {
  return process.env[RETRY_POLICY_ENV_FLAG] === "explicit";
}

export function isSpeculativeFanoutEnabled(): boolean {
  return process.env[SPECULATIVE_FANOUT_ENV_FLAG] === "1";
}

export function isGpuAwareSchedulingEnabled(): boolean {
  return process.env[GPU_AWARE_SCHEDULING_ENV_FLAG] === "1";
}

export function isDynamoAdapterEnabled(): boolean {
  return process.env[DYNAMO_ADAPTER_ENV_FLAG] === "1";
}

export function isRemoteExecutionEnabled(): boolean {
  return process.env[REMOTE_EXECUTION_ENV_FLAG] === "1";
}

// ============================================================================
// Orchestration reason codes
// ============================================================================

export enum OrchestrationReasonCode {
  // Plan lifecycle
  PLAN_CREATED = "plan_created",
  PLAN_STARTED = "plan_started",
  PLAN_COMPLETED = "plan_completed",
  PLAN_FAILED = "plan_failed",
  PLAN_CANCELLED = "plan_cancelled",
  PLAN_TIMED_OUT = "plan_timed_out",

  // Step lifecycle
  STEP_CREATED = "step_created",
  STEP_STARTED = "step_started",
  STEP_COMPLETED = "step_completed",
  STEP_FAILED = "step_failed",
  STEP_SKIPPED = "step_skipped",
  STEP_CANCELLED = "step_cancelled",
  STEP_TIMED_OUT = "step_timed_out",

  // Policy gates
  ORCHESTRATION_DISABLED = "orchestration_disabled",
  POLICY_DENIED = "policy_denied",
  POLICY_EXPIRED = "policy_expired",
  POLICY_MISSING = "policy_missing",
  TRUST_INSUFFICIENT = "trust_insufficient",
  TRUST_REVOKED = "trust_revoked",
  APPROVAL_REQUIRED = "approval_required",
  APPROVAL_DENIED = "approval_denied",

  // Daemon scheduler
  DAEMON_NOT_STARTED = "daemon_not_started",
  DAEMON_SHUTDOWN = "daemon_shutdown",
  LEASE_STALE = "lease_stale",
  LEASE_EXPIRED = "lease_expired",
  LEASE_CONFLICT = "lease_conflict",
  LEASE_RENEWED = "lease_renewed",
  LEASE_ACQUIRED = "lease_acquired",
  LEASE_RELEASED = "lease_released",
  HEARTBEAT_MISSED = "heartbeat_missed",
  SCHEDULER_NOT_ENABLED = "scheduler_not_enabled",

  // Retry
  RETRY_ALLOWED = "retry_allowed",
  RETRY_BUDGET_EXHAUSTED = "retry_budget_exhausted",
  RETRY_NOT_RETRYABLE = "retry_not_retryable",
  RETRY_BACKOFF_PENDING = "retry_backoff_pending",
  RETRY_POLICY_DENIED = "retry_policy_denied",

  // Fanout
  FANOUT_STARTED = "fanout_started",
  FANOUT_COMPLETED = "fanout_completed",
  FANOUT_CANCELLED = "fanout_cancelled",
  FANOUT_BUDGET_EXHAUSTED = "fanout_budget_exhausted",
  FANOUT_MAX_CANDIDATES_REACHED = "fanout_max_candidates_reached",
  FANOUT_WINNER_SELECTED = "fanout_winner_selected",
  FANOUT_LOSER_RECORDED = "fanout_loser_recorded",
  FANOUT_POLICY_DENIED = "fanout_policy_denied",
  FANOUT_NOT_ENABLED = "fanout_not_enabled",

  // GPU scheduling
  GPU_AVAILABLE = "gpu_available",
  GPU_UNAVAILABLE = "gpu_unavailable",
  GPU_VRAM_INSUFFICIENT = "gpu_vram_insufficient",
  GPU_THERMAL_THROTTLED = "gpu_thermal_throttled",
  GPU_QUEUE_FULL = "gpu_queue_full",
  GPU_TELEMETRY_UNAVAILABLE = "gpu_telemetry_unavailable",
  GPU_SCORING_DEGRADED = "gpu_scoring_degraded",

  // Dynamo adapter
  DYNAMO_CONNECTED = "dynamo_connected",
  DYNAMO_UNAVAILABLE = "dynamo_unavailable",
  DYNAMO_FAILED = "dynamo_failed",
  DYNAMO_HEALTH_OK = "dynamo_health_ok",
  DYNAMO_HEALTH_DEGRADED = "dynamo_health_degraded",
  DYNAMO_HEALTH_CRITICAL = "dynamo_health_critical",
  DYNAMO_ADAPTER_DISABLED = "dynamo_adapter_disabled",

  // Remote enablement
  REMOTE_ENABLED = "remote_enabled",
  REMOTE_DISABLED = "remote_disabled",
  REMOTE_BLOCKED_NO_PROFILE = "remote_blocked_no_profile",
  REMOTE_BLOCKED_NO_TRUST = "remote_blocked_no_trust",
  REMOTE_BLOCKED_NO_POLICY = "remote_blocked_no_policy",
  REMOTE_BLOCKED_NO_APPROVAL = "remote_blocked_no_approval",
  REMOTE_BLOCKED_REVOKED = "remote_blocked_revoked",
  REMOTE_BLOCKED_EXPIRED = "remote_blocked_expired",
  REMOTE_BLOCKED_CONFLICTED = "remote_blocked_conflicted",

  // Policy learning
  POLICY_PROPOSAL_CREATED = "policy_proposal_created",
  POLICY_PROPOSAL_REVIEWED = "policy_proposal_reviewed",
  POLICY_PROPOSAL_APPROVED = "policy_proposal_approved",
  POLICY_PROPOSAL_REJECTED = "policy_proposal_rejected",
  POLICY_PROPOSAL_ROLLED_BACK = "policy_proposal_rolled_back",

  // General
  VALIDATION_FAILED = "validation_failed",
  INTERNAL_ERROR = "internal_error",
  REPLAY_DRIFT_DETECTED = "replay_drift_detected",
  REPLAY_CONSISTENT = "replay_consistent",
}

// ============================================================================
// Orchestration plan
// ============================================================================

export type PlanStatus =
  | "draft"
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "timed_out";

export interface OrchestrationPlan {
  planId: string;
  name: string;
  description?: string;
  status: PlanStatus;
  steps: OrchestrationStep[];
  policy: OrchestrationPolicy;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  cancelledAt?: string;
  operatorId?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Orchestration run
// ============================================================================

export type RunStatus =
  | "initialized"
  | "planning"
  | "executing"
  | "completed"
  | "failed"
  | "cancelled"
  | "timed_out";

export interface OrchestrationRun {
  runId: string;
  planId: string;
  status: RunStatus;
  currentStepId?: string;
  completedStepIds: string[];
  failedStepIds: string[];
  skippedStepIds: string[];
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  cancelledAt?: string;
  receipts: OrchestrationReceipt[];
  decisions: OrchestrationDecision[];
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Orchestration step
// ============================================================================

export type StepStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed"
  | "skipped"
  | "cancelled"
  | "timed_out";

export interface OrchestrationStep {
  stepId: string;
  planId: string;
  name: string;
  description?: string;
  status: StepStatus;
  dependsOnStepIds: string[];
  payload: Record<string, unknown>;
  policyVersion?: string;
  trustLevel?: string;
  approvalRequired: boolean;
  approvalGranted?: boolean;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  failureReason?: OrchestrationReasonCode;
  failureMessage?: string;
  retryCount: number;
  maxRetries: number;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Orchestration decision
// ============================================================================

export interface OrchestrationDecision {
  decisionId: string;
  runId: string;
  stepId?: string;
  planId: string;
  allowed: boolean;
  reasonCode: OrchestrationReasonCode;
  message: string;
  decidedAt: string;
  decidedBy?: string;
  policyVersion?: string;
  trustLevel?: string;
  approvalRequired: boolean;
  approvalGranted?: boolean;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Orchestration policy
// ============================================================================

export interface OrchestrationPolicy {
  policyId: string;
  name: string;
  version: string;
  enabled: boolean;
  maxConcurrentSteps: number;
  maxPlanDurationMs: number;
  maxStepDurationMs: number;
  requiresApproval: boolean;
  minimumTrustLevel: string;
  retryBudget?: RetryBudgetRef;
  fanoutPolicy?: FanoutPolicyRef;
  gpuPolicy?: GpuSchedulingPolicyRef;
  remoteEnablementPolicy?: RemoteEnablementPolicyRef;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}

export interface RetryBudgetRef {
  budgetId: string;
  maxRetriesPerStep: number;
  maxTotalRetries: number;
}

export interface FanoutPolicyRef {
  policyId: string;
  maxCandidates: number;
}

export interface GpuSchedulingPolicyRef {
  policyId: string;
  requireGpu: boolean;
  minVramMb: number;
}

export interface RemoteEnablementPolicyRef {
  policyId: string;
  requireProfile: boolean;
  requireTrust: boolean;
  requireApproval: boolean;
}

// ============================================================================
// Orchestration receipt
// ============================================================================

export enum ReceiptType {
  PLAN_CREATED = "plan_created",
  PLAN_STARTED = "plan_started",
  PLAN_COMPLETED = "plan_completed",
  PLAN_FAILED = "plan_failed",
  PLAN_CANCELLED = "plan_cancelled",
  PLAN_TIMED_OUT = "plan_timed_out",
  STEP_CREATED = "step_created",
  STEP_STARTED = "step_started",
  STEP_COMPLETED = "step_completed",
  STEP_FAILED = "step_failed",
  STEP_SKIPPED = "step_skipped",
  STEP_CANCELLED = "step_cancelled",
  STEP_TIMED_OUT = "step_timed_out",
  DECISION_ALLOWED = "decision_allowed",
  DECISION_BLOCKED = "decision_blocked",
  RETRY_ATTEMPT = "retry_attempt",
  FANOUT_STARTED = "fanout_started",
  FANOUT_COMPLETED = "fanout_completed",
  FANOUT_CANCELLED = "fanout_cancelled",
  FANOUT_WINNER = "fanout_winner",
  FANOUT_LOSER = "fanout_loser",
  GPU_SCORED = "gpu_scored",
  DYNAMO_HEALTH = "dynamo_health",
  REMOTE_ENABLED = "remote_enabled",
  REMOTE_BLOCKED = "remote_blocked",
  POLICY_PROPOSAL = "policy_proposal",
  REPLAY_DRIFT = "replay_drift",
}

export interface OrchestrationReceipt {
  receiptId: string;
  type: ReceiptType;
  runId: string;
  planId: string;
  stepId?: string;
  timestamp: string;
  reasonCode: OrchestrationReasonCode;
  data: Record<string, unknown>;
  correlationId?: string;
  signature?: string;
}

// ============================================================================
// Orchestration replay reference
// ============================================================================

export interface OrchestrationReplayReference {
  replayId: string;
  originalRunId: string;
  originalPlanId: string;
  replayedAt: string;
  originalReceipts: string[];
  replayedReceipts: string[];
  driftDetected: boolean;
  driftDetails: ReplayDriftDetail[];
  consistent: boolean;
}

export interface ReplayDriftDetail {
  receiptId: string;
  expectedReasonCode: OrchestrationReasonCode;
  actualReasonCode: OrchestrationReasonCode;
  expectedData: Record<string, unknown>;
  actualData: Record<string, unknown>;
  description: string;
}

// ============================================================================
// Validation
// ============================================================================

export function validateOrchestrationPlan(
  plan: Partial<OrchestrationPlan>,
): string[] {
  const errors: string[] = [];

  if (!plan.planId) {
    errors.push("planId is required");
  }
  if (!plan.name) {
    errors.push("name is required");
  }
  if (!plan.status) {
    errors.push("status is required");
  }
  if (!Array.isArray(plan.steps)) {
    errors.push("steps must be an array");
  }
  if (!plan.policy) {
    errors.push("policy is required");
  }
  if (!plan.createdAt) {
    errors.push("createdAt is required");
  }

  return errors;
}

export function validateOrchestrationStep(
  step: Partial<OrchestrationStep>,
): string[] {
  const errors: string[] = [];

  if (!step.stepId) {
    errors.push("stepId is required");
  }
  if (!step.planId) {
    errors.push("planId is required");
  }
  if (!step.name) {
    errors.push("name is required");
  }
  if (!step.status) {
    errors.push("status is required");
  }
  if (!step.payload || typeof step.payload !== "object") {
    errors.push("payload is required");
  }
  if (typeof step.retryCount !== "number") {
    errors.push("retryCount must be a number");
  }
  if (typeof step.maxRetries !== "number") {
    errors.push("maxRetries must be a number");
  }

  return errors;
}

export function validateOrchestrationReceipt(
  receipt: Partial<OrchestrationReceipt>,
): string[] {
  const errors: string[] = [];

  if (!receipt.receiptId) {
    errors.push("receiptId is required");
  }
  if (!receipt.type) {
    errors.push("type is required");
  }
  if (!receipt.runId) {
    errors.push("runId is required");
  }
  if (!receipt.planId) {
    errors.push("planId is required");
  }
  if (!receipt.timestamp) {
    errors.push("timestamp is required");
  }
  if (!receipt.reasonCode) {
    errors.push("reasonCode is required");
  }

  return errors;
}

export function validateOrchestrationDecision(
  decision: Partial<OrchestrationDecision>,
): string[] {
  const errors: string[] = [];

  if (!decision.decisionId) {
    errors.push("decisionId is required");
  }
  if (!decision.runId) {
    errors.push("runId is required");
  }
  if (!decision.planId) {
    errors.push("planId is required");
  }
  if (typeof decision.allowed !== "boolean") {
    errors.push("allowed must be a boolean");
  }
  if (!decision.reasonCode) {
    errors.push("reasonCode is required");
  }
  if (!decision.message) {
    errors.push("message is required");
  }
  if (!decision.decidedAt) {
    errors.push("decidedAt is required");
  }

  return errors;
}
