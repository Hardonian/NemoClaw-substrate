// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import {
  checkArchitectureBoundaries,
  checkArchitectureBoundariesStrict,
  getModuleBoundaries,
} from "./architecture-boundary";

describe("lib/maintainability/architecture-boundary", () => {
  describe("getModuleBoundaries", () => {
    it("returns default boundaries", () => {
      const boundaries = getModuleBoundaries();
      expect(boundaries.length).toBeGreaterThan(0);
      expect(boundaries.some((b) => b.name === "core")).toBe(true);
      expect(boundaries.some((b) => b.name === "maintainability")).toBe(true);
    });

    it("core module has no allowed dependencies", () => {
      const boundaries = getModuleBoundaries();
      const core = boundaries.find((b) => b.name === "core");
      expect(core).toBeDefined();
      expect(core?.allowedDependencies).toEqual([]);
    });
  });

  describe("checkArchitectureBoundaries", () => {
    it("detects cross-module violations", () => {
      const files = new Map<string, string>([
        [
          "src/lib/core/utils.ts",
          `import { config } from "nemoclaw-config";`,
        ],
      ]);
      const report = checkArchitectureBoundaries(files);
      expect(report.violations.length).toBe(1);
      expect(report.violations[0].sourceModule).toBe("core");
    });

    it("allows dependencies within boundary rules", () => {
      const files = new Map<string, string>([
        [
          "src/lib/config/settings.ts",
          `import { getVersion } from "@nemoclaw/core";`,
        ],
      ]);
      const report = checkArchitectureBoundaries(files);
      expect(report.violations.length).toBe(0);
    });

    it("ignores relative imports", () => {
      const files = new Map<string, string>([
        [
          "src/lib/core/utils.ts",
          `import { helper } from "./helper";`,
        ],
      ]);
      const report = checkArchitectureBoundaries(files);
      expect(report.violations.length).toBe(0);
    });

    it("ignores node: and @ imports", () => {
      const files = new Map<string, string>([
        [
          "src/lib/core/utils.ts",
          `import { readFileSync } from "node:fs";
import { Command } from "@oclif/core";`,
        ],
      ]);
      const report = checkArchitectureBoundaries(files);
      expect(report.violations.length).toBe(0);
    });

    it("summary tracks violations by source module", () => {
      const files = new Map<string, string>([
        [
          "src/lib/core/a.ts",
          `import { config } from "nemoclaw-config";`,
        ],
        [
          "src/lib/core/b.ts",
          `import { state } from "nemoclaw-state";`,
        ],
      ]);
      const report = checkArchitectureBoundaries(files);
      expect(report.summary.bySourceModule["core"]).toBe(2);
      expect(report.summary.total).toBe(2);
    });
  });

  describe("checkArchitectureBoundariesStrict", () => {
    it("returns true when no violations exist", () => {
      const files = new Map<string, string>([
        ["src/lib/core/utils.ts", `export function hello() {}`],
      ]);
      expect(checkArchitectureBoundariesStrict(files)).toBe(true);
    });

    it("returns false when violations exist", () => {
      const files = new Map<string, string>([
        [
          "src/lib/core/utils.ts",
          `import { config } from "nemoclaw-config";`,
        ],
      ]);
      expect(checkArchitectureBoundariesStrict(files)).toBe(false);
    });
  });
});
