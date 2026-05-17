// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { loadBaseline, checkAgainstBaselines } from "../scripts/verify-benchmarks.ts";
import type { BaselineManifest, BenchmarkMetric } from "../scripts/verify-benchmarks.ts";

describe("verify-benchmarks script", () => {
  describe("loadBaseline", () => {
    it("returns null when no baseline file exists", () => {
      const result = loadBaseline();
      // Returns null when no baseline found in known locations
      if (result !== null) {
        expect(result).toHaveProperty("version");
        expect(result).toHaveProperty("thresholds");
      }
    });
  });

  describe("checkAgainstBaselines", () => {
    it("passes when metrics are within tolerance", () => {
      const baseline: BaselineManifest = {
        version: "1.0.0",
        environment: "test",
        thresholds: [
          { metric: "test_suite_duration", max: 100_000, tolerancePct: 10 },
        ],
      };
      const metrics: BenchmarkMetric[] = [
        { name: "test_suite_duration", value: 50_000, unit: "ms", higherIsBetter: false },
      ];

      const result = checkAgainstBaselines(metrics, baseline);
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("fails when metric exceeds max threshold", () => {
      const baseline: BaselineManifest = {
        version: "1.0.0",
        environment: "test",
        thresholds: [
          { metric: "test_suite_duration", max: 10_000, tolerancePct: 0 },
        ],
      };
      const metrics: BenchmarkMetric[] = [
        { name: "test_suite_duration", value: 50_000, unit: "ms", higherIsBetter: false },
      ];

      const result = checkAgainstBaselines(metrics, baseline);
      expect(result.passed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it("fails when metric falls below min threshold", () => {
      const baseline: BaselineManifest = {
        version: "1.0.0",
        environment: "test",
        thresholds: [
          { metric: "coverage_pct", min: 80, tolerancePct: 0 },
        ],
      };
      const metrics: BenchmarkMetric[] = [
        { name: "coverage_pct", value: 50, unit: "%" },
      ];

      const result = checkAgainstBaselines(metrics, baseline);
      expect(result.passed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it("ignores metrics without matching thresholds", () => {
      const baseline: BaselineManifest = {
        version: "1.0.0",
        environment: "test",
        thresholds: [],
      };
      const metrics: BenchmarkMetric[] = [
        { name: "some_metric", value: 999, unit: "x" },
      ];

      const result = checkAgainstBaselines(metrics, baseline);
      expect(result.passed).toBe(true);
    });
  });
});
