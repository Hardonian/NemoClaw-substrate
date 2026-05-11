// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import { computeSHA256, createArtifact, createManifest, manifestToJSON, manifestFromJSON } from "./release-manifest";

describe("computeSHA256", () => {
  it("computes SHA-256 hash for a string", () => {
    const hash = computeSHA256("hello world");
    expect(hash).toBe("b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9");
    expect(hash).toHaveLength(64);
  });

  it("computes SHA-256 hash for a buffer", () => {
    const hash = computeSHA256(Buffer.from("test"));
    expect(hash).toBe("9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08");
  });

  it("returns consistent hashes for same input", () => {
    const hash1 = computeSHA256("consistent");
    const hash2 = computeSHA256("consistent");
    expect(hash1).toBe(hash2);
  });
});

describe("createArtifact", () => {
  it("creates an artifact with name, hash, and provenance", () => {
    const artifact = createArtifact(
      "nemoclaw-0.1.0.tar.gz",
      "dummy content",
      {
        source: "https://github.com/NVIDIA/NemoClaw",
        buildTool: "tsc",
        buildCommand: "npm run build:cli",
      },
    );
    expect(artifact.name).toBe("nemoclaw-0.1.0.tar.gz");
    expect(artifact.hash).toBe(computeSHA256("dummy content"));
    expect(artifact.provenance.source).toBe("https://github.com/NVIDIA/NemoClaw");
  });
});

describe("createManifest", () => {
  it("creates a manifest with required fields", () => {
    const manifest = createManifest({
      version: "0.1.0",
      commit: "abc123",
      buildId: "build-42",
    });
    expect(manifest.version).toBe("0.1.0");
    expect(manifest.commit).toBe("abc123");
    expect(manifest.buildId).toBe("build-42");
    expect(manifest.timestamp).toBeDefined();
    expect(manifest.artifacts).toEqual([]);
    expect(manifest.dependencies).toEqual({});
  });

  it("uses provided timestamp", () => {
    const manifest = createManifest({
      version: "0.1.0",
      commit: "abc123",
      buildId: "build-42",
      timestamp: "2026-01-01T00:00:00Z",
    });
    expect(manifest.timestamp).toBe("2026-01-01T00:00:00Z");
  });

  it("includes artifacts and dependencies when provided", () => {
    const artifact = createArtifact("test.tar.gz", "content", {
      source: "repo",
      buildTool: "tsc",
      buildCommand: "build",
    });
    const manifest = createManifest({
      version: "0.1.0",
      commit: "abc123",
      buildId: "build-42",
      artifacts: [artifact],
      dependencies: { "p-retry": "4.6.2" },
    });
    expect(manifest.artifacts).toHaveLength(1);
    expect(manifest.artifacts[0].name).toBe("test.tar.gz");
    expect(manifest.dependencies["p-retry"]).toBe("4.6.2");
  });
});

describe("manifestToJSON", () => {
  it("serializes manifest to JSON string", () => {
    const manifest = createManifest({
      version: "0.1.0",
      commit: "abc123",
      buildId: "build-42",
    });
    const json = manifestToJSON(manifest);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe("0.1.0");
  });

  it("uses default indentation of 2", () => {
    const manifest = createManifest({
      version: "0.1.0",
      commit: "abc123",
      buildId: "build-42",
    });
    const json = manifestToJSON(manifest);
    expect(json).toContain("  \"version\"");
  });
});

describe("manifestFromJSON", () => {
  it("parses valid JSON to manifest", () => {
    const json = JSON.stringify({
      version: "0.1.0",
      commit: "abc123",
      buildId: "build-42",
      timestamp: "2026-01-01T00:00:00Z",
      artifacts: [],
      dependencies: {},
    });
    const manifest = manifestFromJSON(json);
    expect(manifest.version).toBe("0.1.0");
    expect(manifest.commit).toBe("abc123");
  });

  it("throws on missing version", () => {
    const json = JSON.stringify({
      commit: "abc123",
      buildId: "build-42",
      timestamp: "2026-01-01T00:00:00Z",
      artifacts: [],
      dependencies: {},
    });
    expect(() => manifestFromJSON(json)).toThrow("Invalid release manifest");
  });

  it("throws on missing commit", () => {
    const json = JSON.stringify({
      version: "0.1.0",
      buildId: "build-42",
      timestamp: "2026-01-01T00:00:00Z",
      artifacts: [],
      dependencies: {},
    });
    expect(() => manifestFromJSON(json)).toThrow("Invalid release manifest");
  });

  it("throws on missing buildId", () => {
    const json = JSON.stringify({
      version: "0.1.0",
      commit: "abc123",
      timestamp: "2026-01-01T00:00:00Z",
      artifacts: [],
      dependencies: {},
    });
    expect(() => manifestFromJSON(json)).toThrow("Invalid release manifest");
  });

  it("throws on missing timestamp", () => {
    const json = JSON.stringify({
      version: "0.1.0",
      commit: "abc123",
      buildId: "build-42",
      artifacts: [],
      dependencies: {},
    });
    expect(() => manifestFromJSON(json)).toThrow("Invalid release manifest");
  });

  it("throws on invalid JSON", () => {
    expect(() => manifestFromJSON("not json")).toThrow();
  });
});
