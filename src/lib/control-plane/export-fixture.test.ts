// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Fixture integrity verification tests.
 *
 * Tests:
 * - Deterministic export ordering
 * - Stable hashes
 * - Fixture reproducibility
 * - Replay fixture integrity
 * - Malformed export rejection
 */

import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";

import { deterministicSerialize } from "./serde";
import {
  sha256Digest,
  buildEvidenceArtifact,
  buildEvidenceBundle,
  buildReplayEvidencePackage,
  exportBundleAsJson,
  exportBundleAsNdjson,
  verifyEvidenceBundle,
} from "./evidence-export";
import { buildReplayEnvelope } from "./replay";
import type { OperationalEvent } from "./operational-memory";
import {
  generateSeededFixture,
  generateReplayFixture,
  generateDegradedFixture,
  generateQueueLeaseFixture,
  generateTrustConflictFixture,
  generatePolicyDenyFixture,
} from "./fixture-generators";
import {
  verifyStableHash,
  verifyBundleHashStability,
  verifyPackageHashStability,
  verifyCanonicalOrdering,
  verifyEventOrdering,
  verifyDeterministicTimestamps,
  verifyBundleTimestamps,
  verifyEventTimestamps,
  validateManifest,
  runFullIntegrityCheck,
  runPackageIntegrityCheck,
} from "./fixture-integrity";
import {
  validateArtifactRedaction,
  validateBundleRedaction,
  validateReplayPackageRedaction,
  validateReceiptRedaction,
  validateEventRedaction,
  generateRedactionReport,
  redactPayloadForExport,
  isExportSafe,
} from "./redaction-validation";
import {
  exportBundleAsMarkdown,
  exportReplayPackageAsMarkdown,
  computeExportHash,
  buildExportManifest,
} from "./evidence-formats";
import {
  generateDemoPack,
  generateEvidenceSnapshot,
  generateDemoWalkthrough,
} from "./demo-packs";
import {
  generateBenchmarkEventStream,
  generateReplayStressFixture,
  generateDiagnosticsStressFixture,
} from "./benchmark-fixtures";

const T0 = "2026-05-09T12:00:00Z";
const T1 = "2026-05-09T12:00:01Z";

function fakeEvent(seq: number, category: OperationalEvent["category"] = "receipt", extra: Record<string, unknown> = {}): OperationalEvent {
  return {
    eventId: `op-test-${seq}`,
    occurredAt: T0,
    sequence: seq,
    category,
    source: "test",
    provenance: { requestId: `req-${seq}` },
    replayRef: { lineage: ["test", `seq-${seq}`], replayVersion: "1" },
    payload: { seq, ...extra },
  };
}

describe("evidence-formats", () => {
  describe("markdown export", () => {
    it("produces valid markdown for a bundle", () => {
      const artifact = buildEvidenceArtifact({
        kind: "receipt",
        classification: "internal",
        createdAt: T0,
        payload: { key: "value" },
        references: [{ referenceId: "ref-1", kind: "receipt", targetId: "r1", lineage: ["test"] }],
        redactSecrets: false,
      });
      const bundle = buildEvidenceBundle({ artifacts: [artifact], generatedAt: T0, classification: "internal" });
      const md = exportBundleAsMarkdown(bundle);
      expect(md).toContain("# Evidence Bundle Export");
      expect(md).toContain("## Summary");
      expect(md).toContain("## Artifacts");
      expect(md).toContain(bundle.bundleId);
    });

    it("produces markdown for a replay package", () => {
      const events = [fakeEvent(0), fakeEvent(1, "execution_plan_created")];
      const envelope = buildReplayEnvelope(events, T0);
      const pkg = buildReplayEvidencePackage({ replayEnvelope: envelope, events, generatedAt: T0 });
      const md = exportReplayPackageAsMarkdown(pkg);
      expect(md).toContain("Replay Evidence Package");
      expect(md).toContain("Governance Events");
    });

    it("respects includeArtifactDetails option", () => {
      const artifact = buildEvidenceArtifact({
        kind: "receipt",
        classification: "internal",
        createdAt: T0,
        payload: { a: 1 },
        references: [],
        redactSecrets: false,
      });
      const bundle = buildEvidenceBundle({ artifacts: [artifact], generatedAt: T0, classification: "internal" });
      const fullMd = exportBundleAsMarkdown(bundle, { includeArtifactDetails: true });
      const noDetailMd = exportBundleAsMarkdown(bundle, { includeArtifactDetails: false });
      expect(fullMd).toContain("## Artifacts");
      expect(noDetailMd).not.toContain("### artifact-");
    });
  });

  describe("computeExportHash", () => {
    it("produces deterministic hashes", () => {
      const content = JSON.stringify({ test: "data" });
      expect(computeExportHash(content)).toBe(computeExportHash(content));
    });

    it("differs for different content", () => {
      const a = computeExportHash("content-a");
      const b = computeExportHash("content-b");
      expect(a).not.toBe(b);
    });

    it("works with Buffer input", () => {
      const buffer = Buffer.from("buffer-content");
      const hash = computeExportHash(buffer);
      expect(hash.length).toBe(64);
    });
  });

  describe("buildExportManifest", () => {
    it("builds manifest with correct fields", () => {
      const content = '{"test":"data"}';
      const manifest = buildExportManifest({
        exportId: "export-test-1",
        generatedAt: T0,
        format: "json",
        classification: "internal",
        artifactCount: 3,
        content,
        metadata: { key: "value" },
      });
      expect(manifest.version).toBe("1");
      expect(manifest.exportId).toBe("export-test-1");
      expect(manifest.format).toBe("json");
      expect(manifest.artifactCount).toBe(3);
      expect(manifest.contentHash.length).toBe(64);
      expect(manifest.metadata.key).toBe("value");
    });
  });
});

