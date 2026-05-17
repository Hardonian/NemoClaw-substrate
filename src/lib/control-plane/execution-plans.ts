// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";

import type { HeterogeneousCandidate } from "./heterogeneous-routing";
import type { PolicyEvaluationResult } from "./governance";
import { deterministicSerialize } from "./serde";
import type { DegradedState, ExecutionReceiptLineage, NodeDescriptor, WorkerAttestationStatus, WorkerTrustLevel } from "./types";

export type ExecutionPlanId = string;
export type ExecutionIntentHash = string;
export type ExecutionApprovalId = string;

export type ExecutionPlanStatus =
  | "created"
  | "approval_required"
  | "approved"
  | "rejected"
  | "revoked"
  | "expired"
  | "authorized"
  | "authorization_denied"
  | "executed"
  | "failed";

export type ExecutionPlanPhase =
  | "intent_recorded"
  | "policy_snapshot_recorded"
  | "trust_snapshot_recorded"
  | "approval_requested"
  | "approval_decided"
  | "authorization_validated"
  | "routing"
  | "execution"
  | "replay_validation"
  | "completed"
  | "failed"
  | "revoked"
  | "expired";

export interface ExecutionIntent {
  requestId: string;
  actor: string;
  action: string;
  command?: string;
  provider?: string;
  model?: string;
  targetNodeId?: string;
  targetEndpoint?: string;
  executionMode: "local" | "remote";
  metadata: Record<string, string>;
}

export interface ExecutionPolicySnapshot {
  version: "1";
  capturedAt: string;
  governedRoutingEnabled: boolean;
  heterogeneousRoutingEnabled: boolean;
  remoteExecutionEnabled: boolean;
  policyDecision: PolicyEvaluationResult["decision"];
  policyAllowed: boolean;
  policyRequiredApproval: boolean;
  policyReasonCode: string;
  policySourceRuleId: string;
  policyMatchedRuleIds: string[];
  fallbackPermitted: boolean;
  trustRequirement: "none" | "operator_approved" | "trusted_remote" | "trusted_local";
  attestationRequirement: "none" | "fresh" | "operator_approved";
  selectedCandidateClass?: "local_provider" | "remote_worker";
  workerTrustLevel?: WorkerTrustLevel;
  workerAttestationStatus?: WorkerAttestationStatus;
  executionMode: "local" | "remote";
  degradedSummary: string[];
}

export interface ExecutionTrustSnapshot {
  version: "1";
  capturedAt: string;
  workerId?: string;
  workerTrustLevel: WorkerTrustLevel | "none";
  workerAttestationStatus: WorkerAttestationStatus | "none";
  workerTrustReasonCodes: string[];
  workerLastAttestedAt?: string;
  trustRequirement: ExecutionPolicySnapshot["trustRequirement"];
  attestationRequirement: ExecutionPolicySnapshot["attestationRequirement"];
  eligibleForRemoteExecution: boolean;
  degradedSummary: string[];
}

export interface ExecutionReplayReference {
  replayReferenceId: string;
  replayVersion: string;
  lineage: string[];
  receiptId?: string;
}

export interface ExecutionApproval {
  approvalId: ExecutionApprovalId;
  planId: ExecutionPlanId;
  state: ExecutionApprovalState;
  decision: ExecutionApprovalDecision;
  actor: string;
  decidedAt: string;
  expiresAt?: string;
  intentHash: ExecutionIntentHash;
  policySnapshotHash: string;
  trustSnapshotHash: string;
  reasonCode: ExecutionAuthorizationReasonCode;
  reason: string;
  scope: {
    executionMode: "local" | "remote";
    targetNodeId?: string;
    action: string;
  };
}

