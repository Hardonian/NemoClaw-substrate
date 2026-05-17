// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import {
  scanNamingConventions,
  checkNamingConventionsStrict,
} from "./naming-conventions";

describe("lib/maintainability/naming-conventions", () => {
  describe("scanNamingConventions", () => {
    it("detects snake_case identifiers where camelCase expected", () => {
      const source = "const my_function = () => {};";
      const report = scanNamingConventions(source, "test.ts", {
        checkCamelCase: true,
        checkSnakeCase: false,
        checkAcronyms: false,
      });
      expect(report.violations.length).toBeGreaterThan(0);
      expect(report.summary.camelCase).toBeGreaterThan(0);
    });

    it("detects acronym normalization issues", () => {
      const source = "const httpClient = {};";
      const report = scanNamingConventions(source, "test.ts", {
        checkCamelCase: false,
        checkSnakeCase: false,
        checkAcronyms: true,
      });
      expect(report.summary.acronymNormalized).toBe(0);
    });

    it("accepts properly normalized acronyms", () => {
      const source = "const HTTPClient = {};";
      const report = scanNamingConventions(source, "test.ts", {
        checkCamelCase: false,
        checkSnakeCase: false,
        checkAcronyms: true,
      });
      expect(report.violations.length).toBe(0);
    });

    it("returns empty violations for clean source", () => {
      const source = `
        function getUserProfile() {
          const userName = "test";
          return userName;
        }
      `;
      const report = scanNamingConventions(source, "test.ts");
      expect(report.violations.length).toBe(0);
    });

    it("ignores underscore-prefixed identifiers", () => {
      const source = "const _internal_helper = () => {};";
      const report = scanNamingConventions(source, "test.ts", {
        checkCamelCase: true,
        checkSnakeCase: false,
        checkAcronyms: false,
      });
      expect(report.violations.length).toBe(0);
    });

    it("summary totals match violation count", () => {
      const source = "const my_var = 1;";
      const report = scanNamingConventions(source, "test.ts");
      expect(report.summary.total).toBe(report.violations.length);
    });
  });

  describe("checkNamingConventionsStrict", () => {
    it("returns true for clean source", () => {
      const source = "function getName() { return 'test'; }";
      expect(checkNamingConventionsStrict(source)).toBe(true);
    });

    it("returns false when violations exist", () => {
      const source = "const my_helper_fn = () => {};";
      expect(checkNamingConventionsStrict(source)).toBe(false);
    });
  });
});