describe("fixture-generators", () => {
  describe("generateSeededFixture", () => {
    it("produces deterministic results for same seed", () => {
      const a = generateSeededFixture({ seed: "test-seed", count: 5, baseTimestamp: T0 });
      const b = generateSeededFixture({ seed: "test-seed", count: 5, baseTimestamp: T0 });
      expect(a.events.map((e) => e.eventId)).toEqual(b.events.map((e) => e.eventId));
      expect(a.manifestHash).toBe(b.manifestHash);
    });

    it("produces different results for different seeds", () => {
      const a = generateSeededFixture({ seed: "seed-a", count: 5, baseTimestamp: T0 });
      const b = generateSeededFixture({ seed: "seed-b", count: 5, baseTimestamp: T0 });
      expect(a.events.map((e) => e.eventId)).not.toEqual(b.events.map((e) => e.eventId));
    });

    it("produces events with sequential sequences", () => {
      const result = generateSeededFixture({ count: 10, baseTimestamp: T0 });
      const sequences = result.events.map((e) => e.sequence);
      expect(sequences).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it("produces events with valid replay lineage", () => {
      const result = generateSeededFixture({ count: 5, baseTimestamp: T0 });
      for (const event of result.events) {
        expect(event.replayRef?.lineage.length).toBeGreaterThan(0);
      }
    });

    it("has valid replay envelope", () => {
      const result = generateSeededFixture({ count: 5, baseTimestamp: T0 });
      expect(result.envelope.eventCount).toBe(result.events.length);
      expect(result.envelope.version).toBe("1");
    });
  });

  describe("generateReplayFixture", () => {
    it("generates correct event counts by category", () => {
      const result = generateReplayFixture({ eventCount: 50, baseTimestamp: T0 });
      expect(result.governanceCount + result.diagnosticsCount + result.degradedCount + result.approvalCount + result.fallbackCount).toBeLessThanOrEqual(result.events.length);
    });

    it("produces deterministic results", () => {
      const a = generateReplayFixture({ eventCount: 20, baseTimestamp: T0 });
      const b = generateReplayFixture({ eventCount: 20, baseTimestamp: T0 });
      expect(a.events.map((e) => e.eventId)).toEqual(b.events.map((e) => e.eventId));
    });

    it("has monotonically increasing sequences", () => {
      const result = generateReplayFixture({ eventCount: 30, baseTimestamp: T0 });
      for (let i = 1; i < result.events.length; i++) {
        expect(result.events[i].sequence).toBeGreaterThan(result.events[i - 1].sequence);
      }
    });
  });

  describe("generateDegradedFixture", () => {
    it("generates correct number of degraded states", () => {
      const result = generateDegradedFixture({ count: 10, baseTimestamp: T0 });
      expect(result.states.length).toBe(10);
      expect(result.events.length).toBe(10);
    });

    it("produces deterministic results", () => {
      const a = generateDegradedFixture({ count: 5, baseTimestamp: T0 });
      const b = generateDegradedFixture({ count: 5, baseTimestamp: T0 });
      expect(a.states.map((s) => s.reason)).toEqual(b.states.map((s) => s.reason));
    });

    it("generates valid degraded states", () => {
      const result = generateDegradedFixture({ count: 5, baseTimestamp: T0 });
      for (const state of result.states) {
        expect(["healthy", "constrained", "degraded", "unavailable", "partial_capability", "approval_blocked", "stale", "unreachable", "unknown"]).toContain(state.category);
        expect(["info", "warning", "error", "critical"]).toContain(state.severity);
        expect(state.reasonCode).toBeTruthy();
        expect(state.affectedSubsystem).toBeTruthy();
      }
    });
  });

  describe("generateQueueLeaseFixture", () => {
    it("generates correct number of items and leases", () => {
      const result = generateQueueLeaseFixture({ itemCount: 10, leaseCount: 5, baseTimestamp: T0 });
      expect(result.items.length).toBe(10);
      expect(result.leases.length).toBe(5);
    });

    it("produces deterministic results", () => {
      const a = generateQueueLeaseFixture({ itemCount: 5, leaseCount: 3, baseTimestamp: T0 });
      const b = generateQueueLeaseFixture({ itemCount: 5, leaseCount: 3, baseTimestamp: T0 });
      expect(a.items.map((i) => i.id)).toEqual(b.items.map((i) => i.id));
      expect(a.leases.map((l) => l.id)).toEqual(b.leases.map((l) => l.id));
    });

    it("includes varied queue statuses", () => {
      const result = generateQueueLeaseFixture({ itemCount: 20, leaseCount: 5, baseTimestamp: T0 });
      const statuses = new Set(result.items.map((i) => i.status));
      expect(statuses.size).toBeGreaterThan(1);
    });

    it("includes varied lease statuses", () => {
      const result = generateQueueLeaseFixture({ itemCount: 10, leaseCount: 10, baseTimestamp: T0 });
      const statuses = new Set(result.leases.map((l) => l.status));
      expect(statuses.size).toBeGreaterThan(1);
    });
  });

  describe("generateTrustConflictFixture", () => {
    it("generates correct number of conflict events", () => {
      const result = generateTrustConflictFixture({ conflictCount: 5, baseTimestamp: T0 });
      expect(result.events.length).toBe(5);
      expect(result.conflictCount).toBe(5);
    });

    it("produces deterministic results", () => {
      const a = generateTrustConflictFixture({ conflictCount: 3, baseTimestamp: T0 });
      const b = generateTrustConflictFixture({ conflictCount: 3, baseTimestamp: T0 });
      expect(a.events.map((e) => e.eventId)).toEqual(b.events.map((e) => e.eventId));
    });

    it("generates trust-related event categories", () => {
      const result = generateTrustConflictFixture({ conflictCount: 5, baseTimestamp: T0 });
      for (const event of result.events) {
        expect(event.category).toMatch(/trust_|attestation_/);
      }
    });
  });

  describe("generatePolicyDenyFixture", () => {
    it("generates correct number of deny events", () => {
      const result = generatePolicyDenyFixture({ denyCount: 3, baseTimestamp: T0 });
      expect(result.events.length).toBe(6);
      expect(result.denyCount).toBe(3);
    });

    it("produces deterministic results", () => {
      const a = generatePolicyDenyFixture({ denyCount: 3, baseTimestamp: T0 });
      const b = generatePolicyDenyFixture({ denyCount: 3, baseTimestamp: T0 });
      expect(a.events.map((e) => e.eventId)).toEqual(b.events.map((e) => e.eventId));
    });

    it("generates paired deny events", () => {
      const result = generatePolicyDenyFixture({ denyCount: 2, baseTimestamp: T0 });
      const categories = result.events.map((e) => e.category);
      expect(categories).toContain("execution_authorization_denied");
      expect(categories).toContain("execution_plan_rejected");
    });
  });
});

describe("redaction-validation", () => {
  describe("validateArtifactRedaction", () => {
    it("passes for clean payloads", () => {
      const artifact = buildEvidenceArtifact({
        kind: "receipt",
        classification: "internal",
        createdAt: T0,
        payload: { clean: "data", no: "secrets" },
        references: [],
        redactSecrets: false,
      });
      const result = validateArtifactRedaction(artifact);
      expect(result.valid).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it("detects token patterns in payloads", () => {
      const artifact = buildEvidenceArtifact({
        kind: "receipt",
        classification: "internal",
        createdAt: T0,
        payload: { token: "nvapi-secret-value-1234567890abcdef" },
        references: [],
        redactSecrets: false,
      });
      const result = validateArtifactRedaction(artifact);
      expect(result.valid).toBe(false);
      expect(result.secretsFound).toBeGreaterThan(0);
    });

    it("detects Bearer tokens in payloads", () => {
      const artifact = buildEvidenceArtifact({
        kind: "receipt",
        classification: "internal",
        createdAt: T0,
        payload: { auth: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature" },
        references: [],
        redactSecrets: false,
      });
      const result = validateArtifactRedaction(artifact);
      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.type === "auth_header")).toBe(true);
    });

    it("detects secret-bearing keys", () => {
      const artifact = buildEvidenceArtifact({
        kind: "receipt",
        classification: "internal",
        createdAt: T0,
        payload: { API_KEY: "should-be-redacted", normalField: "ok" },
        references: [],
        redactSecrets: false,
      });
      const result = validateArtifactRedaction(artifact);
      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.type === "auth_header" || v.type === "env_like_key")).toBe(true);
    });
  });

  describe("validateBundleRedaction", () => {
    it("passes for bundles without secrets", () => {
      const artifact = buildEvidenceArtifact({
        kind: "receipt",
        classification: "internal",
        createdAt: T0,
        payload: { clean: "data" },
        references: [],
        redactSecrets: false,
      });
      const bundle = buildEvidenceBundle({ artifacts: [artifact], generatedAt: T0, classification: "internal" });
      const result = validateBundleRedaction(bundle);
      expect(result.valid).toBe(true);
    });

    it("detects secrets across multiple artifacts", () => {
      const cleanArtifact = buildEvidenceArtifact({
        kind: "receipt",
        classification: "internal",
        createdAt: T0,
        payload: { clean: "data" },
        references: [],
        redactSecrets: false,
      });
      const secretArtifact = buildEvidenceArtifact({
        kind: "receipt",
        classification: "internal",
        createdAt: T0,
        payload: { apiKey: "sk-proj-test-secret-1234567890" },
        references: [],
        redactSecrets: false,
      });
      const bundle = buildEvidenceBundle({ artifacts: [cleanArtifact, secretArtifact], generatedAt: T0, classification: "internal" });
      const result = validateBundleRedaction(bundle);
      expect(result.valid).toBe(false);
      expect(result.secretsFound).toBeGreaterThan(0);
    });
  });

  describe("validateReplayPackageRedaction", () => {
    it("passes for clean packages", () => {
      const events = [fakeEvent(0), fakeEvent(1)];
      const envelope = buildReplayEnvelope(events, T0);
      const pkg = buildReplayEvidencePackage({ replayEnvelope: envelope, events, generatedAt: T0 });
      const result = validateReplayPackageRedaction(pkg);
      expect(result.valid).toBe(true);
    });

    it("detects secrets in event payloads", () => {
      const events = [
        fakeEvent(0, "receipt", { secret: "nvapi-test-secret-value-1234567890" }),
        fakeEvent(1),
      ];
      const envelope = buildReplayEnvelope(events, T0);
      const pkg = buildReplayEvidencePackage({ replayEnvelope: envelope, events, generatedAt: T0 });
      const result = validateReplayPackageRedaction(pkg);
      expect(result.valid).toBe(false);
      expect(result.secretsFound).toBeGreaterThan(0);
    });
  });

  describe("validateReceiptRedaction", () => {
    it("passes for clean receipts", () => {
      const receipt = {
        version: "1",
        receiptId: "test-receipt",
        requestId: "test-request",
        createdAt: T0,
        phases: [{ phase: "received" as const, at: T0 }],
        degradedEvents: [],
        fallbackAttempts: [],
        toolInvocations: [],
        timing: {},
        provenance: { source: "test", lineage: ["test"], replayVersion: "1" },
        operatorOverrides: [],
      };
      const result = validateReceiptRedaction(receipt);
      expect(result.valid).toBe(true);
    });
  });

  describe("validateEventRedaction", () => {
    it("passes for clean events", () => {
      const event = fakeEvent(0);
      const result = validateEventRedaction(event);
      expect(result.valid).toBe(true);
    });

    it("detects secrets in event payloads", () => {
      const event = fakeEvent(0, "receipt", { apiKey: "sk-proj-test-secret-1234567890" });
      const result = validateEventRedaction(event);
      expect(result.valid).toBe(false);
    });
  });

  describe("generateRedactionReport", () => {
    it("generates report for bundles", () => {
      const artifact = buildEvidenceArtifact({
        kind: "receipt",
        classification: "internal",
        createdAt: T0,
        payload: { clean: "data" },
        references: [],
        redactSecrets: false,
      });
      const bundle = buildEvidenceBundle({ artifacts: [artifact], generatedAt: T0, classification: "internal" });
      const report = generateRedactionReport({ bundle });
      expect(report.bundleId).toBe(bundle.bundleId);
      expect(report.result.valid).toBe(true);
    });

    it("generates report for packages", () => {
      const events = [fakeEvent(0)];
      const envelope = buildReplayEnvelope(events, T0);
      const pkg = buildReplayEvidencePackage({ replayEnvelope: envelope, events, generatedAt: T0 });
      const report = generateRedactionReport({ pkg });
      expect(report.packageId).toBe(pkg.packageId);
      expect(report.result.valid).toBe(true);
    });
  });

  describe("redactPayloadForExport", () => {
    it("redacts secrets from payloads", () => {
      const payload = { NVIDIA_API_KEY: "nvapi-secret-1234567890", normalField: "ok" };
      const redacted = redactPayloadForExport(payload);
      expect(redacted.NVIDIA_API_KEY).toBe("<REDACTED>");
      expect(redacted.normalField).toBe("ok");
    });
  });

  describe("isExportSafe", () => {
    it("returns true for safe payloads", () => {
      expect(isExportSafe({ clean: "data" })).toBe(true);
    });

    it("returns false for unsafe payloads", () => {
      expect(isExportSafe({ apiKey: "nvapi-secret-1234567890" })).toBe(false);
    });
  });
});

describe("fixture-integrity", () => {
  describe("verifyStableHash", () => {
    it("verifies stable hashes", () => {
      const value = { x: 1, y: 2 };
      const result = verifyStableHash(value, () => ({ x: 1, y: 2 }));
      expect(result.stable).toBe(true);
    });

    it("detects unstable hashes", () => {
      const value = { x: 1 };
      const result = verifyStableHash(value, () => ({ x: 2 }));
      expect(result.stable).toBe(false);
      expect(result.mismatch).toBeTruthy();
    });
  });

  describe("verifyBundleHashStability", () => {
    it("verifies bundle hash stability", () => {
      const artifact = buildEvidenceArtifact({
        kind: "receipt",
        classification: "internal",
        createdAt: T0,
        payload: { x: 1 },
        references: [],
        redactSecrets: false,
      });
      const bundle = buildEvidenceBundle({ artifacts: [artifact], generatedAt: T0, classification: "internal" });
      const result = verifyBundleHashStability(bundle, () =>
        buildEvidenceBundle({ artifacts: [artifact], generatedAt: T0, classification: "internal" }),
      );
      expect(result.stable).toBe(true);
    });
  });

  describe("verifyCanonicalOrdering", () => {
    it("passes for correctly ordered bundles", () => {
      const artifact = buildEvidenceArtifact({
        kind: "receipt",
        classification: "internal",
        createdAt: T0,
        payload: { x: 1 },
        references: [],
        redactSecrets: false,
      });
      const bundle = buildEvidenceBundle({ artifacts: [artifact], generatedAt: T0, classification: "internal" });
      const result = verifyCanonicalOrdering({ bundle });
      expect(result.ordered).toBe(true);
    });

    it("detects ordering violations", () => {
      const a1 = buildEvidenceArtifact({
        kind: "receipt",
        classification: "internal",
        createdAt: T0,
        payload: { z: 1 },
        references: [],
        redactSecrets: false,
      });
      const a2 = buildEvidenceArtifact({
        kind: "receipt",
        classification: "internal",
        createdAt: T0,
        payload: { a: 1 },
        references: [],
        redactSecrets: false,
      });
      const bundle = buildEvidenceBundle({ artifacts: [a1, a2], generatedAt: T0, classification: "internal" });
      const result = verifyCanonicalOrdering({ bundle });
      expect(result.ordered).toBe(true);
    });
  });

  describe("verifyEventOrdering", () => {
    it("passes for correctly ordered events", () => {
      const events = [fakeEvent(0), fakeEvent(1), fakeEvent(2)];
      const result = verifyEventOrdering(events);
      expect(result.ordered).toBe(true);
    });

    it("detects sequence discontinuities", () => {
      const events = [fakeEvent(0), fakeEvent(5), fakeEvent(2)];
      const result = verifyEventOrdering(events);
      expect(result.ordered).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it("detects duplicate event IDs", () => {
      const events = [fakeEvent(0), fakeEvent(0)];
      const result = verifyEventOrdering(events);
      expect(result.ordered).toBe(false);
    });
  });

  describe("verifyDeterministicTimestamps", () => {
    it("passes for monotonically increasing timestamps", () => {
      const result = verifyDeterministicTimestamps({
        timestamps: [T0, "2026-05-09T12:00:02Z", "2026-05-09T12:00:03Z"],
      });
      expect(result.monotonic).toBe(true);
    });

    it("detects non-monotonic timestamps", () => {
      const result = verifyDeterministicTimestamps({
        timestamps: ["2026-05-09T12:00:03Z", "2026-05-09T12:00:01Z"],
        allowEqual: false,
      });
      expect(result.monotonic).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it("allows equal timestamps when configured", () => {
      const result = verifyDeterministicTimestamps({
        timestamps: [T0, T0, T0],
        allowEqual: true,
      });
      expect(result.monotonic).toBe(true);
    });

    it("computes time span correctly", () => {
      const result = verifyDeterministicTimestamps({
        timestamps: [T0, "2026-05-09T12:01:00Z"],
      });
      expect(result.timeSpan?.durationMs).toBe(60000);
    });
  });

  describe("validateManifest", () => {
    it("validates correct manifests", () => {
      const artifact = buildEvidenceArtifact({
        kind: "receipt",
        classification: "internal",
        createdAt: T0,
        payload: {},
        references: [],
        redactSecrets: false,
      });
      const bundle = buildEvidenceBundle({ artifacts: [artifact], generatedAt: T0, classification: "internal" });
      const result = validateManifest(bundle.manifest, 1);
      expect(result.valid).toBe(true);
    });

    it("rejects invalid artifact count", () => {
      const artifact = buildEvidenceArtifact({
        kind: "receipt",
        classification: "internal",
        createdAt: T0,
        payload: {},
        references: [],
        redactSecrets: false,
      });
      const bundle = buildEvidenceBundle({ artifacts: [artifact], generatedAt: T0, classification: "internal" });
      const result = validateManifest(bundle.manifest, 99);
      expect(result.valid).toBe(false);
      expect(result.checks.some((c) => c.check === "artifact_count" && !c.passed)).toBe(true);
    });
  });

  describe("runFullIntegrityCheck", () => {
    it("passes for valid bundles", () => {
      const artifact = buildEvidenceArtifact({
        kind: "receipt",
        classification: "internal",
        createdAt: T0,
        payload: { x: 1 },
        references: [{ referenceId: "ref-1", kind: "receipt", targetId: "r1", lineage: ["test"] }],
        redactSecrets: false,
      });
      const bundle = buildEvidenceBundle({ artifacts: [artifact], generatedAt: T0, classification: "internal" });
      const result = runFullIntegrityCheck(bundle, T1);
      expect(result.passed).toBe(true);
    });
  });

  describe("runPackageIntegrityCheck", () => {
    it("passes for valid packages", () => {
      const events = [fakeEvent(0), fakeEvent(1)];
      const envelope = buildReplayEnvelope(events, T0);
      const pkg = buildReplayEvidencePackage({ replayEnvelope: envelope, events, generatedAt: T0 });
      const result = runPackageIntegrityCheck(pkg, T1);
      expect(result.passed).toBe(true);
    });
  });
});

describe("demo-packs", () => {
  describe("generateDemoPack", () => {
    it("generates a demo pack with correct structure", () => {
      const pack = generateDemoPack({ baseTimestamp: T0, eventCount: 10 });
      expect(pack.packId).toBeTruthy();
      expect(pack.generatedAt).toBe(T0);
      expect(pack.events.length).toBeGreaterThan(0);
      expect(pack.walkthrough.length).toBeGreaterThan(0);
      expect(pack.summary.totalEvents).toBe(pack.events.length);
    });

    it("produces deterministic demo packs", () => {
      const a = generateDemoPack({ seed: "test-demo", baseTimestamp: T0, eventCount: 10 });
      const b = generateDemoPack({ seed: "test-demo", baseTimestamp: T0, eventCount: 10 });
      expect(a.packId).toBe(b.packId);
      expect(a.summary.packHash).toBe(b.summary.packHash);
    });

    it("respects include options", () => {
      const packNoWalk = generateDemoPack({ baseTimestamp: T0, eventCount: 10, includeWalkthrough: false });
      expect(packNoWalk.walkthrough).toEqual([]);
    });
  });

  describe("generateDemoWalkthrough", () => {
    it("generates steps for various event types", () => {
      const events = [
        fakeEvent(0, "execution_plan_created"),
        fakeEvent(1, "execution_plan_approved"),
        fakeEvent(2, "degraded_state", { degraded: { category: "degraded", reason: "test", affectedSubsystem: "test", severity: "info", reasonCode: "unknown_error", explanation: "test", sourceComponent: "test", timestamp: T0 } }),
        fakeEvent(3, "fallback"),
      ];
      const steps = generateDemoWalkthrough(events);
      expect(steps.length).toBeGreaterThan(1);
      expect(steps[0].title).toBe("Demo Initialization");
    });

    it("handles empty event list", () => {
      const steps = generateDemoWalkthrough([]);
      expect(steps.length).toBeGreaterThan(0);
    });
  });

  describe("generateEvidenceSnapshot", () => {
    it("generates a snapshot with correct structure", () => {
      const snapshot = generateEvidenceSnapshot({
        baseTimestamp: T0,
        classification: "internal",
        eventCategories: ["receipt", "policy_outcome", "degraded_state"],
      });
      expect(snapshot.snapshotId).toBeTruthy();
      expect(snapshot.events.length).toBe(3);
      expect(snapshot.snapshotHash.length).toBe(64);
    });

    it("produces deterministic snapshots", () => {
      const a = generateEvidenceSnapshot({
        baseTimestamp: T0,
        classification: "internal",
        eventCategories: ["receipt", "policy_outcome"],
      });
      const b = generateEvidenceSnapshot({
        baseTimestamp: T0,
        classification: "internal",
        eventCategories: ["receipt", "policy_outcome"],
      });
      expect(a.snapshotId).toBe(b.snapshotId);
      expect(a.snapshotHash).toBe(b.snapshotHash);
    });
  });
});

describe("benchmark-fixtures", () => {
  describe("generateBenchmarkEventStream", () => {
    it("generates correct number of events", () => {
      const result = generateBenchmarkEventStream({ eventCount: 100, baseTimestamp: T0 });
      expect(result.events.length).toBe(100);
    });

    it("produces deterministic results", () => {
      const a = generateBenchmarkEventStream({ eventCount: 50, seed: "bench-test", baseTimestamp: T0 });
      const b = generateBenchmarkEventStream({ eventCount: 50, seed: "bench-test", baseTimestamp: T0 });
      expect(a.events.map((e) => e.eventId)).toEqual(b.events.map((e) => e.eventId));
      expect(a.streamHash).toBe(b.streamHash);
    });

    it("generates category mix", () => {
      const result = generateBenchmarkEventStream({ eventCount: 200, baseTimestamp: T0 });
      expect(Object.keys(result.categoryCounts).length).toBeGreaterThan(3);
      const totalCategories = Object.values(result.categoryCounts).reduce((sum, c) => sum + c, 0);
      expect(totalCategories).toBe(200);
    });

    it("generates valid envelope", () => {
      const result = generateBenchmarkEventStream({ eventCount: 100, baseTimestamp: T0 });
      expect(result.envelope.eventCount).toBe(100);
      expect(result.envelope.version).toBe("1");
    });

    it("produces correct payload sizes", () => {
      const small = generateBenchmarkEventStream({ eventCount: 5, baseTimestamp: T0, payloadSize: "small" });
      const large = generateBenchmarkEventStream({ eventCount: 5, baseTimestamp: T0, payloadSize: "large" });
      expect(JSON.stringify(large.events[0].payload).length).toBeGreaterThan(JSON.stringify(small.events[0].payload).length);
    });
  });

  describe("generateReplayStressFixture", () => {
    it("generates correct number of events", () => {
      const result = generateReplayStressFixture({ eventCount: 100, baseTimestamp: T0 });
      expect(result.events.length).toBe(100);
    });

    it("produces deterministic results", () => {
      const a = generateReplayStressFixture({ eventCount: 50, seed: "stress-test", baseTimestamp: T0 });
      const b = generateReplayStressFixture({ eventCount: 50, seed: "stress-test", baseTimestamp: T0 });
      expect(a.events.map((e) => e.eventId)).toEqual(b.events.map((e) => e.eventId));
      expect(a.fixtureHash).toBe(b.fixtureHash);
    });

    it("generates size metrics", () => {
      const result = generateReplayStressFixture({ eventCount: 100, baseTimestamp: T0 });
      expect(result.eventSize).toBeGreaterThan(0);
      expect(result.envelopeSize).toBeGreaterThan(0);
      expect(result.packageSize).toBeGreaterThan(0);
    });

    it("includes full lineage when enabled", () => {
      const result = generateReplayStressFixture({ eventCount: 5, baseTimestamp: T0, includeFullLineage: true });
      for (const event of result.events) {
        expect(event.replayRef?.lineage.length).toBeGreaterThan(2);
      }
    });

    it("includes nested payloads when enabled", () => {
      const result = generateReplayStressFixture({ eventCount: 5, baseTimestamp: T0, includeNestedPayloads: true });
      for (const event of result.events) {
        expect(event.payload.nested).toBeDefined();
      }
    });
  });

  describe("generateDiagnosticsStressFixture", () => {
    it("generates correct number of events", () => {
      const result = generateDiagnosticsStressFixture({ diagnosticCount: 100, baseTimestamp: T0 });
      expect(result.events.length).toBe(100);
    });

    it("produces deterministic results", () => {
      const a = generateDiagnosticsStressFixture({ diagnosticCount: 50, seed: "diag-test", baseTimestamp: T0 });
      const b = generateDiagnosticsStressFixture({ diagnosticCount: 50, seed: "diag-test", baseTimestamp: T0 });
      expect(a.events.map((e) => e.eventId)).toEqual(b.events.map((e) => e.eventId));
      expect(a.fixtureHash).toBe(b.fixtureHash);
    });

    it("generates telemetry events", () => {
      const result = generateDiagnosticsStressFixture({ diagnosticCount: 100, baseTimestamp: T0, includeTelemetry: true });
      expect(result.telemetryCount).toBeGreaterThan(0);
    });

    it("generates diagnostics snapshots", () => {
      const result = generateDiagnosticsStressFixture({ diagnosticCount: 100, baseTimestamp: T0 });
      expect(result.diagnosticsSnapshotCount).toBeGreaterThan(0);
    });

    it("generates valid event categories", () => {
      const result = generateDiagnosticsStressFixture({ diagnosticCount: 50, baseTimestamp: T0 });
      const categories = new Set(result.events.map((e) => e.category));
      for (const category of categories) {
        expect(category).toMatch(/diagnostics_|telemetry_|replay_metadata/);
      }
    });
  });
});

describe("deterministic export ordering", () => {
  it("bundle hash stable across artifact insertion order", () => {
    const a1 = buildEvidenceArtifact({
      kind: "receipt",
      classification: "internal",
      createdAt: T0,
      payload: { x: 1 },
      references: [],
      redactSecrets: false,
    });
    const a2 = buildEvidenceArtifact({
      kind: "receipt",
      classification: "internal",
      createdAt: T0,
      payload: { y: 2 },
      references: [],
      redactSecrets: false,
    });
    const bundleA = buildEvidenceBundle({ artifacts: [a1, a2], generatedAt: T0, classification: "internal" });
    const bundleB = buildEvidenceBundle({ artifacts: [a2, a1], generatedAt: T0, classification: "internal" });
    expect(bundleA.bundleId).toBe(bundleB.bundleId);
    expect(bundleA.manifest.digest.value).toBe(bundleB.manifest.digest.value);
  });

  it("export JSON is deterministic", () => {
    const artifact = buildEvidenceArtifact({
      kind: "receipt",
      classification: "internal",
      createdAt: T0,
      payload: { b: 2, a: 1 },
      references: [],
      redactSecrets: false,
    });
    const bundle = buildEvidenceBundle({ artifacts: [artifact], generatedAt: T0, classification: "internal" });
    const a = exportBundleAsJson(bundle);
    const b = exportBundleAsJson(bundle);
    expect(a).toBe(b);
  });

  it("export NDJSON is deterministic", () => {
    const artifact = buildEvidenceArtifact({
      kind: "receipt",
      classification: "internal",
      createdAt: T0,
      payload: { x: 1 },
      references: [],
      redactSecrets: false,
    });
    const bundle = buildEvidenceBundle({ artifacts: [artifact], generatedAt: T0, classification: "internal" });
    const a = exportBundleAsNdjson(bundle);
    const b = exportBundleAsNdjson(bundle);
    expect(a).toBe(b);
  });
});

describe("stable hashes", () => {
  it("artifact IDs are stable", () => {
    const a = buildEvidenceArtifact({
      kind: "receipt",
      classification: "internal",
      createdAt: T0,
      payload: { k: "v" },
      references: [],
      redactSecrets: false,
    });
    const b = buildEvidenceArtifact({
      kind: "receipt",
      classification: "internal",
      createdAt: T0,
      payload: { k: "v" },
      references: [],
      redactSecrets: false,
    });
    expect(a.artifactId).toBe(b.artifactId);
    expect(a.digest.value).toBe(b.digest.value);
  });

  it("bundle IDs are stable", () => {
    const artifact = buildEvidenceArtifact({
      kind: "receipt",
      classification: "internal",
      createdAt: T0,
      payload: { x: 1 },
      references: [],
      redactSecrets: false,
    });
    const a = buildEvidenceBundle({ artifacts: [artifact], generatedAt: T0, classification: "internal" });
    const b = buildEvidenceBundle({ artifacts: [artifact], generatedAt: T0, classification: "internal" });
    expect(a.bundleId).toBe(b.bundleId);
    expect(a.manifest.manifestId).toBe(b.manifest.manifestId);
  });
});

describe("replay fixture integrity", () => {
  it("replay fixtures have valid envelopes", () => {
    const result = generateReplayFixture({ eventCount: 20, baseTimestamp: T0 });
    expect(result.envelope.version).toBe("1");
    expect(result.envelope.eventCount).toBe(result.events.length);
    expect(result.envelope.digest).toBeTruthy();
  });

  it("replay fixtures have monotonically increasing timestamps", () => {
    const result = generateReplayFixture({ eventCount: 30, baseTimestamp: T0 });
    const timestamps = result.events.map((e) => e.occurredAt);
    const tsResult = verifyDeterministicTimestamps({ timestamps });
    expect(tsResult.monotonic).toBe(true);
  });

  it("replay fixtures have valid event ordering", () => {
    const result = generateReplayFixture({ eventCount: 25, baseTimestamp: T0 });
    const ordering = verifyEventOrdering(result.events);
    expect(ordering.ordered).toBe(true);
  });
});