export type ExecutionApprovalState = "requested" | "approved" | "rejected" | "revoked" | "expired";
export type ExecutionApprovalDecision = "pending" | "approved" | "rejected" | "revoked" | "expired";
export type ExecutionAuthorizationState = "granted" | "denied" | "degraded";
export type ExecutionAuthorizationReasonCode =
  | "authorization_granted"
  | "approval_required"
  | "approval_missing"
  | "approval_scope_mismatch"
  | "approval_rejected"
  | "approval_revoked"
  | "approval_expired"
  | "plan_rejected"
  | "plan_revoked"
  | "plan_expired"
  | "policy_denied"
  | "policy_snapshot_mismatch"
  | "trust_snapshot_mismatch"
  | "execution_intent_mismatch"
  | "fallback_permission_mismatch"
  | "candidate_eligibility_mismatch"
  | "worker_trust_revoked"
  | "attestation_conflict"
  | "attestation_expired"
  | "insufficient_trust"
  | "missing_governance_reason_code"
  | "missing_execution_plan_lineage"
  | "missing_approval_lineage"
  | "stale_authorization"
  | "revoked_authorization";

export interface ExecutionAuthorizationResult {
  state: ExecutionAuthorizationState;
  granted: boolean;
  reasonCodes: ExecutionAuthorizationReasonCode[];
  evaluatedAt: string;
  authorizationSource: "execution-plan";
  authorizationLineageId: string;
  degradedStates: DegradedState[];
}

export interface ExecutionAuthorization {
  state: ExecutionAuthorizationState;
  result: ExecutionAuthorizationResult;
}

export interface ExecutionAuthorizationContext {
  nowIso: string;
  plan: ExecutionPlan;
  approval?: ExecutionApproval;
  currentIntent?: ExecutionIntent;
  currentPolicySnapshot?: ExecutionPolicySnapshot;
  currentTrustSnapshot?: ExecutionTrustSnapshot;
  candidate?: HeterogeneousCandidate;
  fallbackPermitted?: boolean;
  requireApproval?: boolean;
}

export interface ExecutionPlanTransition {
  phase: ExecutionPlanPhase;
  status: ExecutionPlanStatus;
  at: string;
  actor: string;
  reasonCode: ExecutionAuthorizationReasonCode | "plan_created" | "phase_transition";
  note: string;
}

export interface ExecutionPlan {
  version: "1";
  planId: ExecutionPlanId;
  status: ExecutionPlanStatus;
  phase: ExecutionPlanPhase;
  intent: ExecutionIntent;
  intentHash: ExecutionIntentHash;
  policySnapshot: ExecutionPolicySnapshot;
  policySnapshotHash: string;
  trustSnapshot: ExecutionTrustSnapshot;
  trustSnapshotHash: string;
  approvals: ExecutionApproval[];
  authorization?: ExecutionAuthorization;
  replayReference: ExecutionReplayReference;
  transitions: ExecutionPlanTransition[];
  createdAt: string;
  updatedAt: string;
}

function stableHash(prefix: string, value: unknown): string {
  return `${prefix}-${createHash("sha256").update(deterministicSerialize(value)).digest("base64url").slice(0, 32)}`;
}

export function hashExecutionIntent(intent: ExecutionIntent): ExecutionIntentHash {
  return stableHash("intent", intent);
}

export function hashExecutionPolicySnapshot(snapshot: ExecutionPolicySnapshot): string {
  return stableHash("policy", snapshot);
}

export function hashExecutionTrustSnapshot(snapshot: ExecutionTrustSnapshot): string {
  return stableHash("trust", snapshot);
}

function degradedSummary(states: DegradedState[] | undefined): string[] {
  return (states ?? []).map((state) => `${state.affectedSubsystem}:${state.reasonCode}`).sort();
}

