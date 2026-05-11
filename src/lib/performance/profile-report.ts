// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Diagnostic collection overhead profiling.
 *
 * Measures the performance impact of diagnostic collection on the critical path.
 * Reports overhead as a percentage of baseline execution time.
 */

import { computeStats } from "./benchmark";

export interface ProfileConfig {
  iterations: number;
  maxOverheadPercent: number;
}

export const DEFAULT_PROFILE_CONFIG: ProfileConfig = {
  iterations: 100,
  maxOverheadPercent: 5,
};

export interface ProfileResult {
  operationName: string;
  baselineMeanMs: number;
  instrumentedMeanMs: number;
  overheadPercent: number;
  withinBudget: boolean;
  maxOverheadPercent: number;
  stats: {
    baseline: {
      meanMs: number;
      medianMs: number;
      p95Ms: number;
      p99Ms: number;
      minMs: number;
      maxMs: number;
    };
    instrumented: {
      meanMs: number;
      medianMs: number;
      p95Ms: number;
      p99Ms: number;
      minMs: number;
      maxMs: number;
    };
  };
}

export interface DiagnosticCollector {
  start(): void;
  stop(): void;
}

/**
 * No-op diagnostic collector for baseline measurement.
 */
export function createNoopCollector(): DiagnosticCollector {
  return {
    start: () => {},
    stop: () => {},
  };
}

/**
 * Simulated diagnostic collector that tracks time spent collecting.
 */
export function createSimulatedCollector(overheadMs: number = 0.01): DiagnosticCollector {
  return {
    start: () => {
      _simulateCollection(overheadMs / 2);
    },
    stop: () => {
      _simulateCollection(overheadMs / 2);
    },
  };
}

/**
 * Run a profile comparison: baseline (no diagnostics) vs instrumented (with diagnostics).
 */
export function profileOperation(
  operationName: string,
  operation: () => void,
  collector: DiagnosticCollector,
  config: ProfileConfig = DEFAULT_PROFILE_CONFIG,
): ProfileResult {
  const baselineDurationsMs: number[] = [];
  const instrumentedDurationsMs: number[] = [];

  for (let i = 0; i < config.iterations; i++) {
    const baselineStart = process.hrtime.bigint();
    operation();
    const baselineEnd = process.hrtime.bigint();
    baselineDurationsMs.push(Number(baselineEnd - baselineStart) / 1e6);

    const instStart = process.hrtime.bigint();
    collector.start();
    operation();
    collector.stop();
    const instEnd = process.hrtime.bigint();
    instrumentedDurationsMs.push(Number(instEnd - instStart) / 1e6);
  }

  const baselineStats = computeStats(baselineDurationsMs);
  const instrumentedStats = computeStats(instrumentedDurationsMs);

  const baselineMean = baselineStats.meanMs || 1;
  const instrumentedMean = instrumentedStats.meanMs;
  const overheadPercent = ((instrumentedMean - baselineMean) / baselineMean) * 100;

  return {
    operationName,
    baselineMeanMs: Math.round(baselineMean * 1000) / 1000,
    instrumentedMeanMs: Math.round(instrumentedMean * 1000) / 1000,
    overheadPercent: Math.round(overheadPercent * 100) / 100,
    withinBudget: overheadPercent <= config.maxOverheadPercent,
    maxOverheadPercent: config.maxOverheadPercent,
    stats: {
      baseline: {
        meanMs: baselineStats.meanMs,
        medianMs: baselineStats.medianMs,
        p95Ms: baselineStats.p95Ms,
        p99Ms: baselineStats.p99Ms,
        minMs: baselineStats.minMs,
        maxMs: baselineStats.maxMs,
      },
      instrumented: {
        meanMs: instrumentedStats.meanMs,
        medianMs: instrumentedStats.medianMs,
        p95Ms: instrumentedStats.p95Ms,
        p99Ms: instrumentedStats.p99Ms,
        minMs: instrumentedStats.minMs,
        maxMs: instrumentedStats.maxMs,
      },
    },
  };
}

/**
 * Profile multiple operations and aggregate results.
 */
export function profileOperations(
  operations: Array<{
    name: string;
    operation: () => void;
    collector: DiagnosticCollector;
  }>,
  config: ProfileConfig = DEFAULT_PROFILE_CONFIG,
): ProfileResult[] {
  return operations.map(({ name, operation, collector }) =>
    profileOperation(name, operation, collector, config),
  );
}

/**
 * Summarize profile results for reporting.
 */
export function summarizeProfile(results: ProfileResult[]): string {
  const lines = ["Diagnostic Overhead Profile:"];
  for (const r of results) {
    const status = r.withinBudget ? "OK" : "EXCEEDS BUDGET";
    lines.push(
      `  ${r.operationName}: baseline=${r.baselineMeanMs.toFixed(3)}ms, ` +
        `instrumented=${r.instrumentedMeanMs.toFixed(3)}ms, ` +
        `overhead=${r.overheadPercent.toFixed(2)}% [max=${r.maxOverheadPercent}%] [${status}]`,
    );
  }
  const allWithinBudget = results.every((r) => r.withinBudget);
  lines.push(`Overall: ${allWithinBudget ? "PASS" : "FAIL"}`);
  return lines.join("\n");
}

/**
 * Simulate diagnostic collection work to burn a given amount of time.
 */
function _simulateCollection(targetMs: number): void {
  const targetNs = targetMs * 1e6;
  const start = process.hrtime.bigint();
  while (process.hrtime.bigint() - start < targetNs) {
    _noop();
  }
}

function _noop(): void {
  // Intentionally empty - used to prevent optimization.
}
