// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import { computeBundleHash, verifyArtifact, verifyBundle, isIntegrityValid, integrityReportSummary } from "./integrity";
import { createManifest, createArtifact } from "./release-manifest";

describe("computeBundleHash", () => {
  it("computes SHA-256 hash for content", () => {
    const hash = computeBundleHash("bundle content");
    expect(hash).toHaveLength(64);
  });

  it("produces deterministic output", () => {
    const h1 = computeBundleHash("same");
    const h2 = computeBundleHash("same");
    expect(h1).toBe(h2);
  });
});

describe("verifyArtifact", () => {
  it("returns valid when content hash matches manifest", () => {
    const artifact = createArtifact("cli.tar.gz", "content", {
      source: "repo",
      buildTool: "tsc",
      buildCommand: "build",
    });
    const manifest = createManifest({
      version: "0.1.0",
      commit: "abc123",
      buildId: "build-42",
      artifacts: [artifact],
    });
    const result = verifyArtifact("cli.tar.gz", "content", manifest);
    expect(result.valid).toBe(true);
    expect(result.artifactName).toBe("cli.tar.gz");
  });

  it("returns invalid when content hash does not match", () => {
    const artifact = createArtifact("cli.tar.gz", "original", {
      source: "repo",
      buildTool: "tsc",
      buildCommand: "build",
    });
    const manifest = createManifest({
      version: "0.1.0",
      commit: "abc123",
      buildId: "build-42",
      artifacts: [artifact],
    });
    const result = verifyArtifact("cli.tar.gz", "tampered", manifest);
    expect(result.valid).toBe(false);
    expect(result.expected).not.toBe(result.actual);
  });

  it("returns invalid when artifact not in manifest", () => {
    const manifest = createManifest({
      version: "0.1.0",
      commit: "abc123",
      buildId: "build-42",
      artifacts: [],
    });
    const result = verifyArtifact("missing.tar.gz", "content", manifest);
    expect(result.valid).toBe(false);
    expect(result.expected).toBe("not found in manifest");
  });
});

describe("verifyBundle", () => {
  it("verifies multiple artifacts", () => {
    const a1 = createArtifact("cli.tar.gz", "cli content", {
      source: "repo",
      buildTool: "tsc",
      buildCommand: "build",
    });
    const a2 = createArtifact("plugin.tar.gz", "plugin content", {
      source: "repo",
      buildTool: "tsc",
      buildCommand: "build",
    });
    const manifest = createManifest({
      version: "0.1.0",
      commit: "abc123",
      buildId: "build-42",
      artifacts: [a1, a2],
    });
    const bundles = new Map<string, string | Buffer>([
      ["cli.tar.gz", "cli content"],
      ["plugin.tar.gz", "plugin content"],
    ]);
    const report = verifyBundle(bundles, manifest);
    expect(report.passed).toHaveLength(2);
    expect(report.failed).toHaveLength(0);
    expect(report.missing).toHaveLength(0);
  });

  it("reports missing artifacts", () => {
    const artifact = createArtifact("cli.tar.gz", "content", {
      source: "repo",
      buildTool: "tsc",
      buildCommand: "build",
    });
    const manifest = createManifest({
      version: "0.1.0",
      commit: "abc123",
      buildId: "build-42",
      artifacts: [artifact],
    });
    const bundles = new Map<string, string | Buffer>();
    const report = verifyBundle(bundles, manifest);
    expect(report.missing).toContain("cli.tar.gz");
  });

  it("reports hash mismatches", () => {
    const artifact = createArtifact("cli.tar.gz", "original", {
      source: "repo",
      buildTool: "tsc",
      buildCommand: "build",
    });
    const manifest = createManifest({
      version: "0.1.0",
      commit: "abc123",
      buildId: "build-42",
      artifacts: [artifact],
    });
    const bundles = new Map<string, string | Buffer>([
      ["cli.tar.gz", "tampered"],
    ]);
    const report = verifyBundle(bundles, manifest);
    expect(report.failed).toHaveLength(1);
    expect(report.passed).toHaveLength(0);
  });
});

describe("isIntegrityValid", () => {
  it("returns true when all artifacts pass", () => {
    const report = {
      passed: [{ valid: true, artifactName: "test.tar.gz", expected: "abc", actual: "abc" }],
      failed: [],
      missing: [],
    };
    expect(isIntegrityValid(report)).toBe(true);
  });

  it("returns false when any artifact fails", () => {
    const report = {
      passed: [],
      failed: [{ valid: false, artifactName: "test.tar.gz", expected: "abc", actual: "def" }],
      missing: [],
    };
    expect(isIntegrityValid(report)).toBe(false);
  });

  it("returns false when any artifact is missing", () => {
    const report = {
      passed: [],
      failed: [],
      missing: ["test.tar.gz"],
    };
    expect(isIntegrityValid(report)).toBe(false);
  });
});

describe("integrityReportSummary", () => {
  it("returns success message when all valid", () => {
    const report = {
      passed: [
        { valid: true, artifactName: "a.tar.gz", expected: "abc", actual: "abc" },
        { valid: true, artifactName: "b.tar.gz", expected: "def", actual: "def" },
      ],
      failed: [],
      missing: [],
    };
    expect(integrityReportSummary(report)).toBe("All 2 artifact(s) verified successfully.");
  });

  it("reports failures and missing", () => {
    const report = {
      passed: [{ valid: true, artifactName: "a.tar.gz", expected: "abc", actual: "abc" }],
      failed: [{ valid: false, artifactName: "b.tar.gz", expected: "def", actual: "ghi" }],
      missing: ["c.tar.gz"],
    };
    const summary = integrityReportSummary(report);
    expect(summary).toContain("1/3 artifact(s) valid");
    expect(summary).toContain("1 hash mismatch");
    expect(summary).toContain("1 missing artifact");
  });
});
