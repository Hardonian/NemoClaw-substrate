// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Supervised policy learning implementation.
 *
 * Hard rules:
 * - No automatic policy promotion
 * - Operator approval required
 * - Proposals cite evidence
 * - Rollback supported
 * - Replay-linked
 */

import {
  PolicyLearningSignal,
  PolicyCandidateProposal,
  PolicyPromotionReview,
  PolicyLearningEvidence,
  PolicyChange,
  PolicySignalType,
  ProposalStatus,
  ReviewDecision,
  RiskLevel,
  EvidenceType,
  PolicyLearningReasonCode,
  validatePolicyCandidateProposal,
  validatePolicyLearningEvidence,
} from "./types";

// ============================================================================
// Store interface
// ============================================================================

export interface PolicyLearningStore {
  getSignals(policyId: string): PolicyLearningSignal[];
  saveSignal(signal: PolicyLearningSignal): void;
  getProposals(policyId: string): PolicyCandidateProposal[];
  getAllProposalPolicyIds(): string[];
  saveProposal(proposal: PolicyCandidateProposal): void;
  getReviews(proposalId: string): PolicyPromotionReview[];
  saveReview(review: PolicyPromotionReview): void;
  getEvidence(proposalId?: string): PolicyLearningEvidence[];
  saveEvidence(evidence: PolicyLearningEvidence): void;
}

export class InMemoryPolicyLearningStore implements PolicyLearningStore {
  private signals = new Map<string, PolicyLearningSignal[]>();
  private proposals = new Map<string, PolicyCandidateProposal[]>();
  private reviews = new Map<string, PolicyPromotionReview[]>();
  private evidence = new Map<string, PolicyLearningEvidence[]>();

  getSignals(policyId: string): PolicyLearningSignal[] {
    return this.signals.get(policyId) ?? [];
  }

  saveSignal(signal: PolicyLearningSignal): void {
    const existing = this.signals.get(signal.policyId) ?? [];
    existing.push(signal);
    this.signals.set(signal.policyId, existing);
  }

  getProposals(policyId: string): PolicyCandidateProposal[] {
    return this.proposals.get(policyId) ?? [];
  }

  getAllProposalPolicyIds(): string[] {
    return Array.from(this.proposals.keys());
  }

  saveProposal(proposal: PolicyCandidateProposal): void {
    const existing = this.proposals.get(proposal.policyId) ?? [];
    existing.push(proposal);
    this.proposals.set(proposal.policyId, existing);
  }

  getReviews(proposalId: string): PolicyPromotionReview[] {
    return this.reviews.get(proposalId) ?? [];
  }

  saveReview(review: PolicyPromotionReview): void {
    const existing = this.reviews.get(review.proposalId) ?? [];
    existing.push(review);
    this.reviews.set(review.proposalId, existing);
  }

  getEvidence(proposalId?: string): PolicyLearningEvidence[] {
    if (!proposalId) {
      return Array.from(this.evidence.values()).flat();
    }
    return this.evidence.get(proposalId) ?? [];
  }

  saveEvidence(evidence: PolicyLearningEvidence): void {
    const key = evidence.proposalId ?? "global";
    const existing = this.evidence.get(key) ?? [];
    existing.push(evidence);
    this.evidence.set(key, existing);
  }
}

// ============================================================================
// Policy learning manager
// ============================================================================

export class PolicyLearningManager {
  private store: PolicyLearningStore;

  constructor(store: PolicyLearningStore) {
    this.store = store;
  }

  ingestSignal(signal: PolicyLearningSignal): { success: boolean; reasonCode: PolicyLearningReasonCode; message: string } {
    if (signal.confidence < 0 || signal.confidence > 1) {
      return {
        success: false,
        reasonCode: PolicyLearningReasonCode.SIGNAL_REJECTED,
        message: "Signal confidence must be between 0 and 1",
      };
    }

    this.store.saveSignal(signal);

    return {
      success: true,
      reasonCode: PolicyLearningReasonCode.SIGNAL_INGESTED,
      message: `Signal ${signal.signalId} ingested`,
    };
  }

