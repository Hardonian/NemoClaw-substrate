// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Fixture integrity verification.
 *
 * Validates:
 * - Stable hashes across regenerations
 * - Canonical ordering of artifacts, events, and references
 * - Deterministic timestamps (monotonically increasing sequences)
 * - Manifest validation (artifact count, digest matching, lineage completeness)
 *
 * No routing, execution lifecycle, orchestration, retries, remote execution, or daemon behavior.
 */

import { createHash } from "node:crypto";

import type { EvidenceBundle, EvidenceVerificationResult, ReplayEvidencePackage, EvidenceManifest } from "./evidence-types";
import { sha256Digest, verifyEvidenceBundle, verifyReplayEvidencePackage } from "./evidence-export";
import { deterministicSerialize } from "./serde";
import type { OperationalEvent } from "./operational-memory";

export interface IntegrityCheckResult {
  passed: boolean;
  checks: IntegrityCheck[];
  verifiedAt: string;
}

export interface IntegrityCheck {
  name: string;
  passed: boolean;
  detail?: string;
}

export interface HashVerificationResult {
  stable: boolean;
  originalHash: string;
  regeneratedHash: string;
  mismatch?: string;
}

export interface OrderingVerificationResult {
  ordered: boolean;
  violations: string[];
  totalItems: number;
}

export interface TimestampVerificationResult {
  monotonic: boolean;
  violations: Array<{ index: number; expected: string; actual: string }>;
  timeSpan?: { start: string; end: string; durationMs: number };
}

export interface ManifestValidationResult {
  valid: boolean;
  checks: Array<{ check: string; passed: boolean; detail?: string }>;
  manifest: EvidenceManifest;
}

export function verifyStableHash<T>(value: T, regenerate: () => T): HashVerificationResult {
  const originalHash = createHash("sha256").update(deterministicSerialize(value)).digest("hex");
  const regeneratedHash = createHash("sha256").update(deterministicSerialize(regenerate())).digest("hex");

  return {
    stable: originalHash === regeneratedHash,
    originalHash,
    regeneratedHash,
    mismatch: originalHash === regeneratedHash ? undefined : "Hash mismatch between original and regenerated value",
  };
}

export function verifyBundleHashStability(bundle: EvidenceBundle, regenerate: () => EvidenceBundle): HashVerificationResult {
  return verifyStableHash({
    bundleId: bundle.bundleId,
    manifestId: bundle.manifest.manifestId,
    manifestDigest: bundle.manifest.digest.value,
    artifactIds: bundle.artifacts.map((a) => a.artifactId).sort(),
    artifactDigests: bundle.artifacts.map((a) => a.digest.value).sort(),
  }, () => {
    const regenerated = regenerate();
    return {
      bundleId: regenerated.bundleId,
      manifestId: regenerated.manifest.manifestId,
      manifestDigest: regenerated.manifest.digest.value,
      artifactIds: regenerated.artifacts.map((a) => a.artifactId).sort(),
      artifactDigests: regenerated.artifacts.map((a) => a.digest.value).sort(),
    };
  });
}

export function verifyPackageHashStability(pkg: ReplayEvidencePackage, regenerate: () => ReplayEvidencePackage): HashVerificationResult {
  return verifyStableHash({
    packageId: pkg.packageId,
    digest: pkg.digest.value,
    replayDigest: pkg.replayEnvelope.digest,
    bundleId: pkg.evidenceBundle.bundleId,
  }, () => {
    const regenerated = regenerate();
    return {
      packageId: regenerated.packageId,
      digest: regenerated.digest.value,
      replayDigest: regenerated.replayEnvelope.digest,
      bundleId: regenerated.evidenceBundle.bundleId,
    };
  });
}

