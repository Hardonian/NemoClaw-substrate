// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Deterministic evidence export system.
 *
 * Produces EvidenceBundles and ReplayEvidencePackages with:
 * - deterministic key ordering via serde
 * - stable SHA-256 hashes
 * - manifest-level integrity digests
 * - lineage references linking receipts, replays, events, and plans
 * - JSON and NDJSON export formats
 * - secret redaction before export via security-policy preflight
 *
 * No autonomous retries, no daemons, no hidden fallback behavior.
 * All ordering is deterministic. All failures are explicit.
 */

import { createHash } from "node:crypto";

import { deterministicSerialize } from "./serde";
import type { OperationalEvent } from "./operational-memory";
import type { ReplayEnvelope } from "./replay";
import type { DegradedState, ExecutionReceipt } from "./types";
import type { ExecutionPlan } from "./execution-plans";
import {
  type SecurityPolicy,
  DEFAULT_SECURITY_POLICY,
  redactSecurityPayload,
  payloadContainsSecrets,
  buildSafeProofpackManifestMetadata,
} from "../security/security-policy";

import type {
  EvidenceArtifact,
  EvidenceArtifactKind,
  EvidenceBundle,
  EvidenceClassification,
  EvidenceDigest,
  EvidenceManifest,
  EvidenceReference,
  EvidenceVerificationResult,
  ProofpackExportFormat,
  ProofpackExportOptions,
  ReplayEvidencePackage,
} from "./evidence-types";

import {
  DEFAULT_PROOFPACK_EXPORT_OPTIONS,
  GOVERNANCE_EVENT_CATEGORIES,
  DIAGNOSTICS_EVENT_CATEGORIES,
  DEGRADED_STATE_TRIGGER_EVENT_CATEGORIES,
  APPROVAL_EVENT_CATEGORIES,
  DEGRADED_EVENT_CATEGORIES,
} from "./evidence-types";

// ── Hashing helpers ────────────────────────────────────────────

export function sha256Digest(value: unknown): EvidenceDigest {
  const serialized = deterministicSerialize(value);
  return {
    algorithm: "sha256",
    value: createHash("sha256").update(serialized).digest("hex"),
  };
}

function stableArtifactId(kind: string, payload: unknown, createdAt: string): string {
  const serialized = deterministicSerialize({ kind, payload, createdAt });
  return `artifact-${createHash("sha256").update(serialized).digest("base64url").slice(0, 24)}`;
}

function stableBundleId(artifacts: EvidenceArtifact[], generatedAt: string): string {
  const ids = artifacts.map((a) => a.artifactId).sort();
  return `bundle-${createHash("sha256").update(deterministicSerialize({ ids, generatedAt })).digest("base64url").slice(0, 24)}`;
}

function stableManifestId(bundleId: string, generatedAt: string): string {
  return `manifest-${createHash("sha256").update(deterministicSerialize({ bundleId, generatedAt })).digest("base64url").slice(0, 24)}`;
}

function stablePackageId(bundleId: string, replayDigest: string, generatedAt: string): string {
  return `package-${createHash("sha256").update(deterministicSerialize({ bundleId, replayDigest, generatedAt })).digest("base64url").slice(0, 24)}`;
}

// ── Reference builders ─────────────────────────────────────────

export function buildReceiptReference(receipt: ExecutionReceipt): EvidenceReference {
  return {
    referenceId: `ref-receipt-${receipt.receiptId}`,
    kind: "receipt",
    targetId: receipt.receiptId,
    lineage: receipt.provenance.lineage,
  };
}

export function buildReplayReference(envelope: ReplayEnvelope): EvidenceReference {
  return {
    referenceId: `ref-replay-${envelope.digest.slice(0, 16)}`,
    kind: "replay",
    targetId: envelope.digest,
    lineage: [`replay-v${envelope.version}`, `events:${envelope.eventCount}`],
  };
}

export function buildEventReference(event: OperationalEvent): EvidenceReference {
  return {
    referenceId: `ref-event-${event.eventId}`,
    kind: "event",
    targetId: event.eventId,
    lineage: event.replayRef?.lineage ?? [],
  };
}

export function buildPlanReference(plan: ExecutionPlan): EvidenceReference {
  return {
    referenceId: `ref-plan-${plan.planId}`,
    kind: "plan",
    targetId: plan.planId,
    lineage: plan.replayReference.lineage,
  };
}

// ── Artifact builder ───────────────────────────────────────────

