// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";
import { deterministicSerialize } from "./serde";
import type { IntentContract, OperatorAuthority, EscalationBoundary } from "./intent-contract";
import type { GovernanceIncident } from "./institutional-memory";

export type EscalationBundleId = string;
export type OperatorTakeoverEnvelopeId = string;
export type AdjudicationQueueId = string;
export type ReviewContractId = string;
export type ExecutionPauseResumeId = string;
export type ApprovalStageId = string;
export type ConfidenceEscalationId = string;

export type EscalationLevel = "info" | "advisory" | "required" | "mandatory" | "critical";
export type EscalationState = "pending" | "assigned" | "in_progress" | "resolved" | "rejected" | "expired" | "escalated";
export type TakeoverState = "initiated" | "in_progress" | "completed" | "abandoned" | "failed";
export type AdjudicationQueueState = "active" | "paused" | "drained" | "closed";
export type ReviewContractState = "draft" | "active" | "completed" | "rejected" | "revoked";
export type PauseState = "paused" | "resumed" | "expired" | "overridden";
export type ApprovalStageState = "pending" | "approved" | "rejected" | "skipped" | "escalated";

export interface EscalationBundle {
  bundleId: EscalationBundleId;
  intentId: string;
  planId?: string;
  createdAt: string;
  updatedAt: string;
  level: EscalationLevel;
  state: EscalationState;
  reason: string;
  reasonCode: string;
  source: string;
  assignedTo?: string;
  evidenceRefs: string[];
  relatedIncidentIds: string[];
  affectedSubsystem: string;
  confidenceScore?: number;
  requiresOperatorTakeover: boolean;
  takeoverDeadline?: string;
  escalationPath: string[];
  currentEscalationStep: number;
  maxEscalationSteps: number;
  metadata: Record<string, string>;
  bundleHash: string;
}

export interface OperatorTakeoverEnvelope {
  envelopeId: OperatorTakeoverEnvelopeId;
  escalationBundleId: EscalationBundleId;
  intentId: string;
  planId?: string;
  initiatedBy: string;
  initiatedAt: string;
  takeoverState: TakeoverState;
  operatorId: string;
  authorityId: string;
  takeoverScope: string[];
  pauseExecution: boolean;
  pauseId?: ExecutionPauseResumeId;
  evidencePackage: string[];
  takeoverReason: string;
  takeoverDeadline?: string;
  completedAt?: string;
  completedBy?: string;
  outcome?: string;
  envelopeHash: string;
}

export interface AdjudicationQueueItem {
  itemId: string;
  intentId: string;
  planId?: string;
  approvalId?: string;
  escalationBundleId?: EscalationBundleId;
  enqueuedAt: string;
  priority: "low" | "normal" | "high" | "critical";
  reason: string;
  reasonCode: string;
  assignedTo?: string;
  dueAt?: string;
  evidenceRefs: string[];
  metadata: Record<string, string>;
}

export interface AdjudicationQueue {
  queueId: AdjudicationQueueId;
  state: AdjudicationQueueState;
  items: AdjudicationQueueItem[];
  createdAt: string;
  updatedAt: string;
  processedCount: number;
  rejectedCount: number;
  escalatedCount: number;
  queueHash: string;
}

export interface ReviewContract {
  contractId: ReviewContractId;
  intentId: string;
  planId?: string;
  reviewerId: string;
  reviewType: "pre_execution" | "post_execution" | "exception" | "override" | "escalation";
  state: ReviewContractState;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  reviewCriteria: string[];
  findings?: string[];
  recommendation?: string;
  decision?: "approved" | "rejected" | "conditional";
  conditions?: string[];
  evidenceRefs: string[];
  relatedEscalationBundleId?: EscalationBundleId;
  contractHash: string;
}

export interface ExecutionPauseResume {
  pauseId: ExecutionPauseResumeId;
  intentId: string;
  planId?: string;
  pausedAt: string;
  pausedBy: string;
  pauseReason: string;
  pauseReasonCode: string;
  state: PauseState;
  resumedAt?: string;
  resumedBy?: string;
  resumeReason?: string;
  expiresAt?: string;
  expired: boolean;
  overridden: boolean;
  overriddenAt?: string;
  overriddenBy?: string;
  overrideReason?: string;
  evidenceRefs: string[];
  pauseHash: string;
}

