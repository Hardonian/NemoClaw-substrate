// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Canonical evidence contracts for deterministic proofpack generation,
 * audit bundle packaging, replay export integrity, and evidence verification.
 *
 * These types define the immutable evidence surface exported by the governed
 * substrate. Every artifact, digest, and reference is deterministically
 * ordered and stably hashed to prevent fabrication and ensure auditability.
 */

import type { OperationalEventCategory } from "./operational-memory";
import type { ReplayEnvelope } from "./replay";
import type { DegradedState } from "./types";
import type { ProofpackManifestMetadata } from "../security/security-policy";

// ── Evidence classification ────────────────────────────────────

export type EvidenceClassification =
  | "public"
  | "internal"
  | "confidential"
  | "restricted";

export type EvidenceArtifactKind =
  | "receipt"
  | "replay_envelope"
  | "execution_plan"
  | "operational_event"
  | "degraded_state"
  | "diagnostics_snapshot"
  | "governance_event"
  | "telemetry_event"
  | "approval_lineage"
  | "trust_attestation"
  | "policy_snapshot";

// ── Evidence digest ────────────────────────────────────────────

export interface EvidenceDigest {
  algorithm: "sha256";
  value: string;
}

// ── Evidence reference ─────────────────────────────────────────

export interface EvidenceReference {
  referenceId: string;
  kind: "receipt" | "replay" | "event" | "plan" | "approval" | "attestation" | "telemetry";
  targetId: string;
  lineage: string[];
}

// ── Evidence artifact ──────────────────────────────────────────

export interface EvidenceArtifact {
  artifactId: string;
  kind: EvidenceArtifactKind;
  classification: EvidenceClassification;
  createdAt: string;
  digest: EvidenceDigest;
  payload: Record<string, unknown>;
  references: EvidenceReference[];
  redacted: boolean;
}

// ── Evidence manifest ──────────────────────────────────────────

export interface EvidenceManifest {
  version: "1";
  manifestId: string;
  generatedAt: string;
  artifactCount: number;
  digest: EvidenceDigest;
  classification: EvidenceClassification;
  securityMetadata?: ProofpackManifestMetadata;
  lineageRoots: string[];
}

// ── Evidence bundle ────────────────────────────────────────────

export interface EvidenceBundle {
  version: "1";
  bundleId: string;
  generatedAt: string;
  manifest: EvidenceManifest;
  artifacts: EvidenceArtifact[];
  references: EvidenceReference[];
}

// ── Evidence verification ──────────────────────────────────────

export type EvidenceVerificationStatus = "passed" | "failed" | "warning";

export interface EvidenceVerificationResult {
  status: EvidenceVerificationStatus;
  verifiedAt: string;
  bundleId: string;
  manifestDigestMatch: boolean;
  artifactDigestMatches: Array<{ artifactId: string; match: boolean }>;
  lineageComplete: boolean;
  reasons: string[];
}

// ── Proofpack export options ───────────────────────────────────

export type ProofpackExportFormat = "json" | "ndjson";

export interface ProofpackExportOptions {
  format: ProofpackExportFormat;
  includeReplay: boolean;
  includeGovernanceEvents: boolean;
  includeDiagnostics: boolean;
  includeDegradedStates: boolean;
  includeFallbackEvidence: boolean;
  includeApprovalLineage: boolean;
  classification: EvidenceClassification;
  redactSecrets: boolean;
}

export const DEFAULT_PROOFPACK_EXPORT_OPTIONS: ProofpackExportOptions = {
  format: "json",
  includeReplay: true,
  includeGovernanceEvents: true,
  includeDiagnostics: true,
  includeDegradedStates: true,
  includeFallbackEvidence: true,
  includeApprovalLineage: true,
  classification: "internal",
  redactSecrets: true,
};

// ── Replay evidence package ────────────────────────────────────

export interface ReplayEvidencePackage {
  version: "1";
  packageId: string;
  generatedAt: string;
  replayEnvelope: ReplayEnvelope;
  evidenceBundle: EvidenceBundle;
  governanceEvents: import("./operational-memory").OperationalEvent[];
  diagnosticsSnapshots: import("./operational-memory").OperationalEvent[];
  degradedStates: DegradedState[];
  fallbackEvidence: import("./operational-memory").OperationalEvent[];
  approvalLineage: import("./operational-memory").OperationalEvent[];
  digest: EvidenceDigest;
}

// ── Evidence category filters ──────────────────────────────────

export const GOVERNANCE_EVENT_CATEGORIES: ReadonlySet<OperationalEventCategory> = new Set([
  "execution_plan_created",
  "execution_plan_phase_transition",
  "execution_approval_requested",
  "execution_plan_approved",
  "execution_plan_rejected",
  "execution_plan_revoked",
  "execution_plan_expired",
  "execution_authorization_granted",
  "execution_authorization_denied",
  "execution_policy_snapshot_recorded",
  "execution_trust_snapshot_recorded",
  "execution_replay_validation_succeeded",
  "execution_replay_validation_failed",
]);

export const DIAGNOSTICS_EVENT_CATEGORIES: ReadonlySet<OperationalEventCategory> = new Set([
  "diagnostics_snapshot",
  "replay_metadata",
]);

export const FALLBACK_EVENT_CATEGORIES: ReadonlySet<OperationalEventCategory> = new Set([
  "fallback",
]);

export const APPROVAL_EVENT_CATEGORIES: ReadonlySet<OperationalEventCategory> = new Set([
  "execution_approval_requested",
  "execution_plan_approved",
  "execution_plan_rejected",
  "execution_plan_revoked",
  "execution_plan_expired",
  "operator_override",
]);

export const DEGRADED_EVENT_CATEGORIES: ReadonlySet<OperationalEventCategory> = new Set([
  "degraded_state",
]);

export const TELEMETRY_EVENT_CATEGORIES: ReadonlySet<OperationalEventCategory> = new Set([
  "telemetry_probe_started",
  "telemetry_probe_succeeded",
  "telemetry_probe_failed",
  "telemetry_parse_succeeded",
  "telemetry_parse_partial",
  "telemetry_parse_failed",
  "telemetry_unavailable",
  "telemetry_stale",
  "telemetry_conflict_detected",
  "telemetry_registry_update_applied",
  "telemetry_registry_update_skipped",
]);
