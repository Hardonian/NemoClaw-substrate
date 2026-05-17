// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Proof-pack generation benchmark under concurrent load.
 *
 * Measures latency and throughput targets for proof-pack operations
 * when multiple packs are generated simultaneously.
 */

import { type BenchmarkResult, computeStats } from "./benchmark";

export interface ProofPackBenchmarkResult {
  name: string;
  concurrency: number;
  packSize: number;
  totalPacks: number;
  latencyResult: BenchmarkResult;
  throughputPacksPerSec: number;
  meetsLatencyTarget: boolean;
  meetsThroughputTarget: boolean;
}

export interface ProofPackBenchmarkConfig {
  latencyTargetMs: number;
  throughputTargetPacksPerSec: number;
  packSizes: number[];
  concurrencyLevels: number[];
  iterationsPerConfig: number;
}

export const DEFAULT_PROOFPACK_CONFIG: ProofPackBenchmarkConfig = {
  latencyTargetMs: 50,
  throughputTargetPacksPerSec: 1000,
  packSizes: [100, 1000, 10000],
  concurrencyLevels: [1, 10, 100],
  iterationsPerConfig: 100,
};

/**
 * Simulate proof-pack generation for a given size.
 * Pure function that returns a synthetic pack object.
 */
export function generateProofPack(size: number): Uint8Array {
  const buffer = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    buffer[i] = i & 0xff;
  }
  return buffer;
}

/**
 * Simulate a concurrent proof-pack generation workload.
 * Returns timing data for each concurrent batch.
 */
export function benchmarkProofPackConcurrency(
  concurrency: number,
  packSize: number,
  iterations: number,
): number[] {
  const durationsMs: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    for (let j = 0; j < concurrency; j++) {
      generateProofPack(packSize);
    }
    const end = process.hrtime.bigint();
    durationsMs.push(Number(end - start) / 1e6);
  }

  return durationsMs;
}

/**
 * Run a full proof-pack benchmark across configured sizes and concurrency levels.
 */
export function runProofPackBenchmark(
  config: ProofPackBenchmarkConfig = DEFAULT_PROOFPACK_CONFIG,
): ProofPackBenchmarkResult[] {
  const results: ProofPackBenchmarkResult[] = [];

  for (const concurrency of config.concurrencyLevels) {
    for (const packSize of config.packSizes) {
      const durationsMs = benchmarkProofPackConcurrency(
        concurrency,
        packSize,
        config.iterationsPerConfig,
      );

      const stats = computeStats(durationsMs);
      const totalPacks = concurrency * config.iterationsPerConfig;
      const meanMs = stats.meanMs || 1;

      const latencyResult: BenchmarkResult = {
        name: `proofpack-${concurrency}x-${packSize}b`,
        baseline: { meanMs: config.latencyTargetMs, threshold: config.latencyTargetMs },
        ...stats,
      };

      const throughputPacksPerSec = (totalPacks / (meanMs * config.iterationsPerConfig)) * 1000;
      const meetsLatencyTarget = stats.meanMs <= config.latencyTargetMs;
      const meetsThroughputTarget = throughputPacksPerSec >= config.throughputTargetPacksPerSec;

      results.push({
        name: `proofpack-${concurrency}x-${packSize}b`,
        concurrency,
        packSize,
        totalPacks,
        latencyResult,
        throughputPacksPerSec: Math.round(throughputPacksPerSec * 100) / 100,
        meetsLatencyTarget,
        meetsThroughputTarget,
      });
    }
  }

  return results;
}

/**
 * Summarize proof-pack benchmark results for reporting.
 */
export function summarizeProofPack(results: ProofPackBenchmarkResult[]): string {
  const lines = ["Proof-Pack Benchmark Summary:"];
  for (const r of results) {
    const latencyStatus = r.meetsLatencyTarget ? "OK" : "FAIL";
    const throughputStatus = r.meetsThroughputTarget ? "OK" : "FAIL";
    lines.push(
      `  ${r.name}: mean=${r.latencyResult.meanMs.toFixed(3)}ms, ` +
        `throughput=${r.throughputPacksPerSec.toFixed(0)} packs/s ` +
        `[latency=${latencyStatus}, throughput=${throughputStatus}]`,
    );
  }
  const allPass = results.every((r) => r.meetsLatencyTarget && r.meetsThroughputTarget);
  lines.push(`Overall: ${allPass ? "PASS" : "FAIL"}`);
  return lines.join("\n");
}
