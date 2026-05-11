// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import {
  generateProofPack,
  benchmarkProofPackConcurrency,
  runProofPackBenchmark,
  summarizeProofPack,
  DEFAULT_PROOFPACK_CONFIG,
} from "./proofpack-benchmark";

describe("generateProofPack", () => {
  it("returns Uint8Array of correct size", () => {
    const pack = generateProofPack(100);
    expect(pack).toBeInstanceOf(Uint8Array);
    expect(pack.length).toBe(100);
  });

  it("produces deterministic content", () => {
    const pack1 = generateProofPack(10);
    const pack2 = generateProofPack(10);
    expect(pack1).toEqual(pack2);
  });

  it("fills with sequential byte pattern", () => {
    const pack = generateProofPack(5);
    expect(pack[0]).toBe(0);
    expect(pack[1]).toBe(1);
    expect(pack[4]).toBe(4);
  });

  it("wraps bytes at 256", () => {
    const pack = generateProofPack(260);
    expect(pack[255]).toBe(255);
    expect(pack[256]).toBe(0);
    expect(pack[259]).toBe(3);
  });
});

describe("benchmarkProofPackConcurrency", () => {
  it("returns array with correct number of duration entries", () => {
    const durations = benchmarkProofPackConcurrency(10, 100, 5);
    expect(durations).toHaveLength(5);
  });

  it("returns non-negative durations", () => {
    const durations = benchmarkProofPackConcurrency(5, 50, 10);
    durations.forEach((d) => expect(d).toBeGreaterThanOrEqual(0));
  });

  it("scales with concurrency level", () => {
    const low = benchmarkProofPackConcurrency(1, 100, 10);
    const high = benchmarkProofPackConcurrency(100, 100, 10);
    const meanLow = low.reduce((a, b) => a + b, 0) / low.length;
    const meanHigh = high.reduce((a, b) => a + b, 0) / high.length;
    expect(meanHigh).toBeGreaterThan(meanLow);
  });
});

describe("runProofPackBenchmark", () => {
  it("returns results for each config combination", () => {
    const config = {
      latencyTargetMs: 50,
      throughputTargetPacksPerSec: 1000,
      packSizes: [100],
      concurrencyLevels: [1],
      iterationsPerConfig: 10,
    };

    const results = runProofPackBenchmark(config);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("proofpack-1x-100b");
    expect(results[0].concurrency).toBe(1);
    expect(results[0].packSize).toBe(100);
  });

  it("returns results for multiple sizes and concurrency levels", () => {
    const config = {
      latencyTargetMs: 100,
      throughputTargetPacksPerSec: 100,
      packSizes: [100, 1000],
      concurrencyLevels: [1, 10],
      iterationsPerConfig: 10,
    };

    const results = runProofPackBenchmark(config);
    expect(results).toHaveLength(4);
  });

  it("computes throughput correctly", () => {
    const config = {
      latencyTargetMs: 1000,
      throughputTargetPacksPerSec: 1,
      packSizes: [100],
      concurrencyLevels: [10],
      iterationsPerConfig: 5,
    };

    const results = runProofPackBenchmark(config);
    expect(results[0].throughputPacksPerSec).toBeGreaterThan(0);
  });
});

describe("summarizeProofPack", () => {
  it("produces formatted output", () => {
    const results = [
      {
        name: "proofpack-1x-100b",
        concurrency: 1,
        packSize: 100,
        totalPacks: 10,
        latencyResult: { meanMs: 5 },
        throughputPacksPerSec: 2000,
        meetsLatencyTarget: true,
        meetsThroughputTarget: true,
      },
    ];

    const summary = summarizeProofPack(results);
    expect(summary).toContain("Proof-Pack Benchmark Summary");
    expect(summary).toContain("proofpack-1x-100b");
    expect(summary).toContain("PASS");
  });

  it("shows FAIL when targets not met", () => {
    const results = [
      {
        name: "proofpack-100x-10000b",
        concurrency: 100,
        packSize: 10000,
        totalPacks: 10000,
        latencyResult: { meanMs: 100 },
        throughputPacksPerSec: 50,
        meetsLatencyTarget: false,
        meetsThroughputTarget: false,
      },
    ];

    const summary = summarizeProofPack(results);
    expect(summary).toContain("FAIL");
  });
});

describe("DEFAULT_PROOFPACK_CONFIG", () => {
  it("has expected default values", () => {
    expect(DEFAULT_PROOFPACK_CONFIG.latencyTargetMs).toBe(50);
    expect(DEFAULT_PROOFPACK_CONFIG.throughputTargetPacksPerSec).toBe(1000);
    expect(DEFAULT_PROOFPACK_CONFIG.packSizes).toEqual([100, 1000, 10000]);
    expect(DEFAULT_PROOFPACK_CONFIG.concurrencyLevels).toEqual([1, 10, 100]);
  });
});
