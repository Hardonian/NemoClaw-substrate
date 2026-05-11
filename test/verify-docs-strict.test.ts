// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  checkDocsOutputExists,
  checkBrokenLinks,
  checkDocsFrontmatter,
  checkSpdxHeaders,
} from "../../scripts/verify-docs-strict.ts";
import type { DocsCheck } from "../../scripts/verify-docs-strict.ts";

describe("verify-docs-strict script", () => {
  describe("checkDocsOutputExists", () => {
    it("returns a check result", () => {
      const result = checkDocsOutputExists();
      expect(result).toHaveProperty("name", "docs_output");
      expect(result).toHaveProperty("passed");
      expect(result).toHaveProperty("detail");
    });
  });

  describe("checkBrokenLinks", () => {
    it("returns a check result", () => {
      const result = checkBrokenLinks();
      expect(result).toHaveProperty("name", "broken_links");
      expect(result).toHaveProperty("passed");
      expect(result).toHaveProperty("detail");
    });

    it("skips when no build output", () => {
      const result = checkBrokenLinks();
      // If build dir doesn't exist, should return pass with skip message
      if (result.detail.includes("No build output")) {
        expect(result.passed).toBe(true);
      }
    });
  });

  describe("checkDocsFrontmatter", () => {
    it("returns a check result", () => {
      const result = checkDocsFrontmatter();
      expect(result).toHaveProperty("name", "docs_frontmatter");
      expect(result).toHaveProperty("passed");
      expect(result).toHaveProperty("detail");
    });
  });

  describe("checkSpdxHeaders", () => {
    it("returns a check result", () => {
      const result = checkSpdxHeaders();
      expect(result).toHaveProperty("name", "docs_spdx");
      expect(result).toHaveProperty("passed");
      expect(result).toHaveProperty("detail");
    });
  });
});
