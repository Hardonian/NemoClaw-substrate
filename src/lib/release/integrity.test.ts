// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import { computeBundleHash, verifyArtifact, verifyBundle, isIntegrityValid, integrityReportSummary } from "./integrity";
import { createManifest, createArtifact } from "./release-manifest";

describe("computeBundleHash", () => {
  it("computes SHA-256 hash of string content", () => {
    const hash = computeBundleHash("test content");
    expect(hash).toHaveLength(64);
    expect(typeof hash).toBe("string");
  });

  it("returns same hash for same input", () => {
    const h1 = computeBundleHash("hello");
    const h2 = computeBundleHash("hello");
    expect(h1).toBe(h2);
  });
});

describe("verifyArtifact", () => {
  it("returns valid when content matches manifest", () => {
    const artifact = createArtifact("app.tar.gz", "bundle content", {
      source: "main",
      buildTool: "tsc",
      buildCommand: "npm run build:cli",
    });
    const manifest = createManifest({
      version: "0.1.0",
      commit: "abc123",
      buildId: "build-1",
      artifacts: [artifact],
    });
    const result = verifyArtifact("app.tar.gz", "bundle content", manifest);
    expect(result.valid).toBe(true);
    expect(result.artifactName).toBe("app.tar.gz");
    expect(result.expected).toBe(result.actual);
  });

  it("returns invalid when content does not match", () => {
    const artifact = createArtifact("app.tar.gz", "original", {
      source: "main",
      buildTool: "tsc",
      buildCommand: "npm run build:cli",
    });
    const manifest = createManifest({
      version: "0.1.0",
      commit: "abc123",
      buildId: "build-1",
      artifacts: [artifact],
    });
    const result = verifyArtifact("app.tar.gz", "tampered", manifest);
    expect(result.valid).toBe(false);
    expect(result.expected).not.toBe(result.actual);
  });

  it("returns invalid when artifact not in manifest", () => {
    const manifest = createManifest({
      version: "0.1.0",
      commit: "abc123",
      buildId: "build-1",
      artifacts: [],
    });
    const result = verifyArtifact("missing.tar.gz", "content", manifest);
    expect(result.valid).toBe(false);
    expect(result.expected).toBe("not found in manifest");
  });
});

describe("verifyBundle", () => {
  it("verifies all artifacts in bundle", () => {
    const a1 = createArtifact("cli.tar.gz", "cli-data", {
      source: "main",
      buildTool: "tsc",
      buildCommand: "npm run build:cli",
    });
    const a2 = createArtifact("plugin.tar.gz", "plugin-data", {
      source: "main",
      buildTool: "tsc",
      buildCommand: "npm run build:cli",
    });
    const manifest = createManifest({
      version: "0.1.0",
      commit: "abc123",
      buildId: "build-1",
      artifacts: [a1, a2],
    });
    const bundles = new Map<string, string | Buffer>([
      ["cli.tar.gz", "cli-data"],
      ["plugin.tar.gz", "plugin-data"],
    ]);
    const report = verifyBundle(bundles, manifest);
    expect(report.passed).toHaveLength(2);
    expect(report.failed).toHaveLength(0);
    expect(report.missing).toHaveLength(0);
  });

  it("detects missing artifacts", () => {
    const artifact = createArtifact("cli.tar.gz", "cli-data", {
      source: "main",
      buildTool: "tsc",
      buildCommand: "npm run build:cli",
    });
    const manifest = createManifest({
      version: "0.1.0",
      commit: "abc123",
      buildId: "build-1",
      artifacts: [artifact],
    });
    const bundles = new Map<string, string | Buffer>();
    const report = verifyBundle(bundles, manifest);
    expect(report.missing).toContain("cli.tar.gz");
    expect(report.passed).toHaveLength(0);
    expect(report.failed).toHaveLength(0);
  });

  it("detects hash mismatches", () => {
    const artifact = createArtifact("cli.tar.gz", "original", {
      source: "main",
      buildTool: "tsc",
      buildCommand: "npm run build:cli",
    });
    const manifest = createManifest({
      version: "0.1.0",
      commit: "abc123",
      buildId: "build-1",
      artifacts: [artifact],
    });
    const bundles = new Map<string, string | Buffer>([
      ["cli.tar.gz", "tampered"],
    ]);
    const report = verifyBundle(bundles, manifest);
    expect(report.failed).toHaveLength(1);
    expect(report.passed).toHaveLength(0);
    expect(report.missing).toHaveLength(0);
  });
});

describe("isIntegrityValid", () => {
  it("returns true when no failures or missing", () => {
    expect(
      isIntegrityValid({ passed: [{ valid: true, artifactName: "a", expected: "x", actual: "x" }], failed: [], missing: [] }),
    ).toBe(true);
  });

  it("returns false when there are failures", () => {
    expect(
      isIntegrityValid({ passed: [], failed: [{ valid: false, artifactName: "a", expected: "x", actual: "y" }], missing: [] }),
    ).toBe(false);
  });

  it("returns false when there are missing artifacts", () => {
    expect(
      isIntegrityValid({ passed: [], failed: [], missing: ["a.tar.gz"] }),
    ).toBe(false);
  });
});

describe("integrityReportSummary", () => {
  it("returns success message when all valid", () => {
    const report = {
      passed: [
        { valid: true, artifactName: "a", expected: "x", actual: "x" },
        { valid: true, artifactName: "b", expected: "y", actual: "y" },
      ],
      failed: [],
      missing: [],
    };
    expect(integrityReportSummary(report)).toBe("All 2 artifact(s) verified successfully.");
  });

  it("reports mismatches and missing", () => {
    const report = {
      passed: [{ valid: true, artifactName: "a", expected: "x", actual: "x" }],
      failed: [{ valid: false, artifactName: "b", expected: "y", actual: "z" }],
      missing: ["c"],
    };
    const summary = integrityReportSummary(report);
    expect(summary).toContain("1/3 artifact(s) valid");
    expect(summary).toContain("1 hash mismatch(es)");
    expect(summary).toContain("1 missing artifact(s)");
  });
});
