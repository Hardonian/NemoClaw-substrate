// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Scaling test utilities for replaying workloads at different volume multipliers.
 *
 * Verifies that resource growth is approximately linear when event volume
 * increases by 10x, 100x, and 1000x.
 */

import { runBenchmarkSync, type BenchmarkResult } from "./benchmark";

export interface ScalingTestResult {
  multiplier: number;
  throughput: number;
  resourceGrowth: number;
  isLinear: boolean;
  benchmarkResult?: BenchmarkResult;
}

export interface ScalingTestConfig {
  multipliers: number[];
  linearityTolerance: number;
  baselineIterations: number;
}

export const DEFAULT_SCALING_CONFIG: ScalingTestConfig = {
  multipliers: [10, 100, 1000],
  linearityTolerance: 0.2,
  baselineIterations: 100,
};

export type WorkloadFn = (count: number) => void;

/**
 * Measure resource usage before and after a workload run.
 * Returns a normalized resource growth factor relative to the base count.
 */
export function measureResourceGrowth(
  workload: WorkloadFn,
  baselineCount: number,
  targetCount: number,
): number {
  const baselineUsage = sampleResourceUsage(() => workload(baselineCount));
  const targetUsage = sampleResourceUsage(() => workload(targetCount));

  if (baselineUsage === 0) return targetUsage > 0 ? Infinity : 1;

  const growthFactor = targetUsage / baselineUsage;
  const expectedFactor = targetCount / baselineCount;

  return growthFactor / expectedFactor;
}

/**
 * Run a scaling test across multiple volume multipliers.
 *
 * For each multiplier, runs the workload and checks whether resource
 * growth stays within the configured linearity tolerance.
 */
export function runScalingTest(
  workload: WorkloadFn,
  config: ScalingTestConfig = DEFAULT_SCALING_CONFIG,
): ScalingTestResult[] {
  const results: ScalingTestResult[] = [];

  for (const multiplier of config.multipliers) {
    const targetCount = config.baselineIterations * multiplier;

    const benchmarkResult = runBenchmarkSync(
      `scaling-${multiplier}x`,
      () => workload(targetCount),
      Math.max(1, Math.floor(config.baselineIterations / multiplier)),
      { meanMs: 0, threshold: Infinity },
    );

    const growthRatio = measureResourceGrowth(workload, config.baselineIterations, targetCount);
    const isLinear = growthRatio <= 1 + config.linearityTolerance;

    results.push({
      multiplier,
      throughput: targetCount / (benchmarkResult.meanMs || 1),
      resourceGrowth: Math.round(growthRatio * 1000) / 1000,
      isLinear,
      benchmarkResult,
    });
  }

  return results;
}

/**
 * Summarize scaling test results for reporting.
 */
export function summarizeScaling(results: ScalingTestResult[]): string {
  const lines = ["Scaling Test Summary:"];
  for (const r of results) {
    const status = r.isLinear ? "LINEAR" : "NON-LINEAR";
    lines.push(
      `  ${r.multiplier}x: throughput=${r.throughput.toFixed(1)} events/ms, ` +
        `resourceGrowth=${r.resourceGrowth.toFixed(3)} [${status}]`,
    );
  }
  const allLinear = results.every((r) => r.isLinear);
  lines.push(`Overall: ${allLinear ? "PASS" : "FAIL"}`);
  return lines.join("\n");
}

/**
 * Sample resource usage (heap memory) around a workload execution.
 * Uses process.memoryUsage() for a lightweight proxy measurement.
 */
function sampleResourceUsage(workload: () => void): number {
  if (global.gc) {
    global.gc();
  }
  const before = process.memoryUsage().heapUsed;
  workload();
  const after = process.memoryUsage().heapUsed;
  return Math.max(0, after - before);
}
