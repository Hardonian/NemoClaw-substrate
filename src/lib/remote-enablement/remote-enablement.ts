// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Remote enablement policy implementation.
 *
 * Hard rules:
 * - Never globally auto-enable
 * - Must require profile + trust + policy + approval
 * - Revoked/expired/conflicted workers blocked
 * - Diagnostics show exact enablement reason
 */

import {
  RemoteEnablementPolicy,
  RemoteEnablementDecision,
  RemoteEligibilitySnapshot,
  RemoteWorkerProfile,
  RemoteTrustState,
  RemotePolicyState,
  RemoteApprovalState,
  RemoteEnablementReasonCode,
  DEFAULT_REMOTE_ENABLEMENT_POLICY,
  validateRemoteEnablementPolicy,
  validateRemoteEnablementDecision,
} from "./types";

import { isRemoteExecutionEnabled } from "../orchestration/types";

// ============================================================================
// Remote enablement evaluator
// ============================================================================

export class RemoteEnablementEvaluator {
  private policy: RemoteEnablementPolicy;

  constructor(policy?: RemoteEnablementPolicy) {
    this.policy = policy ?? DEFAULT_REMOTE_ENABLEMENT_POLICY;
  }

  updatePolicy(policy: RemoteEnablementPolicy): void {
    this.policy = policy;
  }

  evaluateEligibility(
    workerId: string,
    runId: string,
    profile: RemoteWorkerProfile | null,
    trustState: RemoteTrustState,
    policyState: RemotePolicyState,
    approvalState: RemoteApprovalState,
  ): RemoteEligibilitySnapshot {
    const blockingReasons: RemoteEnablementReasonCode[] = [];
    const diagnostics: string[] = [];

    if (!isRemoteExecutionEnabled()) {
      blockingReasons.push(RemoteEnablementReasonCode.REMOTE_BLOCKED_NOT_ENABLED);
      diagnostics.push("Remote execution is not enabled. Set NEMOCLAW_REMOTE_EXECUTION=1 to enable.");
    }

    if (!this.policy.enabled) {
      blockingReasons.push(RemoteEnablementReasonCode.REMOTE_BLOCKED_NO_POLICY);
      diagnostics.push("Remote enablement policy is not enabled");
    }

    if (this.policy.requireProfile && !profile) {
      blockingReasons.push(RemoteEnablementReasonCode.REMOTE_BLOCKED_NO_PROFILE);
      diagnostics.push("Worker profile is required but not provided");
    }

    if (profile) {
      if (profile.revoked) {
        blockingReasons.push(RemoteEnablementReasonCode.REMOTE_BLOCKED_REVOKED);
        diagnostics.push(`Worker profile revoked: ${profile.revokedReason ?? "no reason provided"}`);
      }
      if (profile.expiresAt && new Date(profile.expiresAt) < new Date()) {
        blockingReasons.push(RemoteEnablementReasonCode.REMOTE_BLOCKED_EXPIRED);
        diagnostics.push("Worker profile has expired");
      }
    }

    if (this.policy.requireTrust) {
      if (!trustState.verified) {
        blockingReasons.push(RemoteEnablementReasonCode.REMOTE_BLOCKED_NO_TRUST);
        diagnostics.push("Worker trust is not verified");
      }
      if (trustState.revoked) {
        blockingReasons.push(RemoteEnablementReasonCode.TRUST_REVOKED);
        diagnostics.push(`Worker trust revoked: ${trustState.revokedReason ?? "no reason provided"}`);
      }
      if (trustState.expired) {
        blockingReasons.push(RemoteEnablementReasonCode.TRUST_EXPIRED);
        diagnostics.push("Worker trust has expired");
      }
      if (trustState.conflicted) {
        blockingReasons.push(RemoteEnablementReasonCode.REMOTE_BLOCKED_CONFLICTED);
        diagnostics.push(`Worker trust conflicted: ${trustState.conflictReason ?? "no reason provided"}`);
      }
    }

    if (this.policy.requirePolicy) {
      if (!policyState.compliant) {
        blockingReasons.push(RemoteEnablementReasonCode.POLICY_NON_COMPLIANT);
        diagnostics.push(`Worker non-compliant: ${policyState.violations.join(", ")}`);
      }
      if (policyState.expired) {
        blockingReasons.push(RemoteEnablementReasonCode.REMOTE_BLOCKED_EXPIRED);
        diagnostics.push("Worker policy has expired");
      }
    }

    if (this.policy.requireApproval && approvalState.required && !approvalState.granted) {
      if (approvalState.denied) {
        blockingReasons.push(RemoteEnablementReasonCode.REMOTE_BLOCKED_NO_APPROVAL);
        diagnostics.push(`Approval denied: ${approvalState.deniedReason ?? "no reason provided"}`);
      } else {
        blockingReasons.push(RemoteEnablementReasonCode.REMOTE_BLOCKED_NO_APPROVAL);
        diagnostics.push("Approval is required but not granted");
      }
    }

    const eligible = blockingReasons.length === 0;

    const snapshot: RemoteEligibilitySnapshot = {
      snapshotId: `eligibility-${workerId}-${Date.now()}`,
      workerId,
      timestamp: new Date().toISOString(),
      profile,
      trustState,
      policyState,
      approvalState,
      eligible,
      blockingReasons,
      diagnostics,
    };

    return snapshot;
  }

