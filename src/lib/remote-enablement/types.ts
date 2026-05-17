// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Remote enablement policy types.
 *
 * Hard rules:
 * - Never globally auto-enable
 * - Must require profile + trust + policy + approval
 * - Revoked/expired/conflicted workers blocked
 * - Diagnostics show exact enablement reason
 */

// ============================================================================
// Remote enablement reason codes
// ============================================================================

export enum RemoteEnablementReasonCode {
  // Enablement decisions
  REMOTE_ENABLED = "remote_enabled",
  REMOTE_DISABLED = "remote_disabled",

  // Blocking reasons
  REMOTE_BLOCKED_NO_PROFILE = "remote_blocked_no_profile",
  REMOTE_BLOCKED_NO_TRUST = "remote_blocked_no_trust",
  REMOTE_BLOCKED_NO_POLICY = "remote_blocked_no_policy",
  REMOTE_BLOCKED_NO_APPROVAL = "remote_blocked_no_approval",
  REMOTE_BLOCKED_REVOKED = "remote_blocked_revoked",
  REMOTE_BLOCKED_EXPIRED = "remote_blocked_expired",
  REMOTE_BLOCKED_CONFLICTED = "remote_blocked_conflicted",
  REMOTE_BLOCKED_NOT_ENABLED = "remote_blocked_not_enabled",

  // Trust states
  TRUST_VERIFIED = "trust_verified",
  TRUST_INSUFFICIENT = "trust_insufficient",
  TRUST_REVOKED = "trust_revoked",
  TRUST_EXPIRED = "trust_expired",

  // Approval states
  APPROVAL_GRANTED = "approval_granted",
  APPROVAL_REQUIRED = "approval_required",
  APPROVAL_DENIED = "approval_denied",

  // Policy states
  POLICY_COMPLIANT = "policy_compliant",
  POLICY_NON_COMPLIANT = "policy_non_compliant",
  POLICY_MISSING = "policy_missing",
}

// ============================================================================
// Remote enablement policy
// ============================================================================

export interface RemoteEnablementPolicy {
  policyId: string;
  name: string;
  version: string;
  enabled: boolean;
  requireProfile: boolean;
  requireTrust: boolean;
  requirePolicy: boolean;
  requireApproval: boolean;
  minimumTrustLevel: string;
  allowedProfiles: string[];
  maxRemoteWorkers: number;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_REMOTE_ENABLEMENT_POLICY: RemoteEnablementPolicy = {
  policyId: "default",
  name: "Default Remote Enablement Policy",
  version: "1.0.0",
  enabled: false,
  requireProfile: true,
  requireTrust: true,
  requirePolicy: true,
  requireApproval: true,
  minimumTrustLevel: "high",
  allowedProfiles: [],
  maxRemoteWorkers: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ============================================================================
// Remote enablement decision
// ============================================================================

export interface RemoteEnablementDecision {
  decisionId: string;
  workerId: string;
  runId: string;
  enabled: boolean;
  reasonCode: RemoteEnablementReasonCode;
  reasonMessage: string;
  diagnostics: string[];
  profileMatched?: string;
  trustVerified: boolean;
  policyCompliant: boolean;
  approvalGranted: boolean;
  decidedAt: string;
  decidedBy?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Remote eligibility snapshot
// ============================================================================

export interface RemoteEligibilitySnapshot {
  snapshotId: string;
  workerId: string;
  timestamp: string;
  profile: RemoteWorkerProfile | null;
  trustState: RemoteTrustState;
  policyState: RemotePolicyState;
  approvalState: RemoteApprovalState;
  eligible: boolean;
  blockingReasons: RemoteEnablementReasonCode[];
  diagnostics: string[];
}

export interface RemoteWorkerProfile {
  profileId: string;
  name: string;
  version: string;
  expiresAt?: string;
  revoked: boolean;
  revokedReason?: string;
}

export interface RemoteTrustState {
  trustLevel: string;
  verified: boolean;
  verifiedAt?: string;
  revoked: boolean;
  revokedReason?: string;
  revokedAt?: string;
  expired: boolean;
  expiredAt?: string;
  conflicted: boolean;
  conflictReason?: string;
}

export interface RemotePolicyState {
  policyId: string;
  compliant: boolean;
  violations: string[];
  expiresAt?: string;
  expired: boolean;
}

export interface RemoteApprovalState {
  required: boolean;
  granted: boolean;
  grantedBy?: string;
  grantedAt?: string;
  denied: boolean;
  deniedReason?: string;
}

// ============================================================================
// Validation
// ============================================================================

export function validateRemoteEnablementPolicy(
  policy: Partial<RemoteEnablementPolicy>,
): string[] {
  const errors: string[] = [];

  if (!policy.policyId) {
    errors.push("policyId is required");
  }
  if (!policy.name) {
    errors.push("name is required");
  }
  if (typeof policy.enabled !== "boolean") {
    errors.push("enabled must be a boolean");
  }
  if (typeof policy.maxRemoteWorkers !== "number" || policy.maxRemoteWorkers < 0) {
    errors.push("maxRemoteWorkers must be a non-negative number");
  }

  return errors;
}

export function validateRemoteEnablementDecision(
  decision: Partial<RemoteEnablementDecision>,
): string[] {
  const errors: string[] = [];

  if (!decision.decisionId) {
    errors.push("decisionId is required");
  }
  if (!decision.workerId) {
    errors.push("workerId is required");
  }
  if (!decision.runId) {
    errors.push("runId is required");
  }
  if (typeof decision.enabled !== "boolean") {
    errors.push("enabled must be a boolean");
  }
  if (!decision.reasonCode) {
    errors.push("reasonCode is required");
  }
  if (!decision.decidedAt) {
    errors.push("decidedAt is required");
  }

  return errors;
}
