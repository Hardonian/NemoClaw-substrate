// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type {
  CapabilitySnapshot,
  WorkerAttestationStatus,
  WorkerCapabilityAttestation,
  WorkerCapabilityClaim,
  WorkerIdentity,
  WorkerTrustDecision,
  WorkerTrustReasonCode,
} from "./types";

export function buildWorkerIdentity(input: { workerId: string; endpoint?: string; provider?: string }): WorkerIdentity {
  return { workerId: input.workerId, safeLabel: input.endpoint ? `${input.workerId}@${new URL(input.endpoint).host}` : input.workerId, provider: input.provider, endpoint: input.endpoint };
}

export function createCapabilityClaimFromProbe(input: { claimId: string; workerId: string; claimedAt: string; sourceRef: string; capabilities: CapabilitySnapshot; requestId?: string; receiptId?: string }): WorkerCapabilityClaim {
  return {
    claimId: input.claimId,
    workerId: input.workerId,
    claimedAt: input.claimedAt,
    source: "probe_observed",
    capabilities: { runtimeBackend: input.capabilities.runtimeBackend, executionMode: input.capabilities.executionMode, models: input.capabilities.models, gpus: input.capabilities.gpus },
    provenance: { sourceRef: input.sourceRef, requestId: input.requestId, receiptId: input.receiptId },
  };
}

export function compareClaims(claimed: WorkerCapabilityClaim, observed: WorkerCapabilityClaim): { conflicts: string[] } {
  const conflicts: string[] = [];
  if (claimed.capabilities.runtimeBackend !== observed.capabilities.runtimeBackend) conflicts.push("runtime_backend_mismatch");
  if (claimed.capabilities.executionMode !== observed.capabilities.executionMode) conflicts.push("execution_mode_mismatch");
  return { conflicts };
}

export function markAttestationStatus(input: { workerId: string; nowIso: string; claim: WorkerCapabilityClaim; observed?: WorkerCapabilityClaim; maxAgeMs: number }): WorkerCapabilityAttestation {
  const age = Date.parse(input.nowIso) - Date.parse(input.claim.claimedAt);
  const expired = Number.isFinite(age) && age > input.maxAgeMs;
  const conflicts = input.observed ? compareClaims(input.claim, input.observed).conflicts : [];
  const status: WorkerAttestationStatus = conflicts.length ? "conflict_detected" : expired ? "expired" : input.claim.source;
  const reasonCodes: WorkerTrustReasonCode[] = [];
  if (conflicts.length) reasonCodes.push("attestation_conflict");
  if (expired) reasonCodes.push("attestation_expired");
  if (reasonCodes.length === 0 && input.claim.source === "self_reported") reasonCodes.push("self_reported_not_sufficient");
  return {
    attestationId: `att-${input.claim.claimId}`,
    workerId: input.workerId,
    status,
    lastAttestedAt: input.claim.claimedAt,
    source: input.claim.source,
    stale: expired,
    conflict: conflicts.length > 0,
    reasonCodes,
    provenance: { sourceRef: input.claim.provenance.sourceRef, claimIds: [input.claim.claimId, ...(input.observed ? [input.observed.claimId] : [])] },
  };
}

export function decideWorkerTrust(input: { workerId: string; nowIso: string; attestation: WorkerCapabilityAttestation; policyAllowsElevation: boolean; revoked?: boolean; requireFreshAttestation?: boolean }): WorkerTrustDecision {
  const reasonCodes: WorkerTrustReasonCode[] = [...input.attestation.reasonCodes];
  if (input.revoked || input.attestation.status === "revoked") {
    return { workerId: input.workerId, trustLevel: "revoked", eligibleForRemoteExecution: false, attestationStatus: "revoked", reasonCodes: [...reasonCodes, "worker_revoked"], decidedAt: input.nowIso };
  }
  if (input.attestation.status === "conflict_detected") {
    return { workerId: input.workerId, trustLevel: "untrusted", eligibleForRemoteExecution: false, attestationStatus: input.attestation.status, reasonCodes: [...reasonCodes, "attestation_conflict"], decidedAt: input.nowIso };
  }
  if (input.requireFreshAttestation && input.attestation.status === "expired") {
    return { workerId: input.workerId, trustLevel: "untrusted", eligibleForRemoteExecution: false, attestationStatus: input.attestation.status, reasonCodes: [...reasonCodes, "attestation_expired"], decidedAt: input.nowIso };
  }
  if (input.attestation.status === "operator_approved" && input.policyAllowsElevation) {
    return { workerId: input.workerId, trustLevel: "trusted_remote", eligibleForRemoteExecution: true, attestationStatus: input.attestation.status, reasonCodes: [...reasonCodes, "operator_approved"], decidedAt: input.nowIso };
  }
  if (input.attestation.status === "probe_observed") {
    return { workerId: input.workerId, trustLevel: "observed", eligibleForRemoteExecution: false, attestationStatus: input.attestation.status, reasonCodes: [...reasonCodes, "probe_observed_requires_approval"], decidedAt: input.nowIso };
  }
  return { workerId: input.workerId, trustLevel: "unknown", eligibleForRemoteExecution: false, attestationStatus: input.attestation.status, reasonCodes: [...reasonCodes, "attestation_missing"], decidedAt: input.nowIso };
}