  makeEnablementDecision(
    snapshot: RemoteEligibilitySnapshot,
    runId: string,
    decidedBy?: string,
  ): RemoteEnablementDecision {
    if (!isRemoteExecutionEnabled()) {
      return {
        decisionId: `decision-${snapshot.workerId}-${Date.now()}`,
        workerId: snapshot.workerId,
        runId,
        enabled: false,
        reasonCode: RemoteEnablementReasonCode.REMOTE_BLOCKED_NOT_ENABLED,
        reasonMessage: "Remote execution is not enabled",
        diagnostics: snapshot.diagnostics,
        trustVerified: false,
        policyCompliant: false,
        approvalGranted: false,
        decidedAt: new Date().toISOString(),
        decidedBy,
      };
    }

    if (!this.policy.enabled) {
      return {
        decisionId: `decision-${snapshot.workerId}-${Date.now()}`,
        workerId: snapshot.workerId,
        runId,
        enabled: false,
        reasonCode: RemoteEnablementReasonCode.REMOTE_BLOCKED_NO_POLICY,
        reasonMessage: "Remote enablement policy is not enabled",
        diagnostics: snapshot.diagnostics,
        trustVerified: false,
        policyCompliant: false,
        approvalGranted: false,
        decidedAt: new Date().toISOString(),
        decidedBy,
      };
    }

    if (!snapshot.eligible) {
      const primaryReason = snapshot.blockingReasons[0] ?? RemoteEnablementReasonCode.REMOTE_BLOCKED_NO_PROFILE;
      return {
        decisionId: `decision-${snapshot.workerId}-${Date.now()}`,
        workerId: snapshot.workerId,
        runId,
        enabled: false,
        reasonCode: primaryReason,
        reasonMessage: `Remote enablement blocked: ${snapshot.diagnostics.join("; ")}`,
        diagnostics: snapshot.diagnostics,
        trustVerified: snapshot.trustState.verified,
        policyCompliant: snapshot.policyState.compliant,
        approvalGranted: snapshot.approvalState.granted,
        decidedAt: new Date().toISOString(),
        decidedBy,
      };
    }

    return {
      decisionId: `decision-${snapshot.workerId}-${Date.now()}`,
      workerId: snapshot.workerId,
      runId,
      enabled: true,
      reasonCode: RemoteEnablementReasonCode.REMOTE_ENABLED,
      reasonMessage: "Worker is eligible for remote enablement",
      diagnostics: snapshot.diagnostics,
      profileMatched: snapshot.profile?.profileId,
      trustVerified: snapshot.trustState.verified,
      policyCompliant: snapshot.policyState.compliant,
      approvalGranted: snapshot.approvalState.granted,
      decidedAt: new Date().toISOString(),
      decidedBy,
    };
  }
}
