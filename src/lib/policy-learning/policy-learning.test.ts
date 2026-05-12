// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach } from "vitest";
import {
  PolicyLearningManager,
  InMemoryPolicyLearningStore,
} from "./policy-learning";
import {
  PolicyLearningSignal,
  PolicyLearningReasonCode,
  PolicySignalType,
  EvidenceType,
  ReviewDecision,
  RiskLevel,
} from "./types";

describe("policy learning manager", () => {
  let manager: PolicyLearningManager;
  let store: InMemoryPolicyLearningStore;

  beforeEach(() => {
    store = new InMemoryPolicyLearningStore();
    manager = new PolicyLearningManager(store);
  });

  describe("policy learning creates proposals only", () => {
    it("should ingest a signal", () => {
      const signal: PolicyLearningSignal = {
        signalId: "signal-1",
        type: "performance_metric",
        source: "test",
        policyId: "test-policy",
        timestamp: new Date().toISOString(),
        data: { metric: 0.95 },
        confidence: 0.9,
      };

      const result = manager.ingestSignal(signal);

      expect(result.success).toBe(true);
      expect(result.reasonCode).toBe(PolicyLearningReasonCode.SIGNAL_INGESTED);
    });

    it("should reject signal with invalid confidence", () => {
      const signal: PolicyLearningSignal = {
        signalId: "signal-1",
        type: "performance_metric",
        source: "test",
        policyId: "test-policy",
        timestamp: new Date().toISOString(),
        data: { metric: 0.95 },
        confidence: 1.5,
      };

      const result = manager.ingestSignal(signal);

      expect(result.success).toBe(false);
      expect(result.reasonCode).toBe(PolicyLearningReasonCode.SIGNAL_REJECTED);
    });

    it("should collect evidence", () => {
      const evidence = manager.collectEvidence(
        undefined,
        "metric",
        "test-source",
        { value: 0.95 },
      );

      expect(evidence.evidenceId).toBeDefined();
      expect(evidence.type).toBe("metric");
    });

    it("should create a proposal with evidence", () => {
      const evidence = manager.collectEvidence(
        undefined,
        "metric",
        "test-source",
        { value: 0.95 },
      );

      const result = manager.createProposal(
        "test-policy",
        "1.0.0",
        "1.1.0",
        [
          {
            changeId: "change-1",
            path: "maxRetries",
            oldValue: 0,
            newValue: 3,
            reason: "Enable retries",
          },
        ],
        [evidence.evidenceId],
      );

      expect(result.success).toBe(true);
      expect(result.reasonCode).toBe(PolicyLearningReasonCode.PROPOSAL_CREATED);
      expect(result.proposal).toBeDefined();
    });

    it("should reject proposal without changes", () => {
      const evidence = manager.collectEvidence(
        undefined,
        "metric",
        "test-source",
        { value: 0.95 },
      );

      const result = manager.createProposal(
        "test-policy",
        "1.0.0",
        "1.1.0",
        [],
        [evidence.evidenceId],
      );

      expect(result.success).toBe(false);
      expect(result.reasonCode).toBe(PolicyLearningReasonCode.EVIDENCE_INSUFFICIENT);
    });

    it("should reject proposal without evidence", () => {
      const result = manager.createProposal(
        "test-policy",
        "1.0.0",
        "1.1.0",
        [
          {
            changeId: "change-1",
            path: "maxRetries",
            oldValue: 0,
            newValue: 3,
            reason: "Enable retries",
          },
        ],
        [],
      );

      expect(result.success).toBe(false);
      expect(result.reasonCode).toBe(PolicyLearningReasonCode.EVIDENCE_INSUFFICIENT);
    });
  });

  describe("proposal review", () => {
    it("should review a proposal", () => {
      const evidence = manager.collectEvidence(
        undefined,
        "metric",
        "test-source",
        { value: 0.95 },
      );

      const createResult = manager.createProposal(
        "test-policy",
        "1.0.0",
        "1.1.0",
        [
          {
            changeId: "change-1",
            path: "maxRetries",
            oldValue: 0,
            newValue: 3,
            reason: "Enable retries",
          },
        ],
        [evidence.evidenceId],
      );

      if (!createResult.proposal) {
        throw new Error("Proposal creation failed");
      }

      manager.submitForReview(createResult.proposal.proposalId);

      const reviewResult = manager.reviewProposal(
        createResult.proposal.proposalId,
        "reviewer-1",
        "approve",
        "low",
        "Approved for testing",
        [evidence.evidenceId],
      );

      expect(reviewResult.success).toBe(true);
      expect(reviewResult.reasonCode).toBe(PolicyLearningReasonCode.PROPOSAL_APPROVED);
    });
  });

  describe("rollback", () => {
    it("should rollback a proposal", () => {
      const evidence = manager.collectEvidence(
        undefined,
        "metric",
        "test-source",
        { value: 0.95 },
      );

      const createResult = manager.createProposal(
        "test-policy",
        "1.0.0",
        "1.1.0",
        [
          {
            changeId: "change-1",
            path: "maxRetries",
            oldValue: 0,
            newValue: 3,
            reason: "Enable retries",
          },
        ],
        [evidence.evidenceId],
      );

      if (!createResult.proposal) {
        throw new Error("Proposal creation failed");
      }

      const rollbackResult = manager.rollbackProposal(
        createResult.proposal.proposalId,
        "Rolling back due to issues",
      );

      expect(rollbackResult.success).toBe(true);
      expect(rollbackResult.reasonCode).toBe(PolicyLearningReasonCode.ROLLBACK_COMPLETED);
    });
  });
});