export interface ApprovalStage {
  stageId: ApprovalStageId;
  intentId: string;
  planId?: string;
  stageNumber: number;
  stageName: string;
  state: ApprovalStageState;
  requiredApprovers: string[];
  receivedApprovals: string[];
  rejectedBy?: string;
  rejectionReason?: string;
  createdAt: string;
  completedAt?: string;
  expiresAt?: string;
  nextStageId?: ApprovalStageId;
  previousStageId?: ApprovalStageId;
  evidenceRefs: string[];
  stageHash: string;
}

export interface ConfidenceEscalation {
  escalationId: ConfidenceEscalationId;
  intentId: string;
  planId?: string;
  confidenceThreshold: number;
  actualConfidence: number;
  confidenceGap: number;
  triggeredAt: string;
  triggerReason: string;
  escalationLevel: EscalationLevel;
  state: EscalationState;
  assignedTo?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: string;
  evidenceRefs: string[];
  escalationHash: string;
}

export interface EscalationTopology {
  capturedAt: string;
  bundles: EscalationBundle[];
  takeovers: OperatorTakeoverEnvelope[];
  queues: AdjudicationQueue[];
  reviews: ReviewContract[];
  pauses: ExecutionPauseResume[];
  approvalStages: ApprovalStage[];
  confidenceEscalations: ConfidenceEscalation[];
  topologyHash: string;
}

function stableHash(prefix: string, value: unknown): string {
  return `${prefix}-${createHash("sha256").update(deterministicSerialize(value)).digest("base64url").slice(0, 32)}`;
}

export function createEscalationBundle(input: {
  intentId: string;
  planId?: string;
  level: EscalationLevel;
  reason: string;
  reasonCode: string;
  source: string;
  assignedTo?: string;
  evidenceRefs?: string[];
  relatedIncidentIds?: string[];
  affectedSubsystem: string;
  confidenceScore?: number;
  requiresOperatorTakeover?: boolean;
  takeoverDeadline?: string;
  escalationPath?: string[];
  maxEscalationSteps?: number;
  currentEscalationStep?: number;
  metadata?: Record<string, string>;
}): EscalationBundle {
  const now = new Date().toISOString();
  const bundle: Omit<EscalationBundle, "bundleHash"> = {
    bundleId: stableHash("escalation-bundle", { intentId: input.intentId, level: input.level, reasonCode: input.reasonCode }),
    intentId: input.intentId,
    planId: input.planId,
    createdAt: now,
    updatedAt: now,
    level: input.level,
    state: "pending",
    reason: input.reason,
    reasonCode: input.reasonCode,
    source: input.source,
    assignedTo: input.assignedTo,
    evidenceRefs: input.evidenceRefs ?? [],
    relatedIncidentIds: input.relatedIncidentIds ?? [],
    affectedSubsystem: input.affectedSubsystem,
    confidenceScore: input.confidenceScore,
    requiresOperatorTakeover: input.requiresOperatorTakeover ?? false,
    takeoverDeadline: input.takeoverDeadline,
    escalationPath: input.escalationPath ?? [],
    currentEscalationStep: input.currentEscalationStep ?? 1,
    maxEscalationSteps: input.maxEscalationSteps ?? 3,
    metadata: input.metadata ?? {},
  };
  const bundleHash = stableHash("bundle", {
    bundleId: bundle.bundleId,
    level: bundle.level,
    state: bundle.state,
    reasonCode: bundle.reasonCode,
  });
  return { ...bundle, bundleHash };
}

export function updateEscalationBundle(
  bundle: EscalationBundle,
  updates: {
    state?: EscalationState;
    assignedTo?: string;
    evidenceRefs?: string[];
    currentEscalationStep?: number;
  },
): EscalationBundle {
  const updated: EscalationBundle = {
    ...bundle,
    ...updates,
    evidenceRefs: updates.evidenceRefs ?? bundle.evidenceRefs,
    updatedAt: new Date().toISOString(),
    bundleHash: "",
  };
  const bundleHash = stableHash("bundle", {
    bundleId: updated.bundleId,
    level: updated.level,
    state: updated.state,
    reasonCode: updated.reasonCode,
    currentEscalationStep: updated.currentEscalationStep,
  });
  return { ...updated, bundleHash };
}