export function createExecutionPolicySnapshot(input: {
  capturedAt: string;
  governedRoutingEnabled: boolean;
  heterogeneousRoutingEnabled: boolean;
  remoteExecutionEnabled: boolean;
  policy: PolicyEvaluationResult;
  fallbackPermitted: boolean;
  trustRequirement?: ExecutionPolicySnapshot["trustRequirement"];
  attestationRequirement?: ExecutionPolicySnapshot["attestationRequirement"];
  selectedCandidateClass?: ExecutionPolicySnapshot["selectedCandidateClass"];
  workerTrustLevel?: WorkerTrustLevel;
  workerAttestationStatus?: WorkerAttestationStatus;
  executionMode: "local" | "remote";
  degradedStates?: DegradedState[];
}): ExecutionPolicySnapshot {
  return {
    version: "1",
    capturedAt: input.capturedAt,
    governedRoutingEnabled: input.governedRoutingEnabled,
    heterogeneousRoutingEnabled: input.heterogeneousRoutingEnabled,
    remoteExecutionEnabled: input.remoteExecutionEnabled,
    policyDecision: input.policy.decision,
    policyAllowed: input.policy.allowed,
    policyRequiredApproval: input.policy.requiredApproval,
    policyReasonCode: input.policy.reasonCode,
    policySourceRuleId: input.policy.sourceRuleId,
    policyMatchedRuleIds: [...input.policy.matchedRuleIds].sort(),
    fallbackPermitted: input.fallbackPermitted,
    trustRequirement: input.trustRequirement ?? (input.executionMode === "remote" ? "trusted_remote" : "none"),
    attestationRequirement: input.attestationRequirement ?? (input.executionMode === "remote" ? "fresh" : "none"),
    selectedCandidateClass: input.selectedCandidateClass,
    workerTrustLevel: input.workerTrustLevel,
    workerAttestationStatus: input.workerAttestationStatus,
    executionMode: input.executionMode,
    degradedSummary: degradedSummary(input.degradedStates),
  };
}

export function createExecutionTrustSnapshot(input: {
  capturedAt: string;
  node?: NodeDescriptor | null;
  trustRequirement?: ExecutionTrustSnapshot["trustRequirement"];
  attestationRequirement?: ExecutionTrustSnapshot["attestationRequirement"];
  degradedStates?: DegradedState[];
}): ExecutionTrustSnapshot {
  const trustLevel = input.node?.workerTrustLevel ?? (input.node ? "unknown" : "none");
  const attestationStatus = input.node?.workerAttestationStatus ?? (input.node ? "none" : "none");
  const eligible =
    input.node?.health === "healthy" &&
    (trustLevel === "trusted_remote" || trustLevel === "trusted_local") &&
    !["revoked", "expired", "conflict_detected"].includes(attestationStatus);
  return {
    version: "1",
    capturedAt: input.capturedAt,
    workerId: input.node?.nodeId,
    workerTrustLevel: trustLevel,
    workerAttestationStatus: attestationStatus,
    workerTrustReasonCodes: [...(input.node?.workerTrustReasonCodes ?? [])].sort(),
    workerLastAttestedAt: input.node?.workerLastAttestedAt,
    trustRequirement: input.trustRequirement ?? (input.node ? "trusted_remote" : "none"),
    attestationRequirement: input.attestationRequirement ?? (input.node ? "fresh" : "none"),
    eligibleForRemoteExecution: eligible,
    degradedSummary: degradedSummary(input.degradedStates),
  };
}

export function validateExecutionSnapshotIntegrity(input: {
  plan: ExecutionPlan;
  currentIntent?: ExecutionIntent;
  currentPolicySnapshot?: ExecutionPolicySnapshot;
  currentTrustSnapshot?: ExecutionTrustSnapshot;
}): ExecutionAuthorizationReasonCode[] {
  const reasons: ExecutionAuthorizationReasonCode[] = [];
  if (hashExecutionIntent(input.plan.intent) !== input.plan.intentHash) reasons.push("execution_intent_mismatch");
  if (hashExecutionPolicySnapshot(input.plan.policySnapshot) !== input.plan.policySnapshotHash) reasons.push("policy_snapshot_mismatch");
  if (hashExecutionTrustSnapshot(input.plan.trustSnapshot) !== input.plan.trustSnapshotHash) reasons.push("trust_snapshot_mismatch");
  if (input.currentIntent && hashExecutionIntent(input.currentIntent) !== input.plan.intentHash) reasons.push("execution_intent_mismatch");
  if (input.currentPolicySnapshot && hashExecutionPolicySnapshot(input.currentPolicySnapshot) !== input.plan.policySnapshotHash) reasons.push("policy_snapshot_mismatch");
  if (input.currentTrustSnapshot && hashExecutionTrustSnapshot(input.currentTrustSnapshot) !== input.plan.trustSnapshotHash) reasons.push("trust_snapshot_mismatch");
  return [...new Set(reasons)];
}