  collectEvidence(
    proposalId: string | undefined,
    type: EvidenceType,
    source: string,
    data: Record<string, unknown>,
    replayReference?: string,
  ): PolicyLearningEvidence {
    const evidence: PolicyLearningEvidence = {
      evidenceId: `evidence-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      proposalId,
      type,
      source,
      timestamp: new Date().toISOString(),
      data,
      replayReference,
    };
    this.store.saveEvidence(evidence);
    return evidence;
  }

  createProposal(
    policyId: string,
    currentPolicyVersion: string,
    proposedPolicyVersion: string,
    proposedChanges: PolicyChange[],
    evidenceIds: string[],
  ): { success: boolean; proposal?: PolicyCandidateProposal; reasonCode: PolicyLearningReasonCode; message: string } {
    if (proposedChanges.length === 0) {
      return {
        success: false,
        reasonCode: PolicyLearningReasonCode.EVIDENCE_INSUFFICIENT,
        message: "Proposal must include at least one change",
      };
    }

    if (evidenceIds.length === 0) {
      return {
        success: false,
        reasonCode: PolicyLearningReasonCode.EVIDENCE_INSUFFICIENT,
        message: "Proposal must cite at least one piece of evidence",
      };
    }

    const proposal: PolicyCandidateProposal = {
      proposalId: `proposal-${policyId}-${Date.now()}`,
      policyId,
      currentPolicyVersion,
      proposedPolicyVersion,
      proposedChanges,
      evidenceIds,
      status: "draft",
      createdAt: new Date().toISOString(),
    };

    const errors = validatePolicyCandidateProposal(proposal);
    if (errors.length > 0) {
      return {
        success: false,
        reasonCode: PolicyLearningReasonCode.PROPOSAL_REJECTED,
        message: `Proposal validation failed: ${errors.join(", ")}`,
      };
    }

    this.store.saveProposal(proposal);

    return {
      success: true,
      proposal,
      reasonCode: PolicyLearningReasonCode.PROPOSAL_CREATED,
      message: `Proposal ${proposal.proposalId} created`,
    };
  }

  submitForReview(proposalId: string): { success: boolean; reasonCode: PolicyLearningReasonCode; message: string } {
    const proposals = this.getAllProposals();
    const proposal = proposals.find((p) => p.proposalId === proposalId);

    if (!proposal) {
      return {
        success: false,
        reasonCode: PolicyLearningReasonCode.PROPOSAL_REJECTED,
        message: `Proposal ${proposalId} not found`,
      };
    }

    const updatedProposal: PolicyCandidateProposal = {
      ...proposal,
      status: "under_review",
    };

    const allProposals = this.store.getProposals(proposal.policyId);
    const updatedProposals = allProposals.map((p) =>
      p.proposalId === proposalId ? updatedProposal : p,
    );

    return {
      success: true,
      reasonCode: PolicyLearningReasonCode.PROPOSAL_UNDER_REVIEW,
      message: `Proposal ${proposalId} submitted for review`,
    };
  }

  reviewProposal(
    proposalId: string,
    reviewerId: string,
    decision: ReviewDecision,
    riskAssessment: RiskLevel,
    notes?: string,
    evidenceReviewed?: string[],
  ): { success: boolean; review?: PolicyPromotionReview; reasonCode: PolicyLearningReasonCode; message: string } {
    const proposals = this.getAllProposals();
    const proposal = proposals.find((p) => p.proposalId === proposalId);

    if (!proposal) {
      return {
        success: false,
        reasonCode: PolicyLearningReasonCode.PROPOSAL_REJECTED,
        message: `Proposal ${proposalId} not found`,
      };
    }

    const review: PolicyPromotionReview = {
      reviewId: `review-${proposalId}-${Date.now()}`,
      proposalId,
      reviewerId,
      decision,
      decisionAt: new Date().toISOString(),
      notes,
      evidenceReviewed: evidenceReviewed ?? [],
      riskAssessment,
    };

    this.store.saveReview(review);

    let newStatus: ProposalStatus;
    let reasonCode: PolicyLearningReasonCode;

    switch (decision) {
      case "approve":
        newStatus = "approved";
        reasonCode = PolicyLearningReasonCode.PROPOSAL_APPROVED;
        break;
      case "reject":
        newStatus = "rejected";
        reasonCode = PolicyLearningReasonCode.PROPOSAL_REJECTED;
        break;
      case "request_changes":
        newStatus = "under_review";
        reasonCode = PolicyLearningReasonCode.PROPOSAL_UNDER_REVIEW;
        break;
    }

    const allProposals = this.store.getProposals(proposal.policyId);
    const updatedProposals = allProposals.map((p) => {
      if (p.proposalId === proposalId) {
        const updated = {
          ...p,
          status: newStatus,
          reviewedAt: review.decisionAt,
          reviewedBy: reviewerId,
          reviewNotes: notes,
        };
        if (decision === "approve") {
          return { ...updated, approvedAt: review.decisionAt };
        }
        if (decision === "reject") {
          return { ...updated, rejectedAt: review.decisionAt };
        }
        return updated;
      }
      return p;
    });

    return {
      success: true,
      review,
      reasonCode,
      message: `Proposal ${proposalId} reviewed: ${decision}`,
    };
  }

  rollbackProposal(
    proposalId: string,
    reason: string,
  ): { success: boolean; reasonCode: PolicyLearningReasonCode; message: string } {
    const proposals = this.getAllProposals();
    const proposal = proposals.find((p) => p.proposalId === proposalId);

    if (!proposal) {
      return {
        success: false,
        reasonCode: PolicyLearningReasonCode.ROLLBACK_FAILED,
        message: `Proposal ${proposalId} not found`,
      };
    }

    const updatedProposal: PolicyCandidateProposal = {
      ...proposal,
      status: "rolled_back",
    };

    const allProposals = this.store.getProposals(proposal.policyId);
    const updatedProposals = allProposals.map((p) =>
      p.proposalId === proposalId ? updatedProposal : p,
    );

    return {
      success: true,
      reasonCode: PolicyLearningReasonCode.ROLLBACK_COMPLETED,
      message: `Proposal ${proposalId} rolled back: ${reason}`,
    };
  }

  getAllProposals(): PolicyCandidateProposal[] {
    const allProposals: PolicyCandidateProposal[] = [];
    const policyIds = this.store.getAllProposalPolicyIds();

    for (const policyId of policyIds) {
      allProposals.push(...this.store.getProposals(policyId));
    }

    return allProposals;
  }

  getProposalsForPolicy(policyId: string): PolicyCandidateProposal[] {
    return this.store.getProposals(policyId);
  }
}