export function escalateBundle(bundle: EscalationBundle, nextOperator: string, reason: string): EscalationBundle {
  if (bundle.currentEscalationStep >= bundle.maxEscalationSteps) {
    return updateEscalationBundle(bundle, {
      state: "escalated",
      currentEscalationStep: bundle.maxEscalationSteps,
    });
  }
  return updateEscalationBundle(bundle, {
    state: "pending",
    assignedTo: nextOperator,
    currentEscalationStep: bundle.currentEscalationStep + 1,
  });
}

export function createOperatorTakeoverEnvelope(input: {
  escalationBundleId: string;
  intentId: string;
  planId?: string;
  operatorId: string;
  authorityId: string;
  initiatedBy: string;
  takeoverScope: string[];
  pauseExecution?: boolean;
  evidencePackage?: string[];
  takeoverReason: string;
  takeoverDeadline?: string;
}): OperatorTakeoverEnvelope {
  const envelope: Omit<OperatorTakeoverEnvelope, "envelopeHash"> = {
    envelopeId: stableHash("takeover", { escalationBundleId: input.escalationBundleId, operatorId: input.operatorId }),
    escalationBundleId: input.escalationBundleId,
    intentId: input.intentId,
    planId: input.planId,
    initiatedBy: input.initiatedBy,
    initiatedAt: new Date().toISOString(),
    takeoverState: "initiated",
    operatorId: input.operatorId,
    authorityId: input.authorityId,
    takeoverScope: [...input.takeoverScope].sort(),
    pauseExecution: input.pauseExecution ?? true,
    evidencePackage: input.evidencePackage ?? [],
    takeoverReason: input.takeoverReason,
    takeoverDeadline: input.takeoverDeadline,
  };
  const envelopeHash = stableHash("takeover-envelope", {
    envelopeId: envelope.envelopeId,
    operatorId: envelope.operatorId,
    takeoverState: envelope.takeoverState,
  });
  return { ...envelope, envelopeHash };
}

export function completeOperatorTakeover(
  envelope: OperatorTakeoverEnvelope,
  completedBy: string,
  outcome: string,
): OperatorTakeoverEnvelope {
  const updated: OperatorTakeoverEnvelope = {
    ...envelope,
    takeoverState: "completed",
    completedAt: new Date().toISOString(),
    completedBy,
    outcome,
    envelopeHash: "",
  };
  const envelopeHash = stableHash("takeover-envelope", {
    envelopeId: updated.envelopeId,
    takeoverState: updated.takeoverState,
    completedAt: updated.completedAt,
  });
  return { ...updated, envelopeHash };
}

export function createAdjudicationQueue(input?: {
  queueId?: string;
  items?: AdjudicationQueueItem[];
}): AdjudicationQueue {
  const now = new Date().toISOString();
  const queue: Omit<AdjudicationQueue, "queueHash"> = {
    queueId: input?.queueId ?? stableHash("adjudication-queue", { createdAt: now }),
    state: "active",
    items: input?.items ?? [],
    createdAt: now,
    updatedAt: now,
    processedCount: 0,
    rejectedCount: 0,
    escalatedCount: 0,
  };
  const queueHash = stableHash("queue", { queueId: queue.queueId, itemCount: queue.items.length });
  return { ...queue, queueHash };
}

export function enqueueAdjudicationItem(
  queue: AdjudicationQueue,
  item: AdjudicationQueueItem,
): AdjudicationQueue {
  const updated: AdjudicationQueue = {
    ...queue,
    items: [...queue.items, item],
    updatedAt: new Date().toISOString(),
    queueHash: "",
  };
  const queueHash = stableHash("queue", { queueId: updated.queueId, itemCount: updated.items.length });
  return { ...updated, queueHash };
}