export function createExecutionPlan(input: {
  intent: ExecutionIntent;
  policySnapshot: ExecutionPolicySnapshot;
  trustSnapshot: ExecutionTrustSnapshot;
  createdAt: string;
  actor: string;
  replayReference?: Partial<ExecutionReplayReference>;
}): ExecutionPlan {
  const intentHash = hashExecutionIntent(input.intent);
  const policySnapshotHash = hashExecutionPolicySnapshot(input.policySnapshot);
  const trustSnapshotHash = hashExecutionTrustSnapshot(input.trustSnapshot);
  const planId = stableHash("plan", { intentHash, policySnapshotHash, trustSnapshotHash, createdAt: input.createdAt });
  const replayReference = {
    replayReferenceId: input.replayReference?.replayReferenceId ?? stableHash("replay", { planId, intentHash }),
    replayVersion: input.replayReference?.replayVersion ?? "1",
    lineage: input.replayReference?.lineage ?? ["execution-plan", planId],
    receiptId: input.replayReference?.receiptId,
  };
  return {
    version: "1",
    planId,
    status: input.policySnapshot.policyRequiredApproval ? "approval_required" : "created",
    phase: "intent_recorded",
    intent: input.intent,
    intentHash,
    policySnapshot: input.policySnapshot,
    policySnapshotHash,
    trustSnapshot: input.trustSnapshot,
    trustSnapshotHash,
    approvals: [],
    replayReference,
    transitions: [
      { phase: "intent_recorded", status: input.policySnapshot.policyRequiredApproval ? "approval_required" : "created", at: input.createdAt, actor: input.actor, reasonCode: "plan_created", note: "execution intent recorded" },
      { phase: "policy_snapshot_recorded", status: input.policySnapshot.policyRequiredApproval ? "approval_required" : "created", at: input.createdAt, actor: input.actor, reasonCode: input.policySnapshot.policyRequiredApproval ? "approval_required" : "phase_transition", note: input.policySnapshot.policyReasonCode },
      { phase: "trust_snapshot_recorded", status: input.policySnapshot.policyRequiredApproval ? "approval_required" : "created", at: input.createdAt, actor: input.actor, reasonCode: "phase_transition", note: input.trustSnapshot.workerTrustLevel },
    ],
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  };
}

export function transitionExecutionPlan(plan: ExecutionPlan, transition: ExecutionPlanTransition): ExecutionPlan {
  return { ...plan, status: transition.status, phase: transition.phase, transitions: [...plan.transitions, transition], updatedAt: transition.at };
}

export function createExecutionApproval(input: {
  plan: ExecutionPlan;
  actor: string;
  decidedAt: string;
  expiresAt?: string;
  decision?: ExecutionApprovalDecision;
  reason?: string;
}): ExecutionApproval {
  const decision = input.decision ?? "pending";
  const state: ExecutionApprovalState =
    decision === "approved" ? "approved" : decision === "rejected" ? "rejected" : decision === "revoked" ? "revoked" : decision === "expired" ? "expired" : "requested";
  return {
    approvalId: stableHash("approval", { planId: input.plan.planId, actor: input.actor, decidedAt: input.decidedAt, decision }),
    planId: input.plan.planId,
    state,
    decision,
    actor: input.actor,
    decidedAt: input.decidedAt,
    expiresAt: input.expiresAt,
    intentHash: input.plan.intentHash,
    policySnapshotHash: input.plan.policySnapshotHash,
    trustSnapshotHash: input.plan.trustSnapshotHash,
    reasonCode: decision === "approved" ? "authorization_granted" : decision === "rejected" ? "approval_rejected" : decision === "revoked" ? "approval_revoked" : decision === "expired" ? "approval_expired" : "approval_required",
    reason: input.reason ?? decision,
    scope: { executionMode: input.plan.intent.executionMode, targetNodeId: input.plan.intent.targetNodeId, action: input.plan.intent.action },
  };
}