export function buildEvidenceArtifact(input: {
  kind: EvidenceArtifactKind;
  classification: EvidenceClassification;
  createdAt: string;
  payload: Record<string, unknown>;
  references: EvidenceReference[];
  redactSecrets: boolean;
  securityPolicy?: SecurityPolicy;
}): EvidenceArtifact {
  const policy = input.securityPolicy ?? DEFAULT_SECURITY_POLICY;
  const redactedPayload = input.redactSecrets
    ? (redactSecurityPayload(input.payload, policy.secretRedaction) as Record<string, unknown>)
    : input.payload;
  const wasRedacted = input.redactSecrets && JSON.stringify(input.payload) !== JSON.stringify(redactedPayload);
  return {
    artifactId: stableArtifactId(input.kind, redactedPayload, input.createdAt),
    kind: input.kind,
    classification: input.classification,
    createdAt: input.createdAt,
    digest: sha256Digest(redactedPayload),
    payload: redactedPayload,
    references: [...input.references].sort((a, b) => a.referenceId.localeCompare(b.referenceId)),
    redacted: wasRedacted,
  };
}

// ── Artifact factories ─────────────────────────────────────────

export function artifactFromReceipt(receipt: ExecutionReceipt, options: Pick<ProofpackExportOptions, "classification" | "redactSecrets">): EvidenceArtifact {
  return buildEvidenceArtifact({
    kind: "receipt",
    classification: options.classification,
    createdAt: receipt.createdAt,
    payload: { receipt } as Record<string, unknown>,
    references: [buildReceiptReference(receipt)],
    redactSecrets: options.redactSecrets,
  });
}

export function artifactFromEvent(event: OperationalEvent, kind: EvidenceArtifactKind, options: Pick<ProofpackExportOptions, "classification" | "redactSecrets">): EvidenceArtifact {
  return buildEvidenceArtifact({
    kind,
    classification: options.classification,
    createdAt: event.occurredAt,
    payload: { event } as Record<string, unknown>,
    references: [buildEventReference(event)],
    redactSecrets: options.redactSecrets,
  });
}

export function artifactFromPlan(plan: ExecutionPlan, options: Pick<ProofpackExportOptions, "classification" | "redactSecrets">): EvidenceArtifact {
  return buildEvidenceArtifact({
    kind: "execution_plan",
    classification: options.classification,
    createdAt: plan.createdAt,
    payload: { plan } as Record<string, unknown>,
    references: [buildPlanReference(plan)],
    redactSecrets: options.redactSecrets,
  });
}

function eventKindForCategory(category: string): EvidenceArtifactKind {
  if (GOVERNANCE_EVENT_CATEGORIES.has(category as OperationalEvent["category"])) return "governance_event";
  if (DIAGNOSTICS_EVENT_CATEGORIES.has(category as OperationalEvent["category"])) return "diagnostics_snapshot";
  if (DEGRADED_STATE_TRIGGER_EVENT_CATEGORIES.has(category as OperationalEvent["category"])) return "operational_event";
  if (APPROVAL_EVENT_CATEGORIES.has(category as OperationalEvent["category"])) return "approval_lineage";
  if (DEGRADED_EVENT_CATEGORIES.has(category as OperationalEvent["category"])) return "degraded_state";
  return "operational_event";
}

// ── Bundle builder ─────────────────────────────────────────────

export function buildEvidenceBundle(input: {
  artifacts: EvidenceArtifact[];
  generatedAt: string;
  classification: EvidenceClassification;
  securityPolicy?: SecurityPolicy;
}): EvidenceBundle {
  const sorted = [...input.artifacts].sort((a, b) => a.artifactId.localeCompare(b.artifactId));
  const bundleId = stableBundleId(sorted, input.generatedAt);
  const manifestDigest = sha256Digest(sorted.map((a) => a.digest));
  const lineageRoots = [...new Set(sorted.flatMap((a) => a.references.flatMap((r) => r.lineage)))].sort();
  const policy = input.securityPolicy ?? DEFAULT_SECURITY_POLICY;
  const manifest: EvidenceManifest = {
    version: "1",
    manifestId: stableManifestId(bundleId, input.generatedAt),
    generatedAt: input.generatedAt,
    artifactCount: sorted.length,
    digest: manifestDigest,
    classification: input.classification,
    securityMetadata: buildSafeProofpackManifestMetadata(input.generatedAt),
    lineageRoots,
  };
  const references = sorted.flatMap((a) => a.references);
  return {
    version: "1",
    bundleId,
    generatedAt: input.generatedAt,
    manifest,
    artifacts: sorted,
    references: [...references].sort((a, b) => a.referenceId.localeCompare(b.referenceId)),
  };
}

// ── Bundle from events ─────────────────────────────────────────

