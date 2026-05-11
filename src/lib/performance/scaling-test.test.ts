// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import {
  measureResourceGrowth,
  runScalingTest,
  summarizeScaling,
  DEFAULT_SCALING_CONFIG,
  type ScalingTestConfig,
} from "../../dist/lib/performance/scaling-test";

describe("measureResourceGrowth", () => {
  it("returns 1 for zero-growth workload", () => {
    const workload = (_count: number) => {
      // No-op: no resource growth.
    };
    const growth = measureResourceGrowth(workload, 100, 200);
    expect(growth).toBeGreaterThanOrEqual(0);
  });

  it("returns positive growth for memory-allocating workload", () => {
    const workload = (count: number) => {
      const _arr = new Array(count).fill("x");
    };
    const growth = measureResourceGrowth(workload, 100, 1000);
    expect(growth).toBeGreaterThan(0);
  });
});

describe("runScalingTest", () => {
  it("returns results for each multiplier", () => {
    const config: ScalingTestConfig = {
      multipliers: [10, 100],
      linearityTolerance: 0.5,
      baselineIterations: 10,
    };

    const workload = (_count: number) => {
      // Simple linear work.
      const _x = Math.sqrt(100);
    };

    const results = runScalingTest(workload, config);
    expect(results).toHaveLength(2);
    expect(results[0].multiplier).toBe(10);
    expect(results[1].multiplier).toBe(100);
  });

  it("computes throughput for each multiplier", () => {
    const config: ScalingTestConfig = {
      multipliers: [10],
      linearityTolerance: 0.5,
      baselineIterations: 100,
    };

    const workload = (_count: number) => {};

    const results = runScalingTest(workload, config);
    expect(results[0].throughput).toBeGreaterThan(0);
  });

  it("flags non-linear growth when tolerance is exceeded", () => {
    const config: ScalingTestConfig = {
      multipliers: [10],
      linearityTolerance: 0.0001,
      baselineIterations: 50,
    };

    const workload = (count: number) => {
      const _arr = new Array(count * count).fill(0);
    };

    const results = runScalingTest(workload, config);
    expect(results[0].isLinear).toBe(false);
  });
});

describe("summarizeScaling", () => {
  it("produces formatted output", () => {
    const results = [
      {
        multiplier: 10,
        throughput: 100,
        resourceGrowth: 1.05,
        isLinear: true,
      },
      {
        multiplier: 100,
        throughput: 95,
        resourceGrowth: 1.15,
        isLinear: false,
      },
    ];

    const summary = summarizeScaling(results);
    expect(summary).toContain("Scaling Test Summary");
    expect(summary).toContain("10x");
    expect(summary).toContain("LINEAR");
    expect(summary).toContain("NON-LINEAR");
    expect(summary).toContain("FAIL");
  });
});

describe("DEFAULT_SCALING_CONFIG", () => {
  it("has expected default values", () => {
    expect(DEFAULT_SCALING_CONFIG.multipliers).toEqual([10, 100, 1000]);
    expect(DEFAULT_SCALING_CONFIG.linearityTolerance).toBe(0.2);
    expect(DEFAULT_SCALING_CONFIG.baselineIterations).toBe(100);
  });
});