function withApproval(plan: ExecutionPlan, approval: ExecutionApproval, at: string, actor: string, status: ExecutionPlanStatus, phase: ExecutionPlanPhase): ExecutionPlan {
  return transitionExecutionPlan({ ...plan, approvals: [...plan.approvals, approval] }, { phase, status, at, actor, reasonCode: approval.reasonCode, note: approval.reason });
}

export function approveExecutionPlan(plan: ExecutionPlan, input: { actor: string; approvedAt: string; expiresAt?: string; reason?: string }): { plan: ExecutionPlan; approval: ExecutionApproval } {
  const approval = createExecutionApproval({ plan, actor: input.actor, decidedAt: input.approvedAt, expiresAt: input.expiresAt, decision: "approved", reason: input.reason ?? "approved" });
  return { plan: withApproval(plan, approval, input.approvedAt, input.actor, "approved", "approval_decided"), approval };
}

export function rejectExecutionPlan(plan: ExecutionPlan, input: { actor: string; rejectedAt: string; reason?: string }): { plan: ExecutionPlan; approval: ExecutionApproval } {
  const approval = createExecutionApproval({ plan, actor: input.actor, decidedAt: input.rejectedAt, decision: "rejected", reason: input.reason ?? "rejected" });
  return { plan: withApproval(plan, approval, input.rejectedAt, input.actor, "rejected", "approval_decided"), approval };
}

export function revokeExecutionApproval(plan: ExecutionPlan, approval: ExecutionApproval, input: { actor: string; revokedAt: string; reason?: string }): { plan: ExecutionPlan; approval: ExecutionApproval } {
  const revoked = { ...approval, state: "revoked" as const, decision: "revoked" as const, decidedAt: input.revokedAt, reasonCode: "approval_revoked" as const, reason: input.reason ?? "revoked" };
  return { plan: withApproval(plan, revoked, input.revokedAt, input.actor, "revoked", "revoked"), approval: revoked };
}

export function expireExecutionApproval(plan: ExecutionPlan, approval: ExecutionApproval, input: { actor: string; expiredAt: string; reason?: string }): { plan: ExecutionPlan; approval: ExecutionApproval } {
  const expired = { ...approval, state: "expired" as const, decision: "expired" as const, decidedAt: input.expiredAt, reasonCode: "approval_expired" as const, reason: input.reason ?? "expired" };
  return { plan: withApproval(plan, expired, input.expiredAt, input.actor, "expired", "expired"), approval: expired };
}

export function validateExecutionApprovalLineage(plan: ExecutionPlan, approval?: ExecutionApproval, nowIso?: string): ExecutionAuthorizationReasonCode[] {
  const reasons: ExecutionAuthorizationReasonCode[] = [];
  if (!approval) {
    if (plan.policySnapshot.policyRequiredApproval) reasons.push("approval_missing");
    return reasons;
  }
  if (approval.planId !== plan.planId || approval.intentHash !== plan.intentHash || approval.policySnapshotHash !== plan.policySnapshotHash || approval.trustSnapshotHash !== plan.trustSnapshotHash) reasons.push("approval_scope_mismatch");
  if (approval.scope.action !== plan.intent.action || approval.scope.executionMode !== plan.intent.executionMode || approval.scope.targetNodeId !== plan.intent.targetNodeId) reasons.push("approval_scope_mismatch");
  if (approval.state === "rejected" || approval.decision === "rejected") reasons.push("approval_rejected");
  if (approval.state === "revoked" || approval.decision === "revoked") reasons.push("approval_revoked");
  if (approval.state === "expired" || approval.decision === "expired") reasons.push("approval_expired");
  if (nowIso && approval.expiresAt && Date.parse(nowIso) > Date.parse(approval.expiresAt)) reasons.push("approval_expired");
  if (plan.policySnapshot.policyRequiredApproval && approval.state !== "approved") reasons.push("approval_required");
  return [...new Set(reasons)];
}

function degraded(nowIso: string, reasonCode: ExecutionAuthorizationReasonCode): DegradedState {
  return { category: "approval_blocked", reason: reasonCode, affectedSubsystem: "execution-authorization", severity: "error", reasonCode: reasonCode === "policy_denied" ? "policy_blocked" : "approval_required", explanation: reasonCode, sourceComponent: "execution-plans", timestamp: nowIso };
}

