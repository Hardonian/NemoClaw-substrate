// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import {
  percentile,
  computeStats,
  runBenchmarkSync,
  runBenchmark,
  passesBaseline,
  formatResult,
  formatSuite,
} from "../../dist/lib/performance/benchmark";

describe("percentile", () => {
  it("returns 0 for empty array", () => {
    expect(percentile([], 50)).toBe(0);
  });

  it("returns the only element for single-item array", () => {
    expect(percentile([42], 50)).toBe(42);
  });

  it("computes median correctly", () => {
    expect(percentile([1, 2, 3, 4, 5], 50)).toBe(3);
  });

  it("computes p95 correctly", () => {
    const arr = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(percentile(arr, 95)).toBe(95);
  });

  it("computes p99 correctly", () => {
    const arr = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(percentile(arr, 99)).toBe(99);
  });

  it("handles unsorted input (uses sorted copy internally for computeStats, but percentile expects sorted)", () => {
    expect(percentile([1, 3, 2], 50)).toBe(2);
  });
});

describe("computeStats", () => {
  it("returns zeros for empty input", () => {
    const stats = computeStats([]);
    expect(stats.iterations).toBe(0);
    expect(stats.meanMs).toBe(0);
  });

  it("computes stats for single value", () => {
    const stats = computeStats([10]);
    expect(stats.iterations).toBe(1);
    expect(stats.meanMs).toBe(10);
    expect(stats.medianMs).toBe(10);
    expect(stats.minMs).toBe(10);
    expect(stats.maxMs).toBe(10);
  });

  it("computes correct mean", () => {
    const stats = computeStats([2, 4, 6]);
    expect(stats.meanMs).toBe(4);
  });

  it("computes correct min and max", () => {
    const stats = computeStats([5, 1, 9, 3]);
    expect(stats.minMs).toBe(1);
    expect(stats.maxMs).toBe(9);
  });

  it("rounds to 3 decimal places", () => {
    const stats = computeStats([1.1111, 2.2222, 3.3333]);
    expect(stats.meanMs).toBe(2.222);
  });
});

describe("runBenchmarkSync", () => {
  it("returns valid benchmark result", () => {
    const result = runBenchmarkSync(
      "noop",
      () => {
        // Intentionally empty.
      },
      10,
      { meanMs: 0.1, threshold: 1 },
    );

    expect(result.name).toBe("noop");
    expect(result.iterations).toBe(10);
    expect(result.meanMs).toBeGreaterThanOrEqual(0);
    expect(result.minMs).toBeGreaterThanOrEqual(0);
    expect(result.maxMs).toBeGreaterThanOrEqual(result.minMs);
  });

  it("reports correct baseline", () => {
    const result = runBenchmarkSync("test", () => {}, 5, { meanMs: 5, threshold: 10 });
    expect(result.baseline.threshold).toBe(10);
    expect(result.baseline.meanMs).toBe(5);
  });
});

describe("runBenchmark", () => {
  it("returns valid async benchmark result", async () => {
    const result = await runBenchmark(
      "async-noop",
      async () => {},
      10,
      { meanMs: 0.1, threshold: 1 },
    );

    expect(result.name).toBe("async-noop");
    expect(result.iterations).toBe(10);
    expect(result.meanMs).toBeGreaterThanOrEqual(0);
  });
});

describe("passesBaseline", () => {
  it("returns true when mean is below threshold", () => {
    expect(
      passesBaseline({
        name: "test",
        iterations: 10,
        meanMs: 5,
        medianMs: 5,
        p95Ms: 6,
        p99Ms: 7,
        minMs: 4,
        maxMs: 8,
        baseline: { meanMs: 5, threshold: 10 },
      }),
    ).toBe(true);
  });

  it("returns false when mean exceeds threshold", () => {
    expect(
      passesBaseline({
        name: "test",
        iterations: 10,
        meanMs: 15,
        medianMs: 14,
        p95Ms: 18,
        p99Ms: 19,
        minMs: 12,
        maxMs: 20,
        baseline: { meanMs: 15, threshold: 10 },
      }),
    ).toBe(false);
  });

  it("returns true when mean equals threshold exactly", () => {
    expect(
      passesBaseline({
        name: "test",
        iterations: 10,
        meanMs: 10,
        medianMs: 10,
        p95Ms: 11,
        p99Ms: 12,
        minMs: 9,
        maxMs: 12,
        baseline: { meanMs: 10, threshold: 10 },
      }),
    ).toBe(true);
  });
});

describe("formatResult", () => {
  it("produces a formatted string with PASS", () => {
    const result = {
      name: "test",
      iterations: 10,
      meanMs: 5,
      medianMs: 5,
      p95Ms: 6,
      p99Ms: 7,
      minMs: 4,
      maxMs: 8,
      baseline: { meanMs: 5, threshold: 10 },
    };
    const formatted = formatResult(result);
    expect(formatted).toContain("test");
    expect(formatted).toContain("PASS");
    expect(formatted).toContain("mean=5.000ms");
  });

  it("produces a formatted string with FAIL", () => {
    const result = {
      name: "slow-test",
      iterations: 5,
      meanMs: 15,
      medianMs: 14,
      p95Ms: 18,
      p99Ms: 19,
      minMs: 12,
      maxMs: 20,
      baseline: { meanMs: 15, threshold: 10 },
    };
    const formatted = formatResult(result);
    expect(formatted).toContain("FAIL");
  });
});

describe("formatSuite", () => {
  it("produces formatted suite output", () => {
    const suite = {
      name: "test-suite",
      results: [
        {
          name: "bm1",
          iterations: 10,
          meanMs: 5,
          medianMs: 5,
          p95Ms: 6,
          p99Ms: 7,
          minMs: 4,
          maxMs: 8,
          baseline: { meanMs: 5, threshold: 10 },
        },
      ],
      passed: true,
    };
    const formatted = formatSuite(suite);
    expect(formatted).toContain("test-suite");
    expect(formatted).toContain("PASS");
    expect(formatted).toContain("bm1");
  });
});
