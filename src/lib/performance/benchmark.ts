// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Deterministic benchmark suite utilities.
 *
 * Pure benchmark helpers that use hrtime.bigint() for high-precision timing.
 * Benchmark results follow a standard shape suitable for CI threshold checks.
 */

export interface BenchmarkBaseline {
  meanMs: number;
  threshold: number;
}

export interface BenchmarkResult {
  name: string;
  iterations: number;
  meanMs: number;
  medianMs: number;
  p95Ms: number;
  p99Ms: number;
  minMs: number;
  maxMs: number;
  baseline: BenchmarkBaseline;
}

export interface BenchmarkSuite {
  name: string;
  results: BenchmarkResult[];
  passed: boolean;
}

export type BenchmarkFn = () => void | Promise<void>;

/**
 * Compute percentile from a sorted numeric array.
 */
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Compute statistical summary from raw millisecond durations.
 */
export function computeStats(durationsMs: number[]): Omit<BenchmarkResult, "name" | "baseline"> {
  if (durationsMs.length === 0) {
    return { iterations: 0, meanMs: 0, medianMs: 0, p95Ms: 0, p99Ms: 0, minMs: 0, maxMs: 0 };
  }

  const sorted = [...durationsMs].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);

  return {
    iterations: sorted.length,
    meanMs: round(sum / sorted.length),
    medianMs: round(percentile(sorted, 50)),
    p95Ms: round(percentile(sorted, 95)),
    p99Ms: round(percentile(sorted, 99)),
    minMs: round(sorted[0]),
    maxMs: round(sorted[sorted.length - 1]),
  };
}

/**
 * Run a benchmark function N times and return timing statistics.
 *
 * The fn is expected to be synchronous for deterministic results.
 * Async functions are supported but may introduce scheduler variance.
 */
export async function runBenchmark(
  name: string,
  fn: BenchmarkFn,
  iterations: number,
  baseline: BenchmarkBaseline,
): Promise<BenchmarkResult> {
  const durationsMs: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    await fn();
    const end = process.hrtime.bigint();
    durationsMs.push(Number(end - start) / 1e6);
  }

  const stats = computeStats(durationsMs);

  return {
    name,
    baseline,
    ...stats,
  };
}

/**
 * Run a synchronous benchmark function N times and return timing statistics.
 *
 * Preferred over runBenchmark() for deterministic micro-benchmarks.
 */
export function runBenchmarkSync(
  name: string,
  fn: () => void,
  iterations: number,
  baseline: BenchmarkBaseline,
): BenchmarkResult {
  const durationsMs: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    fn();
    const end = process.hrtime.bigint();
    durationsMs.push(Number(end - start) / 1e6);
  }

  const stats = computeStats(durationsMs);

  return {
    name,
    baseline,
    ...stats,
  };
}

/**
 * Check if a benchmark result passes its baseline threshold.
 */
export function passesBaseline(result: BenchmarkResult): boolean {
  return result.meanMs <= result.baseline.threshold;
}

/**
 * Run a suite of benchmarks and aggregate pass/fail status.
 */
export async function runSuite(
  name: string,
  benchmarks: Array<{
    name: string;
    fn: BenchmarkFn;
    iterations: number;
    baseline: BenchmarkBaseline;
  }>,
): Promise<BenchmarkSuite> {
  const results: BenchmarkResult[] = [];

  for (const bm of benchmarks) {
    const result = await runBenchmark(bm.name, bm.fn, bm.iterations, bm.baseline);
    results.push(result);
  }

  return {
    name,
    results,
    passed: results.every(passesBaseline),
  };
}

/**
 * Round a number to 3 decimal places for stable reporting.
 */
function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Format a benchmark result as a human-readable string.
 */
export function formatResult(result: BenchmarkResult): string {
  const passFail = passesBaseline(result) ? "PASS" : "FAIL";
  return (
    `${result.name}: ${result.iterations} iterations, ` +
    `mean=${result.meanMs.toFixed(3)}ms, median=${result.medianMs.toFixed(3)}ms, ` +
    `p95=${result.p95Ms.toFixed(3)}ms, p99=${result.p99Ms.toFixed(3)}ms, ` +
    `min=${result.minMs.toFixed(3)}ms, max=${result.maxMs.toFixed(3)}ms, ` +
    `threshold=${result.baseline.threshold.toFixed(3)}ms [${passFail}]`
  );
}

/**
 * Format an entire benchmark suite as a human-readable string.
 */
export function formatSuite(suite: BenchmarkSuite): string {
  const lines = [`Suite: ${suite.name} (${suite.passed ? "PASS" : "FAIL"})`];
  for (const result of suite.results) {
    lines.push(`  ${formatResult(result)}`);
  }
  return lines.join("\n");
}
