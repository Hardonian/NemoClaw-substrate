// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Supervised policy learning types.
 *
 * Hard rules:
 * - No automatic policy promotion
 * - Operator approval required
 * - Proposals cite evidence
 * - Rollback supported
 * - Replay-linked
 */

// ============================================================================
// Policy learning reason codes
// ============================================================================

export enum PolicyLearningReasonCode {
  // Signal ingestion
  SIGNAL_INGESTED = "signal_ingested",
  SIGNAL_REJECTED = "signal_rejected",

  // Proposal lifecycle
  PROPOSAL_CREATED = "proposal_created",
  PROPOSAL_UNDER_REVIEW = "proposal_under_review",
  PROPOSAL_APPROVED = "proposal_approved",
  PROPOSAL_REJECTED = "proposal_rejected",
  PROPOSAL_EXPIRED = "proposal_expired",

  // Rollback
  ROLLBACK_INITIATED = "rollback_initiated",
  ROLLBACK_COMPLETED = "rollback_completed",
  ROLLBACK_FAILED = "rollback_failed",

  // Evidence
  EVIDENCE_COLLECTED = "evidence_collected",
  EVIDENCE_INSUFFICIENT = "evidence_insufficient",
}

// ============================================================================
// Policy learning signal
// ============================================================================

export interface PolicyLearningSignal {
  signalId: string;
  type: PolicySignalType;
  source: string;
  policyId: string;
  timestamp: string;
  data: Record<string, unknown>;
  confidence: number;
  metadata?: Record<string, unknown>;
}

export type PolicySignalType =
  | "performance_metric"
  | "error_rate"
  | "latency_change"
  | "policy_violation"
  | "operator_feedback"
  | "security_event";

// ============================================================================
// Policy candidate proposal
// ============================================================================

export interface PolicyCandidateProposal {
  proposalId: string;
  policyId: string;
  currentPolicyVersion: string;
  proposedPolicyVersion: string;
  proposedChanges: PolicyChange[];
  evidenceIds: string[];
  status: ProposalStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rollbackFromProposalId?: string;
  metadata?: Record<string, unknown>;
}

export interface PolicyChange {
  changeId: string;
  path: string;
  oldValue: unknown;
  newValue: unknown;
  reason: string;
}

export type ProposalStatus =
  | "draft"
  | "under_review"
  | "approved"
  | "rejected"
  | "expired"
  | "rolled_back";

// ============================================================================
// Policy promotion review
// ============================================================================

export interface PolicyPromotionReview {
  reviewId: string;
  proposalId: string;
  reviewerId: string;
  decision: ReviewDecision;
  decisionAt: string;
  notes?: string;
  evidenceReviewed: string[];
  riskAssessment: RiskLevel;
  metadata?: Record<string, unknown>;
}

export type ReviewDecision = "approve" | "reject" | "request_changes";
export type RiskLevel = "low" | "medium" | "high" | "critical";

// ============================================================================
// Policy learning evidence
// ============================================================================

export interface PolicyLearningEvidence {
  evidenceId: string;
  proposalId?: string;
  type: EvidenceType;
  source: string;
  timestamp: string;
  data: Record<string, unknown>;
  replayReference?: string;
  metadata?: Record<string, unknown>;
}

export type EvidenceType =
  | "metric"
  | "log"
  | "receipt"
  | "decision"
  | "operator_feedback";

// ============================================================================
// Validation
// ============================================================================

export function validatePolicyCandidateProposal(
  proposal: Partial<PolicyCandidateProposal>,
): string[] {
  const errors: string[] = [];

  if (!proposal.proposalId) {
    errors.push("proposalId is required");
  }
  if (!proposal.policyId) {
    errors.push("policyId is required");
  }
  if (!proposal.currentPolicyVersion) {
    errors.push("currentPolicyVersion is required");
  }
  if (!proposal.proposedPolicyVersion) {
    errors.push("proposedPolicyVersion is required");
  }
  if (!Array.isArray(proposal.proposedChanges)) {
    errors.push("proposedChanges must be an array");
  }
  if (!proposal.status) {
    errors.push("status is required");
  }

  return errors;
}

export function validatePolicyLearningEvidence(
  evidence: Partial<PolicyLearningEvidence>,
): string[] {
  const errors: string[] = [];

  if (!evidence.evidenceId) {
    errors.push("evidenceId is required");
  }
  if (!evidence.type) {
    errors.push("type is required");
  }
  if (!evidence.source) {
    errors.push("source is required");
  }
  if (!evidence.timestamp) {
    errors.push("timestamp is required");
  }

  return errors;
}