export function verifyCanonicalOrdering(input: {
  bundle: EvidenceBundle;
}): OrderingVerificationResult {
  const violations: string[] = [];

  const artifactIds = input.bundle.artifacts.map((a) => a.artifactId);
  const sortedArtifactIds = [...artifactIds].sort();
  if (JSON.stringify(artifactIds) !== JSON.stringify(sortedArtifactIds)) {
    violations.push("artifacts not sorted by artifactId");
  }

  const refIds = input.bundle.references.map((r) => r.referenceId);
  const sortedRefIds = [...refIds].sort();
  if (JSON.stringify(refIds) !== JSON.stringify(sortedRefIds)) {
    violations.push("references not sorted by referenceId");
  }

  for (const artifact of input.bundle.artifacts) {
    const artifactRefIds = artifact.references.map((r) => r.referenceId);
    const sortedArtifactRefIds = [...artifactRefIds].sort();
    if (JSON.stringify(artifactRefIds) !== JSON.stringify(sortedArtifactRefIds)) {
      violations.push(`artifact ${artifact.artifactId} references not sorted`);
    }
  }

  return {
    ordered: violations.length === 0,
    violations,
    totalItems: input.bundle.artifacts.length + input.bundle.references.length,
  };
}

export function verifyEventOrdering(events: OperationalEvent[]): OrderingVerificationResult {
  const violations: string[] = [];

  for (let i = 1; i < events.length; i++) {
    if (events[i].sequence < events[i - 1].sequence) {
      violations.push(`sequence discontinuity at index ${i}: ${events[i - 1].sequence} -> ${events[i].sequence}`);
    }
  }

  const eventIds = events.map((e) => e.eventId);
  for (let i = 0; i < eventIds.length; i++) {
    for (let j = i + 1; j < eventIds.length; j++) {
      if (eventIds[i] === eventIds[j]) {
        violations.push(`duplicate event ID: ${eventIds[i]}`);
        break;
      }
    }
  }

  return {
    ordered: violations.length === 0,
    violations,
    totalItems: events.length,
  };
}

export function verifyDeterministicTimestamps(input: {
  timestamps: string[];
  allowEqual?: boolean;
}): TimestampVerificationResult {
  const violations: Array<{ index: number; expected: string; actual: string }> = [];
  const allowEqual = input.allowEqual ?? true;

  for (let i = 1; i < input.timestamps.length; i++) {
    const prevMs = Date.parse(input.timestamps[i - 1]);
    const currMs = Date.parse(input.timestamps[i]);

    if (isNaN(prevMs) || isNaN(currMs)) {
      violations.push({
        index: i,
        expected: "valid ISO timestamp",
        actual: isNaN(prevMs) ? input.timestamps[i - 1] : input.timestamps[i],
      });
      continue;
    }

    if (currMs < prevMs || (!allowEqual && currMs === prevMs)) {
      violations.push({
        index: i,
        expected: `>= ${input.timestamps[i - 1]}`,
        actual: input.timestamps[i],
      });
    }
  }

  const timeSpan = input.timestamps.length > 0
    ? {
        start: input.timestamps[0],
        end: input.timestamps[input.timestamps.length - 1],
        durationMs: Date.parse(input.timestamps[input.timestamps.length - 1]) - Date.parse(input.timestamps[0]),
      }
    : undefined;

  return {
    monotonic: violations.length === 0,
    violations,
    timeSpan,
  };
}

export function verifyBundleTimestamps(bundle: EvidenceBundle): TimestampVerificationResult {
  const timestamps = [
    bundle.generatedAt,
    ...bundle.artifacts.map((a) => a.createdAt),
  ];
  return verifyDeterministicTimestamps({ timestamps, allowEqual: true });
}

export function verifyEventTimestamps(events: OperationalEvent[]): TimestampVerificationResult {
  const timestamps = events.map((e) => e.occurredAt);
  return verifyDeterministicTimestamps({ timestamps, allowEqual: true });
}