export function dequeueAdjudicationItem(
  queue: AdjudicationQueue,
  itemId: string,
): AdjudicationQueue {
  const item = queue.items.find((i) => i.itemId === itemId);
  if (!item) return queue;

  const updated: AdjudicationQueue = {
    ...queue,
    items: queue.items.filter((i) => i.itemId !== itemId),
    processedCount: queue.processedCount + 1,
    updatedAt: new Date().toISOString(),
    queueHash: "",
  };
  const queueHash = stableHash("queue", { queueId: updated.queueId, itemCount: updated.items.length });
  return { ...updated, queueHash };
}

export function createReviewContract(input: {
  intentId: string;
  planId?: string;
  reviewerId: string;
  reviewType: "pre_execution" | "post_execution" | "exception" | "override" | "escalation";
  reviewCriteria: string[];
  evidenceRefs?: string[];
  relatedEscalationBundleId?: string;
}): ReviewContract {
  const now = new Date().toISOString();
  const contract: Omit<ReviewContract, "contractHash"> = {
    contractId: stableHash("review-contract", { intentId: input.intentId, reviewerId: input.reviewerId, reviewType: input.reviewType }),
    intentId: input.intentId,
    planId: input.planId,
    reviewerId: input.reviewerId,
    reviewType: input.reviewType,
    state: "draft",
    createdAt: now,
    updatedAt: now,
    reviewCriteria: [...input.reviewCriteria].sort(),
    evidenceRefs: input.evidenceRefs ?? [],
    relatedEscalationBundleId: input.relatedEscalationBundleId,
  };
  const contractHash = stableHash("review-contract", {
    contractId: contract.contractId,
    reviewType: contract.reviewType,
    criteriaCount: contract.reviewCriteria.length,
  });
  return { ...contract, contractHash };
}

export function createExecutionPauseResume(input: {
  intentId: string;
  planId?: string;
  pausedBy: string;
  pauseReason: string;
  pauseReasonCode: string;
  evidenceRefs?: string[];
  expiresAt?: string;
}): ExecutionPauseResume {
  const pause: Omit<ExecutionPauseResume, "pauseHash"> = {
    pauseId: stableHash("pause", { intentId: input.intentId, pausedBy: input.pausedBy }),
    intentId: input.intentId,
    planId: input.planId,
    pausedAt: new Date().toISOString(),
    pausedBy: input.pausedBy,
    pauseReason: input.pauseReason,
    pauseReasonCode: input.pauseReasonCode,
    state: "paused",
    expiresAt: input.expiresAt,
    expired: false,
    overridden: false,
    evidenceRefs: input.evidenceRefs ?? [],
  };
  const pauseHash = stableHash("pause", {
    pauseId: pause.pauseId,
    state: pause.state,
    pauseReasonCode: pause.pauseReasonCode,
  });
  return { ...pause, pauseHash };
}

export function resumeExecution(
  pause: ExecutionPauseResume,
  resumedBy: string,
  resumeReason?: string,
): ExecutionPauseResume {
  const updated: ExecutionPauseResume = {
    ...pause,
    state: "resumed",
    resumedAt: new Date().toISOString(),
    resumedBy,
    resumeReason: resumeReason ?? "operator_resume",
    pauseHash: "",
  };
  const pauseHash = stableHash("pause", {
    pauseId: updated.pauseId,
    state: updated.state,
    resumedAt: updated.resumedAt,
  });
  return { ...updated, pauseHash };
}

export function createApprovalStage(input: {
  intentId: string;
  planId?: string;
  stageNumber: number;
  stageName: string;
  requiredApprovers: string[];
  previousStageId?: string;
  nextStageId?: string;
  expiresAt?: string;
  evidenceRefs?: string[];
}): ApprovalStage {
  const now = new Date().toISOString();
  const stage: Omit<ApprovalStage, "stageHash"> = {
    stageId: stableHash("approval-stage", { intentId: input.intentId, stageNumber: input.stageNumber, stageName: input.stageName }),
    intentId: input.intentId,
    planId: input.planId,
    stageNumber: input.stageNumber,
    stageName: input.stageName,
    state: "pending",
    requiredApprovers: [...input.requiredApprovers].sort(),
    receivedApprovals: [],
    createdAt: now,
    expiresAt: input.expiresAt,
    nextStageId: input.nextStageId,
    previousStageId: input.previousStageId,
    evidenceRefs: input.evidenceRefs ?? [],
  };
  const stageHash = stableHash("approval-stage", {
    stageId: stage.stageId,
    stageNumber: stage.stageNumber,
    requiredApproverCount: stage.requiredApprovers.length,
  });
  return { ...stage, stageHash };
}