export function buildEvidenceBundleFromEvents(
  events: OperationalEvent[],
  generatedAt: string,
  options: ProofpackExportOptions = DEFAULT_PROOFPACK_EXPORT_OPTIONS,
): EvidenceBundle {
  const sorted = [...events].sort((a, b) => a.sequence - b.sequence || a.eventId.localeCompare(b.eventId));
  const artifacts: EvidenceArtifact[] = [];
  for (const event of sorted) {
    const kind = eventKindForCategory(event.category);
    if (kind === "governance_event" && !options.includeGovernanceEvents) continue;
    if (kind === "diagnostics_snapshot" && !options.includeDiagnostics) continue;
    if (kind === "degraded_state" && !options.includeDegradedStates) continue;
    if (kind === "approval_lineage" && !options.includeApprovalLineage) continue;
    if (DEGRADED_STATE_TRIGGER_EVENT_CATEGORIES.has(event.category) && !options.includeDegradedStateTriggerEvidence) continue;
    artifacts.push(artifactFromEvent(event, kind, options));
  }
  return buildEvidenceBundle({ artifacts, generatedAt, classification: options.classification });
}

// ── Replay evidence package builder ────────────────────────────

export function buildReplayEvidencePackage(input: {
  replayEnvelope: ReplayEnvelope;
  events: OperationalEvent[];
  generatedAt: string;
  options?: ProofpackExportOptions;
}): ReplayEvidencePackage {
  const options = input.options ?? DEFAULT_PROOFPACK_EXPORT_OPTIONS;
  const sorted = [...input.events].sort((a, b) => a.sequence - b.sequence || a.eventId.localeCompare(b.eventId));
  const governanceEvents = options.includeGovernanceEvents
    ? sorted.filter((e) => GOVERNANCE_EVENT_CATEGORIES.has(e.category))
    : [];
  const diagnosticsSnapshots = options.includeDiagnostics
    ? sorted.filter((e) => DIAGNOSTICS_EVENT_CATEGORIES.has(e.category))
    : [];
  const degradedStates = options.includeDegradedStates
    ? sorted.filter((e) => DEGRADED_EVENT_CATEGORIES.has(e.category)).map((e) => (e.payload["degraded"] ?? { category: "unknown", reason: e.category, affectedSubsystem: "unknown", severity: "info", reasonCode: "unknown_error", explanation: e.category, sourceComponent: "evidence-export", timestamp: e.occurredAt }) as DegradedState)
    : [];
  const degradedStateTriggerEvidence = options.includeDegradedStateTriggerEvidence
    ? sorted.filter((e) => DEGRADED_STATE_TRIGGER_EVENT_CATEGORIES.has(e.category))
    : [];
  const approvalLineage = options.includeApprovalLineage
    ? sorted.filter((e) => APPROVAL_EVENT_CATEGORIES.has(e.category))
    : [];
  const evidenceBundle = buildEvidenceBundleFromEvents(sorted, input.generatedAt, options);
  const packageDigest = sha256Digest({
    replayDigest: input.replayEnvelope.digest,
    bundleId: evidenceBundle.bundleId,
    generatedAt: input.generatedAt,
  });
  return {
    version: "1",
    packageId: stablePackageId(evidenceBundle.bundleId, input.replayEnvelope.digest, input.generatedAt),
    generatedAt: input.generatedAt,
    replayEnvelope: input.replayEnvelope,
    evidenceBundle,
    governanceEvents,
    diagnosticsSnapshots,
    degradedStates,
    degradedStateTriggerEvidence,
    approvalLineage,
    digest: packageDigest,
  };
}

// ── Export serialization ───────────────────────────────────────

export function exportBundleAsJson(bundle: EvidenceBundle): string {
  return deterministicSerialize(bundle);
}

export function exportBundleAsNdjson(bundle: EvidenceBundle): string {
  const lines: string[] = [];
  lines.push(deterministicSerialize({ type: "manifest", data: bundle.manifest }));
  for (const artifact of bundle.artifacts) {
    lines.push(deterministicSerialize({ type: "artifact", data: artifact }));
  }
  for (const reference of bundle.references) {
    lines.push(deterministicSerialize({ type: "reference", data: reference }));
  }
  return lines.join("\n") + "\n";
}

export function exportBundle(bundle: EvidenceBundle, format: ProofpackExportFormat = "json"): string {
  if (format === "ndjson") return exportBundleAsNdjson(bundle);
  return exportBundleAsJson(bundle);
}

export function exportReplayPackageAsJson(pkg: ReplayEvidencePackage): string {
  return deterministicSerialize(pkg);
}