export function validateExecutionAuthorization(context: ExecutionAuthorizationContext): ExecutionAuthorizationResult {
  const reasons = new Set<ExecutionAuthorizationReasonCode>();
  for (const reason of validateExecutionSnapshotIntegrity(context)) reasons.add(reason);
  for (const reason of validateExecutionApprovalLineage(context.plan, context.approval, context.nowIso)) reasons.add(reason);

  if (context.plan.status === "rejected") reasons.add("plan_rejected");
  if (context.plan.status === "revoked") reasons.add("plan_revoked");
  if (context.plan.status === "expired") reasons.add("plan_expired");
  if (!context.plan.policySnapshot.policyAllowed) reasons.add("policy_denied");
  if ((context.fallbackPermitted ?? context.plan.policySnapshot.fallbackPermitted) !== context.plan.policySnapshot.fallbackPermitted) reasons.add("fallback_permission_mismatch");
  if (context.candidate && context.candidate.status !== "eligible") reasons.add("candidate_eligibility_mismatch");
  if (context.currentTrustSnapshot?.workerTrustLevel === "revoked" || context.plan.trustSnapshot.workerTrustLevel === "revoked") reasons.add("worker_trust_revoked");
  if (context.currentTrustSnapshot?.workerAttestationStatus === "revoked" || context.plan.trustSnapshot.workerAttestationStatus === "revoked") reasons.add("worker_trust_revoked");
  if (context.currentTrustSnapshot?.workerAttestationStatus === "conflict_detected" || context.plan.trustSnapshot.workerAttestationStatus === "conflict_detected") reasons.add("attestation_conflict");
  if (context.currentTrustSnapshot?.workerAttestationStatus === "expired" || context.plan.trustSnapshot.workerAttestationStatus === "expired") reasons.add("attestation_expired");
  if (context.plan.intent.executionMode === "remote" && context.plan.trustSnapshot.trustRequirement !== "none" && !context.plan.trustSnapshot.eligibleForRemoteExecution) reasons.add("insufficient_trust");

  const reasonCodes = [...reasons].sort();
  const granted = reasonCodes.length === 0 || (reasonCodes.length === 1 && reasonCodes[0] === "authorization_granted");
  const finalReasonCodes = granted ? (["authorization_granted"] as ExecutionAuthorizationReasonCode[]) : reasonCodes;
  return {
    state: granted ? "granted" : "denied",
    granted,
    reasonCodes: finalReasonCodes,
    evaluatedAt: context.nowIso,
    authorizationSource: "execution-plan",
    authorizationLineageId: stableHash("auth", { planId: context.plan.planId, approvalId: context.approval?.approvalId, reasonCodes: finalReasonCodes }),
    degradedStates: granted ? [] : finalReasonCodes.map((reason) => degraded(context.nowIso, reason)),
  };
}

export function applyExecutionAuthorization(plan: ExecutionPlan, result: ExecutionAuthorizationResult): ExecutionPlan {
  return transitionExecutionPlan({ ...plan, authorization: { state: result.state, result } }, { phase: "authorization_validated", status: result.granted ? "authorized" : "authorization_denied", at: result.evaluatedAt, actor: "runtime", reasonCode: result.reasonCodes[0] ?? "authorization_granted", note: result.reasonCodes.join(",") });
}

export function executionLineageFromPlan(plan: ExecutionPlan, approval?: ExecutionApproval, authorization?: ExecutionAuthorizationResult): ExecutionReceiptLineage {
  return {
    executionPlanId: plan.planId,
    executionApprovalId: approval?.approvalId,
    executionIntentHash: plan.intentHash,
    executionPolicySnapshotHash: plan.policySnapshotHash,
    executionTrustSnapshotHash: plan.trustSnapshotHash,
    authorizationSource: authorization?.authorizationSource ?? plan.authorization?.result.authorizationSource,
    authorizationLineageId: authorization?.authorizationLineageId ?? plan.authorization?.result.authorizationLineageId,
    replayReferenceId: plan.replayReference.replayReferenceId,
  };
}