export function approveStage(
  stage: ApprovalStage,
  approverId: string,
): ApprovalStage {
  if (stage.state !== "pending") return stage;
  if (stage.receivedApprovals.includes(approverId)) return stage;

  const updatedApprovals = [...stage.receivedApprovals, approverId];
  const allApproved = updatedApprovals.length >= stage.requiredApprovers.length;

  const updated: ApprovalStage = {
    ...stage,
    receivedApprovals: updatedApprovals,
    state: allApproved ? "approved" : "pending",
    completedAt: allApproved ? new Date().toISOString() : undefined,
    stageHash: "",
  };
  const stageHash = stableHash("approval-stage", {
    stageId: updated.stageId,
    state: updated.state,
    approvalCount: updated.receivedApprovals.length,
  });
  return { ...updated, stageHash };
}

export function rejectStage(
  stage: ApprovalStage,
  rejectedBy: string,
  reason: string,
): ApprovalStage {
  const updated: ApprovalStage = {
    ...stage,
    state: "rejected",
    rejectedBy,
    rejectionReason: reason,
    completedAt: new Date().toISOString(),
    stageHash: "",
  };
  const stageHash = stableHash("approval-stage", {
    stageId: updated.stageId,
    state: updated.state,
    rejectedBy: updated.rejectedBy,
  });
  return { ...updated, stageHash };
}

export function createConfidenceEscalation(input: {
  intentId: string;
  planId?: string;
  confidenceThreshold: number;
  actualConfidence: number;
  triggerReason: string;
  escalationLevel?: EscalationLevel;
  assignedTo?: string;
  evidenceRefs?: string[];
}): ConfidenceEscalation {
  const confidenceGap = input.confidenceThreshold - input.actualConfidence;
  const level = input.escalationLevel ?? (confidenceGap > 0.5 ? "critical" : confidenceGap > 0.3 ? "mandatory" : confidenceGap > 0.15 ? "required" : "advisory");
  const escalation: Omit<ConfidenceEscalation, "escalationHash"> = {
    escalationId: stableHash("confidence-escalation", { intentId: input.intentId, actualConfidence: input.actualConfidence }),
    intentId: input.intentId,
    planId: input.planId,
    confidenceThreshold: input.confidenceThreshold,
    actualConfidence: input.actualConfidence,
    confidenceGap,
    triggeredAt: new Date().toISOString(),
    triggerReason: input.triggerReason,
    escalationLevel: level,
    state: "pending",
    assignedTo: input.assignedTo,
    evidenceRefs: input.evidenceRefs ?? [],
  };
  const escalationHash = stableHash("confidence-escalation", {
    escalationId: escalation.escalationId,
    escalationLevel: escalation.escalationLevel,
    confidenceGap: escalation.confidenceGap,
  });
  return { ...escalation, escalationHash };
}

export function buildEscalationTopology(input: {
  bundles: EscalationBundle[];
  takeovers: OperatorTakeoverEnvelope[];
  queues: AdjudicationQueue[];
  reviews: ReviewContract[];
  pauses: ExecutionPauseResume[];
  approvalStages: ApprovalStage[];
  confidenceEscalations: ConfidenceEscalation[];
}): EscalationTopology {
  const topology: Omit<EscalationTopology, "topologyHash"> = {
    capturedAt: new Date().toISOString(),
    bundles: input.bundles,
    takeovers: input.takeovers,
    queues: input.queues,
    reviews: input.reviews,
    pauses: input.pauses,
    approvalStages: input.approvalStages,
    confidenceEscalations: input.confidenceEscalations,
  };
  const topologyHash = stableHash("escalation-topology", {
    bundleCount: topology.bundles.length,
    takeoverCount: topology.takeovers.length,
    queueCount: topology.queues.length,
    reviewCount: topology.reviews.length,
    pauseCount: topology.pauses.length,
    approvalStageCount: topology.approvalStages.length,
    confidenceEscalationCount: topology.confidenceEscalations.length,
  });
  return { ...topology, topologyHash };
}
