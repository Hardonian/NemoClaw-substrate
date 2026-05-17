// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import { scanDependencyHygiene, checkDependencyHygieneStrict } from "./dependency-hygiene";

describe("lib/maintainability/dependency-hygiene", () => {
  describe("scanDependencyHygiene", () => {
    it("returns empty report when package.json not found", () => {
      const report = scanDependencyHygiene("/nonexistent/path");
      expect(report.issues).toEqual([]);
      expect(report.summary.total).toBe(0);
    });

    it("detects unpinned caret versions in dependencies", () => {
      const report = scanDependencyHygiene(process.cwd());
      const unpinned = report.issues.filter((i) => i.issueType === "unpinned");
      expect(unpinned.length).toBeGreaterThan(0);
    });

    it("marks production dependency issues as high severity", () => {
      const report = scanDependencyHygiene(process.cwd());
      const highSeverity = report.issues.filter(
        (i) => i.severity === "high",
      );
      const depIssues = report.issues.filter(
        (i) => i.severity === "high" && i.issueType === "unpinned",
      );
      expect(depIssues.length).toBeGreaterThan(0);
    });

    it("marks dev dependency issues as medium severity", () => {
      const report = scanDependencyHygiene(process.cwd());
      const mediumSeverity = report.issues.filter(
        (i) => i.severity === "medium",
      );
      const devDepIssues = report.issues.filter(
        (i) => i.severity === "medium" && i.issueType === "unpinned",
      );
      expect(devDepIssues.length).toBeGreaterThan(0);
    });

    it("summary counts match issue severities", () => {
      const report = scanDependencyHygiene(process.cwd());
      expect(report.summary.high + report.summary.medium + report.summary.low).toBe(
        report.summary.total,
      );
    });
  });

  describe("checkDependencyHygieneStrict", () => {
    it("returns false when high-severity issues exist", () => {
      const result = checkDependencyHygieneStrict(process.cwd());
      expect(result).toBe(false);
    });
  });
});