export function exportReplayPackageAsNdjson(pkg: ReplayEvidencePackage): string {
  const lines: string[] = [];
  lines.push(deterministicSerialize({ type: "package_header", data: { version: pkg.version, packageId: pkg.packageId, generatedAt: pkg.generatedAt, digest: pkg.digest } }));
  lines.push(deterministicSerialize({ type: "replay_envelope", data: pkg.replayEnvelope }));
  lines.push(deterministicSerialize({ type: "manifest", data: pkg.evidenceBundle.manifest }));
  for (const artifact of pkg.evidenceBundle.artifacts) {
    lines.push(deterministicSerialize({ type: "artifact", data: artifact }));
  }
  for (const event of pkg.governanceEvents) {
    lines.push(deterministicSerialize({ type: "governance_event", data: event }));
  }
  for (const snapshot of pkg.diagnosticsSnapshots) {
    lines.push(deterministicSerialize({ type: "diagnostics_snapshot", data: snapshot }));
  }
  for (const state of pkg.degradedStates) {
    lines.push(deterministicSerialize({ type: "degraded_state", data: state }));
  }
  for (const event of pkg.degradedStateTriggerEvidence) {
    lines.push(deterministicSerialize({ type: "degraded_state_trigger_evidence", data: event }));
  }
  for (const event of pkg.approvalLineage) {
    lines.push(deterministicSerialize({ type: "approval_lineage", data: event }));
  }
  return lines.join("\n") + "\n";
}

export function exportReplayPackage(pkg: ReplayEvidencePackage, format: ProofpackExportFormat = "json"): string {
  if (format === "ndjson") return exportReplayPackageAsNdjson(pkg);
  return exportReplayPackageAsJson(pkg);
}

// ── Verification ───────────────────────────────────────────────

export function verifyEvidenceBundle(bundle: EvidenceBundle, verifiedAt: string): EvidenceVerificationResult {
  const reasons: string[] = [];
  const artifactDigestMatches: Array<{ artifactId: string; match: boolean }> = [];
  for (const artifact of bundle.artifacts) {
    const recomputed = sha256Digest(artifact.payload);
    const match = recomputed.value === artifact.digest.value;
    artifactDigestMatches.push({ artifactId: artifact.artifactId, match });
    if (!match) reasons.push(`artifact_digest_mismatch:${artifact.artifactId}`);
  }
  const manifestRecomputed = sha256Digest(bundle.artifacts.map((a) => a.digest));
  const manifestDigestMatch = manifestRecomputed.value === bundle.manifest.digest.value;
  if (!manifestDigestMatch) reasons.push("manifest_digest_mismatch");
  if (bundle.manifest.artifactCount !== bundle.artifacts.length) reasons.push("artifact_count_mismatch");
  const allRefs = bundle.artifacts.flatMap((a) => a.references);
  const hasLineage = allRefs.length > 0 && allRefs.every((r) => r.lineage.length > 0);
  if (!hasLineage && allRefs.length > 0) reasons.push("incomplete_lineage");
  const lineageComplete = hasLineage || allRefs.length === 0;

  return {
    status: reasons.length === 0 ? "passed" : "failed",
    verifiedAt,
    bundleId: bundle.bundleId,
    manifestDigestMatch,
    artifactDigestMatches,
    lineageComplete,
    reasons,
  };
}

export function verifyReplayEvidencePackage(pkg: ReplayEvidencePackage, verifiedAt: string): EvidenceVerificationResult {
  const bundleResult = verifyEvidenceBundle(pkg.evidenceBundle, verifiedAt);
  const reasons = [...bundleResult.reasons];
  const recomputedPackageDigest = sha256Digest({
    replayDigest: pkg.replayEnvelope.digest,
    bundleId: pkg.evidenceBundle.bundleId,
    generatedAt: pkg.generatedAt,
  });
  if (recomputedPackageDigest.value !== pkg.digest.value) reasons.push("package_digest_mismatch");
  if (pkg.replayEnvelope.eventCount !== pkg.replayEnvelope.events.length) reasons.push("replay_event_count_mismatch");

  return {
    ...bundleResult,
    status: reasons.length === 0 ? "passed" : "failed",
    bundleId: pkg.evidenceBundle.bundleId,
    reasons,
  };
}

// ── Secret safety gate ─────────────────────────────────────────

export function evidenceContainsSecrets(bundle: EvidenceBundle, securityPolicy: SecurityPolicy = DEFAULT_SECURITY_POLICY): boolean {
  for (const artifact of bundle.artifacts) {
    if (payloadContainsSecrets(artifact.payload, securityPolicy.secretRedaction)) return true;
  }
  return false;
}
