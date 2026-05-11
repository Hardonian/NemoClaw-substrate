// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import { scanDeadCode, checkDeadCodeStrict } from "./dead-code-scan";

describe("lib/maintainability/dead-code-scan", () => {
  describe("scanDeadCode", () => {
    it("detects unused exports", () => {
      const files = new Map<string, string>([
        [
          "src/a.ts",
          `export function unusedHelper() { return 1; }
export function usedFunction() { return 2; }`,
        ],
        [
          "src/b.ts",
          `import { usedFunction } from "./a";
const result = usedFunction();`,
        ],
      ]);
      const report = scanDeadCode(files);
      const unusedExports = report.entries.filter(
        (e) => e.type === "unused-export",
      );
      expect(unusedExports.length).toBe(1);
      expect(unusedExports[0].identifier).toBe("unusedHelper");
    });

    it("detects unused imports", () => {
      const files = new Map<string, string>([
        [
          "src/c.ts",
          `import { usedFn, unusedFn } from "./d";
const x = usedFn();`,
        ],
        [
          "src/d.ts",
          `export function usedFn() { return 1; }
export function unusedFn() { return 2; }`,
        ],
      ]);
      const report = scanDeadCode(files);
      const unusedImports = report.entries.filter(
        (e) => e.type === "unused-import",
      );
      expect(unusedImports.length).toBe(1);
      expect(unusedImports[0].identifier).toBe("unusedFn");
    });

    it("ignores underscore-prefixed exports", () => {
      const files = new Map<string, string>([
        ["src/a.ts", `export function _internalHelper() { return 1; }`],
      ]);
      const report = scanDeadCode(files);
      expect(report.entries.length).toBe(0);
    });

    it("summary counts match entry types", () => {
      const files = new Map<string, string>([
        [
          "src/a.ts",
          `export function orphaned() { return 1; }`,
        ],
        [
          "src/b.ts",
          `import { orphaned } from "./a";`,
        ],
      ]);
      const report = scanDeadCode(files);
      expect(
        report.summary.unusedExports +
          report.summary.unusedImports +
          report.summary.unreachableCode,
      ).toBe(report.summary.total);
    });

    it("flags export as unused when no other file references it", () => {
      const files = new Map<string, string>([
        ["src/single.ts", `export function hello() { return "world"; }`],
      ]);
      const report = scanDeadCode(files);
      expect(report.entries.length).toBe(1);
      expect(report.entries[0].identifier).toBe("hello");
    });
  });

  describe("checkDeadCodeStrict", () => {
    it("returns false when dead code exists", () => {
      const files = new Map<string, string>([
        ["src/a.ts", `export function unused() { return 1; }`],
      ]);
      expect(checkDeadCodeStrict(files)).toBe(false);
    });
  });
});