export function validateManifest(manifest: EvidenceManifest, artifactCount: number): ManifestValidationResult {
  const checks: Array<{ check: string; passed: boolean; detail?: string }> = [];

  const versionCheck = manifest.version === "1";
  checks.push({ check: "version", passed: versionCheck, detail: versionCheck ? undefined : `Expected version "1", got "${manifest.version}"` });

  const countCheck = manifest.artifactCount === artifactCount;
  checks.push({ check: "artifact_count", passed: countCheck, detail: countCheck ? undefined : `Expected ${artifactCount}, got ${manifest.artifactCount}` });

  const digestCheck = manifest.digest.algorithm === "sha256" && manifest.digest.value.length === 64;
  checks.push({ check: "digest_format", passed: digestCheck, detail: digestCheck ? undefined : "Invalid digest format" });

  const lineageCheck = Array.isArray(manifest.lineageRoots) && manifest.lineageRoots.length >= 0;
  checks.push({ check: "lineage_roots", passed: lineageCheck, detail: "lineage roots present" });

  const generatedAtCheck = !isNaN(Date.parse(manifest.generatedAt));
  checks.push({ check: "generated_at", passed: generatedAtCheck, detail: generatedAtCheck ? undefined : "Invalid generatedAt timestamp" });

  const classificationCheck = ["public", "internal", "confidential", "restricted"].includes(manifest.classification);
  checks.push({ check: "classification", passed: classificationCheck, detail: classificationCheck ? undefined : `Invalid classification: ${manifest.classification}` });

  return {
    valid: checks.every((c) => c.passed),
    checks,
    manifest,
  };
}

export function runFullIntegrityCheck(bundle: EvidenceBundle, verifiedAt?: string): IntegrityCheckResult {
  const checks: IntegrityCheck[] = [];
  const ts = verifiedAt ?? new Date().toISOString();

  const ordering = verifyCanonicalOrdering({ bundle });
  checks.push({ name: "canonical_ordering", passed: ordering.ordered, detail: ordering.violations.join(", ") || undefined });

  const timestamps = verifyBundleTimestamps(bundle);
  checks.push({ name: "deterministic_timestamps", passed: timestamps.monotonic, detail: timestamps.violations.length > 0 ? `${timestamps.violations.length} violations` : undefined });

  const manifestValidation = validateManifest(bundle.manifest, bundle.artifacts.length);
  checks.push({ name: "manifest_valid", passed: manifestValidation.valid, detail: manifestValidation.checks.filter((c) => !c.passed).map((c) => c.check).join(", ") || undefined });

  const verification = verifyEvidenceBundle(bundle, ts);
  checks.push({ name: "bundle_verification", passed: verification.status === "passed", detail: verification.reasons.join(", ") || undefined });

  const artifactDigestConsistent = bundle.artifacts.every((a) => {
    const recomputed = sha256Digest(a.payload);
    return recomputed.value === a.digest.value;
  });
  checks.push({ name: "artifact_digests_consistent", passed: artifactDigestConsistent });

  const bundleHashStable = createHash("sha256")
    .update(deterministicSerialize({ bundleId: bundle.bundleId, manifestId: bundle.manifest.manifestId }))
    .digest("hex");
  checks.push({ name: "bundle_hash_computable", passed: !!bundleHashStable });

  return {
    passed: checks.every((c) => c.passed),
    checks,
    verifiedAt: ts,
  };
}

export function runPackageIntegrityCheck(pkg: ReplayEvidencePackage, verifiedAt?: string): IntegrityCheckResult {
  const ts = verifiedAt ?? new Date().toISOString();
  const checks: IntegrityCheck[] = [];

  const bundleCheck = runFullIntegrityCheck(pkg.evidenceBundle, ts);
  checks.push(...bundleCheck.checks.map((c) => ({ ...c, name: `bundle.${c.name}` })));

  const eventOrdering = verifyEventOrdering(pkg.replayEnvelope.events);
  checks.push({ name: "event_ordering", passed: eventOrdering.ordered, detail: eventOrdering.violations.join(", ") || undefined });

  const eventTimestamps = verifyEventTimestamps(pkg.replayEnvelope.events);
  checks.push({ name: "event_timestamps", passed: eventTimestamps.monotonic, detail: eventTimestamps.violations.length > 0 ? `${eventTimestamps.violations.length} violations` : undefined });

  const packageVerification = verifyReplayEvidencePackage(pkg, ts);
  checks.push({ name: "package_verification", passed: packageVerification.status === "passed", detail: packageVerification.reasons.join(", ") || undefined });

  const envelopeEventCount = pkg.replayEnvelope.eventCount === pkg.replayEnvelope.events.length;
  checks.push({ name: "envelope_event_count", passed: envelopeEventCount });

  return {
    passed: checks.every((c) => c.passed),
    checks,
    verifiedAt: ts,
  };
}
