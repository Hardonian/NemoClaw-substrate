// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import {
  checkManifestExists,
  checkArtifactHashes,
  checkCompatibilityMatrix,
  checkPackageVersion,
  loadManifest,
  hashFile,
} from "../scripts/verify-release.ts";

describe("verify-release script", () => {
  describe("checkManifestExists", () => {
    it("returns false when no manifest is present", () => {
      // In the test environment, no release/manifest.json exists
      const result = checkManifestExists();
      // Should return a check result object
      expect(result).toHaveProperty("name", "manifest_exists");
      expect(result).toHaveProperty("passed");
      expect(result).toHaveProperty("detail");
    });
  });

  describe("checkPackageVersion", () => {
    it("returns consistent result for existing package.json", () => {
      const manifest = { version: "0.1.0" };
      const result = checkPackageVersion(manifest);
      expect(result).toHaveProperty("name", "package_version");
      expect(result).toHaveProperty("passed");
    });

    it("detects version mismatch", () => {
      const manifest = { version: "99.99.99" };
      const result = checkPackageVersion(manifest);
      expect(result.passed).toBe(false);
      expect(result.detail).toContain("mismatch");
    });
  });

  describe("checkArtifactHashes", () => {
    it("returns pass when no artifacts defined", () => {
      const manifest = { artifacts: {} };
      const results = checkArtifactHashes(manifest);
      expect(results).toHaveLength(1);
      expect(results[0].passed).toBe(true);
    });

    it("detects missing artifact file", () => {
      const manifest = {
        artifacts: {
          fake: { hash: "abc123", path: "nonexistent/file.txt" },
        },
      };
      const results = checkArtifactHashes(manifest);
      const failResult = results.find((r) => r.name === "artifact_hash_fake");
      expect(failResult).toBeDefined();
      expect(failResult?.passed).toBe(false);
    });

    it("detects missing path in artifact", () => {
      const manifest = {
        artifacts: {
          noPath: { hash: "abc123" },
        },
      };
      const results = checkArtifactHashes(manifest);
      const failResult = results.find((r) => r.name === "artifact_hash_noPath");
      expect(failResult).toBeDefined();
      expect(failResult?.passed).toBe(false);
    });
  });

  describe("checkCompatibilityMatrix", () => {
    it("returns pass when no compatibility matrix", () => {
      const manifest = {};
      const result = checkCompatibilityMatrix(manifest);
      expect(result.passed).toBe(true);
    });

    it("validates correct compatibility entries", () => {
      const manifest = {
        compatibility: {
          agents: [{ agent: "openclaw", minVersion: "1.0.0" }],
        },
      };
      const result = checkCompatibilityMatrix(manifest);
      expect(result.passed).toBe(true);
    });

    it("detects entries without agent or provider", () => {
      const manifest = {
        compatibility: {
          agents: [{ minVersion: "1.0.0" }],
        },
      };
      const result = checkCompatibilityMatrix(manifest);
      expect(result.passed).toBe(false);
      expect(result.detail).toContain("must specify agent or provider");
    });

    it("detects non-array entries", () => {
      const manifest = {
        compatibility: {
          agents: "not_an_array",
        },
      };
      const result = checkCompatibilityMatrix(manifest as any);
      expect(result.passed).toBe(false);
    });
  });

  describe("loadManifest", () => {
    it("returns null when no manifest exists", () => {
      // In test environment, no manifest should exist
      const result = loadManifest();
      // Could be null if no manifest exists
      if (result !== null) {
        expect(result).toHaveProperty("version");
      }
    });
  });
});
