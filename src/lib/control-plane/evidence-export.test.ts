// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import {
  sha256Digest,
  buildEvidenceArtifact,
  buildEvidenceBundle,
  buildEvidenceBundleFromEvents,
  buildReplayEvidencePackage,
  exportBundleAsJson,
  exportBundleAsNdjson,
  exportBundle,
  exportReplayPackage,
  verifyEvidenceBundle,
  verifyReplayEvidencePackage,
  evidenceContainsSecrets,
  buildReceiptReference,
  buildEventReference,
} from "./evidence-export";
import { DEFAULT_PROOFPACK_EXPORT_OPTIONS } from "./evidence-types";
import type { OperationalEvent } from "./operational-memory";
import type { ReplayEnvelope } from "./replay";
import { buildReplayEnvelope } from "./replay";

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

describe("evidence-export", () => {
  describe("sha256Digest", () => {
    it("produces deterministic digests for identical inputs", () => {
      const a = sha256Digest({ x: 1, y: 2 });
      const b = sha256Digest({ y: 2, x: 1 });
      expect(a.algorithm).toBe("sha256");
      expect(a.value).toBe(b.value);
    });

    it("differs for different inputs", () => {
      expect(sha256Digest({ a: 1 }).value).not.toBe(sha256Digest({ a: 2 }).value);
    });
  });

  describe("buildEvidenceArtifact", () => {
    it("produces deterministic artifact IDs", () => {
      const a = buildEvidenceArtifact({ kind: "receipt", classification: "internal", createdAt: T0, payload: { k: "v" }, references: [], redactSecrets: false });
      const b = buildEvidenceArtifact({ kind: "receipt", classification: "internal", createdAt: T0, payload: { k: "v" }, references: [], redactSecrets: false });
      expect(a.artifactId).toBe(b.artifactId);
      expect(a.digest.value).toBe(b.digest.value);
    });

    it("redacts secrets when requested", () => {
      const secret = { NVIDIA_API_KEY: "nvapi-secret-1234567890" };
      const artifact = buildEvidenceArtifact({ kind: "receipt", classification: "internal", createdAt: T0, payload: secret, references: [], redactSecrets: true });
      expect(artifact.redacted).toBe(true);
      expect(JSON.stringify(artifact.payload)).not.toContain("nvapi-secret");
    });

    it("sorts references deterministically", () => {
      const refs = [
        { referenceId: "ref-z", kind: "event" as const, targetId: "z", lineage: ["z"] },
        { referenceId: "ref-a", kind: "event" as const, targetId: "a", lineage: ["a"] },
      ];
      const artifact = buildEvidenceArtifact({ kind: "receipt", classification: "internal", createdAt: T0, payload: {}, references: refs, redactSecrets: false });
      expect(artifact.references[0].referenceId).toBe("ref-a");
    });
  });

  describe("buildEvidenceBundle", () => {
    it("produces deterministic bundle and manifest IDs", () => {
      const artifact = buildEvidenceArtifact({ kind: "receipt", classification: "internal", createdAt: T0, payload: { x: 1 }, references: [], redactSecrets: false });
      const a = buildEvidenceBundle({ artifacts: [artifact], generatedAt: T0, classification: "internal" });
      const b = buildEvidenceBundle({ artifacts: [artifact], generatedAt: T0, classification: "internal" });
      expect(a.bundleId).toBe(b.bundleId);
      expect(a.manifest.manifestId).toBe(b.manifest.manifestId);
      expect(a.manifest.digest.value).toBe(b.manifest.digest.value);
    });

    it("sorts artifacts by artifactId", () => {
      const a1 = buildEvidenceArtifact({ kind: "receipt", classification: "internal", createdAt: T0, payload: { z: 1 }, references: [], redactSecrets: false });
      const a2 = buildEvidenceArtifact({ kind: "receipt", classification: "internal", createdAt: T0, payload: { a: 1 }, references: [], redactSecrets: false });
      const bundle = buildEvidenceBundle({ artifacts: [a1, a2], generatedAt: T0, classification: "internal" });
      const ids = bundle.artifacts.map((a) => a.artifactId);
      expect(ids).toEqual([...ids].sort());
    });

    it("sets artifact count correctly", () => {
      const a1 = buildEvidenceArtifact({ kind: "receipt", classification: "internal", createdAt: T0, payload: { a: 1 }, references: [], redactSecrets: false });
      const bundle = buildEvidenceBundle({ artifacts: [a1], generatedAt: T0, classification: "internal" });
      expect(bundle.manifest.artifactCount).toBe(1);
    });
  });

  describe("verifyEvidenceBundle", () => {
    it("passes for valid bundles", () => {
      const artifact = buildEvidenceArtifact({ kind: "receipt", classification: "internal", createdAt: T0, payload: { x: 1 }, references: [{ referenceId: "ref-1", kind: "receipt", targetId: "r1", lineage: ["test"] }], redactSecrets: false });
      const bundle = buildEvidenceBundle({ artifacts: [artifact], generatedAt: T0, classification: "internal" });
      const result = verifyEvidenceBundle(bundle, T1);
      expect(result.status).toBe("passed");
      expect(result.manifestDigestMatch).toBe(true);
      expect(result.lineageComplete).toBe(true);
      expect(result.reasons).toEqual([]);
    });

    it("rejects tampered artifact payloads", () => {
      const artifact = buildEvidenceArtifact({ kind: "receipt", classification: "internal", createdAt: T0, payload: { x: 1 }, references: [], redactSecrets: false });
      const bundle = buildEvidenceBundle({ artifacts: [artifact], generatedAt: T0, classification: "internal" });
      bundle.artifacts[0].payload = { x: 999 };
      const result = verifyEvidenceBundle(bundle, T1);
      expect(result.status).toBe("failed");
      expect(result.reasons.some((r) => r.includes("artifact_digest_mismatch"))).toBe(true);
    });

    it("rejects tampered manifest digest", () => {
      const artifact = buildEvidenceArtifact({ kind: "receipt", classification: "internal", createdAt: T0, payload: { x: 1 }, references: [], redactSecrets: false });
      const bundle = buildEvidenceBundle({ artifacts: [artifact], generatedAt: T0, classification: "internal" });
      bundle.manifest.digest = { algorithm: "sha256", value: "bad" };
      const result = verifyEvidenceBundle(bundle, T1);
      expect(result.status).toBe("failed");
      expect(result.reasons).toContain("manifest_digest_mismatch");
    });

    it("rejects artifact count mismatch", () => {
      const artifact = buildEvidenceArtifact({ kind: "receipt", classification: "internal", createdAt: T0, payload: { x: 1 }, references: [], redactSecrets: false });
      const bundle = buildEvidenceBundle({ artifacts: [artifact], generatedAt: T0, classification: "internal" });
      bundle.manifest.artifactCount = 99;
      const result = verifyEvidenceBundle(bundle, T1);
      expect(result.status).toBe("failed");
      expect(result.reasons).toContain("artifact_count_mismatch");
    });

    it("flags incomplete lineage", () => {
      const artifact = buildEvidenceArtifact({ kind: "receipt", classification: "internal", createdAt: T0, payload: { x: 1 }, references: [{ referenceId: "ref-1", kind: "receipt", targetId: "r1", lineage: [] }], redactSecrets: false });
      const bundle = buildEvidenceBundle({ artifacts: [artifact], generatedAt: T0, classification: "internal" });
      const result = verifyEvidenceBundle(bundle, T1);
      expect(result.status).toBe("failed");
      expect(result.reasons).toContain("incomplete_lineage");
    });
  });

  describe("buildEvidenceBundleFromEvents", () => {
    it("builds bundle with deterministic ordering", () => {
      const events = [fakeEvent(2, "degraded_state"), fakeEvent(0, "receipt"), fakeEvent(1, "fallback")];
      const bundle = buildEvidenceBundleFromEvents(events, T0);
      expect(bundle.artifacts.length).toBe(3);
      const ids = bundle.artifacts.map((a) => a.artifactId);
      expect(ids).toEqual([...ids].sort((a, b) => a.localeCompare(b)));
    });

    it("filters governance events when disabled", () => {
      const events = [fakeEvent(0, "execution_plan_created"), fakeEvent(1, "receipt")];
      const bundle = buildEvidenceBundleFromEvents(events, T0, { ...DEFAULT_PROOFPACK_EXPORT_OPTIONS, includeGovernanceEvents: false });
      expect(bundle.artifacts.length).toBe(1);
    });

    it("filters diagnostics when disabled", () => {
      const events = [fakeEvent(0, "diagnostics_snapshot"), fakeEvent(1, "receipt")];
      const bundle = buildEvidenceBundleFromEvents(events, T0, { ...DEFAULT_PROOFPACK_EXPORT_OPTIONS, includeDiagnostics: false });
      expect(bundle.artifacts.length).toBe(1);
    });
  });

  describe("buildReplayEvidencePackage", () => {
    it("assembles package with replay envelope", () => {
      const events = [fakeEvent(0, "receipt"), fakeEvent(1, "execution_plan_created"), fakeEvent(2, "degraded_state", { degraded: { category: "degraded", reason: "test", affectedSubsystem: "test", severity: "info", reasonCode: "unknown_error", explanation: "test", sourceComponent: "test", timestamp: T0 } })];
      const envelope = buildReplayEnvelope(events, T0);
      const pkg = buildReplayEvidencePackage({ replayEnvelope: envelope, events, generatedAt: T0 });
      expect(pkg.version).toBe("1");
      expect(pkg.packageId).toBeTruthy();
      expect(pkg.governanceEvents.length).toBe(1);
      expect(pkg.degradedStates.length).toBe(1);
      expect(pkg.evidenceBundle.artifacts.length).toBe(3);
    });

    it("produces deterministic package digest", () => {
      const events = [fakeEvent(0), fakeEvent(1)];
      const envelope = buildReplayEnvelope(events, T0);
      const a = buildReplayEvidencePackage({ replayEnvelope: envelope, events, generatedAt: T0 });
      const b = buildReplayEvidencePackage({ replayEnvelope: envelope, events, generatedAt: T0 });
      expect(a.packageId).toBe(b.packageId);
      expect(a.digest.value).toBe(b.digest.value);
    });
  });

  describe("verifyReplayEvidencePackage", () => {
    it("passes for valid packages", () => {
      const events = [fakeEvent(0), fakeEvent(1)];
      const envelope = buildReplayEnvelope(events, T0);
      const pkg = buildReplayEvidencePackage({ replayEnvelope: envelope, events, generatedAt: T0 });
      const result = verifyReplayEvidencePackage(pkg, T1);
      expect(result.status).toBe("passed");
    });

    it("rejects tampered package digest", () => {
      const events = [fakeEvent(0)];
      const envelope = buildReplayEnvelope(events, T0);
      const pkg = buildReplayEvidencePackage({ replayEnvelope: envelope, events, generatedAt: T0 });
      pkg.digest = { algorithm: "sha256", value: "tampered" };
      const result = verifyReplayEvidencePackage(pkg, T1);
      expect(result.status).toBe("failed");
      expect(result.reasons).toContain("package_digest_mismatch");
    });

    it("rejects replay event count mismatch", () => {
      const events = [fakeEvent(0)];
      const envelope = buildReplayEnvelope(events, T0);
      const pkg = buildReplayEvidencePackage({ replayEnvelope: envelope, events, generatedAt: T0 });
      pkg.replayEnvelope.eventCount = 999;
      const result = verifyReplayEvidencePackage(pkg, T1);
      expect(result.status).toBe("failed");
      expect(result.reasons).toContain("replay_event_count_mismatch");
    });
  });

  describe("export serialization", () => {
    it("JSON export is deterministic", () => {
      const artifact = buildEvidenceArtifact({ kind: "receipt", classification: "internal", createdAt: T0, payload: { b: 2, a: 1 }, references: [], redactSecrets: false });
      const bundle = buildEvidenceBundle({ artifacts: [artifact], generatedAt: T0, classification: "internal" });
      const a = exportBundleAsJson(bundle);
      const b = exportBundleAsJson(bundle);
      expect(a).toBe(b);
      expect(JSON.parse(a)).toBeDefined();
    });

    it("NDJSON export has one JSON object per line", () => {
      const artifact = buildEvidenceArtifact({ kind: "receipt", classification: "internal", createdAt: T0, payload: { x: 1 }, references: [], redactSecrets: false });
      const bundle = buildEvidenceBundle({ artifacts: [artifact], generatedAt: T0, classification: "internal" });
      const ndjson = exportBundleAsNdjson(bundle);
      const lines = ndjson.trim().split("\n");
      expect(lines.length).toBeGreaterThanOrEqual(2);
      for (const line of lines) {
        expect(() => JSON.parse(line)).not.toThrow();
      }
    });

    it("exportBundle dispatches format correctly", () => {
      const artifact = buildEvidenceArtifact({ kind: "receipt", classification: "internal", createdAt: T0, payload: {}, references: [], redactSecrets: false });
      const bundle = buildEvidenceBundle({ artifacts: [artifact], generatedAt: T0, classification: "internal" });
      expect(exportBundle(bundle, "json")).toBe(exportBundleAsJson(bundle));
      expect(exportBundle(bundle, "ndjson")).toBe(exportBundleAsNdjson(bundle));
    });

    it("replay package JSON export is deterministic", () => {
      const events = [fakeEvent(0)];
      const envelope = buildReplayEnvelope(events, T0);
      const pkg = buildReplayEvidencePackage({ replayEnvelope: envelope, events, generatedAt: T0 });
      expect(exportReplayPackage(pkg, "json")).toBe(exportReplayPackage(pkg, "json"));
    });

    it("replay package NDJSON has valid lines", () => {
      const events = [fakeEvent(0), fakeEvent(1, "execution_plan_created")];
      const envelope = buildReplayEnvelope(events, T0);
      const pkg = buildReplayEvidencePackage({ replayEnvelope: envelope, events, generatedAt: T0 });
      const ndjson = exportReplayPackage(pkg, "ndjson");
      for (const line of ndjson.trim().split("\n")) {
        expect(() => JSON.parse(line)).not.toThrow();
      }
    });
  });

  describe("deterministic ordering", () => {
    it("bundle hash stable across artifact insertion order", () => {
      const a1 = buildEvidenceArtifact({ kind: "receipt", classification: "internal", createdAt: T0, payload: { x: 1 }, references: [], redactSecrets: false });
      const a2 = buildEvidenceArtifact({ kind: "receipt", classification: "internal", createdAt: T0, payload: { y: 2 }, references: [], redactSecrets: false });
      const bundleA = buildEvidenceBundle({ artifacts: [a1, a2], generatedAt: T0, classification: "internal" });
      const bundleB = buildEvidenceBundle({ artifacts: [a2, a1], generatedAt: T0, classification: "internal" });
      expect(bundleA.bundleId).toBe(bundleB.bundleId);
      expect(bundleA.manifest.digest.value).toBe(bundleB.manifest.digest.value);
    });
  });

  describe("secret redaction export safety", () => {
    it("evidenceContainsSecrets detects unredacted secrets", () => {
      const artifact = buildEvidenceArtifact({ kind: "receipt", classification: "internal", createdAt: T0, payload: { NVIDIA_API_KEY: "nvapi-secret-1234567890" }, references: [], redactSecrets: false });
      const bundle = buildEvidenceBundle({ artifacts: [artifact], generatedAt: T0, classification: "internal" });
      expect(evidenceContainsSecrets(bundle)).toBe(true);
    });

    it("evidenceContainsSecrets passes for redacted bundles", () => {
      const artifact = buildEvidenceArtifact({ kind: "receipt", classification: "internal", createdAt: T0, payload: { NVIDIA_API_KEY: "nvapi-secret-1234567890" }, references: [], redactSecrets: true });
      const bundle = buildEvidenceBundle({ artifacts: [artifact], generatedAt: T0, classification: "internal" });
      expect(evidenceContainsSecrets(bundle)).toBe(false);
    });
  });

  describe("missing lineage rejection", () => {
    it("rejects events without replay lineage in bundles", () => {
      const event: OperationalEvent = { eventId: "op-no-lineage", occurredAt: T0, sequence: 0, category: "receipt", source: "test", provenance: {}, payload: {} };
      const ref = buildEventReference(event);
      expect(ref.lineage).toEqual([]);
      const artifact = buildEvidenceArtifact({ kind: "receipt", classification: "internal", createdAt: T0, payload: { event }, references: [ref], redactSecrets: false });
      const bundle = buildEvidenceBundle({ artifacts: [artifact], generatedAt: T0, classification: "internal" });
      const result = verifyEvidenceBundle(bundle, T1);
      expect(result.lineageComplete).toBe(false);
      expect(result.reasons).toContain("incomplete_lineage");
    });
  });
});
