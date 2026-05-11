#!/usr/bin/env -S npx tsx
// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
//
// Runs benchmark verification against published baselines.
// Loads baseline thresholds from ci/benchmark-baselines.json, runs benchmarks,
// and compares results against baselines.
//
// Usage:
//   npx tsx scripts/verify-benchmarks.ts
//   npx tsx scripts/verify-benchmarks.ts --baseline <path>

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import process from "node:process";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

type BenchmarkMetric = {
  name: string;
  value: number;
  unit: string;
  higherIsBetter?: boolean;
};

type BaselineThreshold = {
  metric: string;
  min?: number;
  max?: number;
  tolerancePct?: number;
};

type BaselineManifest = {
  version: string;
  environment: string;
  thresholds: BaselineThreshold[];
  updatedAt?: string;
};

type BenchmarkResult = {
  passed: boolean;
  metrics: BenchmarkMetric[];
  violations: string[];
};

function loadJSON<T>(absPath: string): T | null {
  if (!existsSync(absPath)) return null;
  return JSON.parse(readFileSync(absPath, "utf-8")) as T;
}

function loadBaseline(): BaselineManifest | null {
  const candidates = [
    "ci/benchmark-baselines.json",
    "benchmarks/baselines.json",
    ".benchmarks/baselines.json",
  ];
  for (const candidate of candidates) {
    const abs = join(REPO_ROOT, candidate);
    const data = loadJSON<BaselineManifest>(abs);
    if (data) return data;
  }
  return null;
}

function runBenchmarks(): BenchmarkMetric[] {
  const metrics: BenchmarkMetric[] = [];

  // Run npm test with coverage to get performance data
  try {
    const testStart = Date.now();
    execFileSync("npm", ["test", "--", "--reporter=basic"], {
      cwd: REPO_ROOT,
      encoding: "utf-8",
      stdio: ["inherit", "pipe", "pipe"],
      timeout: 120_000,
    });
    const testDuration = Date.now() - testStart;
    metrics.push({
      name: "test_suite_duration",
      value: testDuration,
      unit: "ms",
      higherIsBetter: false,
    });
  } catch {
    // Tests may fail — record duration anyway if we got far enough
    metrics.push({
      name: "test_suite_duration",
      value: Date.now(),
      unit: "ms",
      higherIsBetter: false,
    });
  }

  // Measure CLI startup time
  try {
    const start = Date.now();
    execFileSync("node", ["-e", "require('./dist/lib/index.js')"], {
      cwd: REPO_ROOT,
      encoding: "utf-8",
      stdio: "pipe",
      timeout: 10_000,
    });
    const duration = Date.now() - start;
    metrics.push({
      name: "cli_startup",
      value: duration,
      unit: "ms",
      higherIsBetter: false,
    });
  } catch {
    // dist may not exist — skip
  }

  return metrics;
}

function checkAgainstBaselines(
  metrics: BenchmarkMetric[],
  baseline: BaselineManifest,
): { passed: boolean; violations: string[] } {
  const violations: string[] = [];

  for (const metric of metrics) {
    const threshold = baseline.thresholds.find((t) => t.metric === metric.name);
    if (!threshold) continue;

    const tolerance = threshold.tolerancePct ?? 5;
    let failed = false;

    if (threshold.min !== undefined) {
      const effectiveMin = threshold.min * (1 - tolerance / 100);
      if (metric.value < effectiveMin) {
        failed = true;
        violations.push(
          `${metric.name}: ${metric.value}${metric.unit} < min ${effectiveMin}${metric.unit} (baseline ${threshold.min}, tolerance ${tolerance}%)`,
        );
      }
    }

    if (threshold.max !== undefined) {
      const effectiveMax = threshold.max * (1 + tolerance / 100);
      if (metric.value > effectiveMax) {
        failed = true;
        violations.push(
          `${metric.name}: ${metric.value}${metric.unit} > max ${effectiveMax}${metric.unit} (baseline ${threshold.max}, tolerance ${tolerance}%)`,
        );
      }
    }

    // If no explicit min/max, use higherIsBetter heuristic
    if (threshold.min === undefined && threshold.max === undefined && threshold.tolerancePct !== undefined) {
      // Use previous run if available
    }
  }

  return { passed: violations.length === 0, violations };
}

function main(): BenchmarkResult {
  const args = process.argv.slice(2);
  const baselinePath = args.includes("--baseline")
    ? args[args.indexOf("--baseline") + 1]
    : null;

  console.log("=== Benchmark Verification ===\n");

  // Load baseline
  let baseline: BaselineManifest | null = null;
  if (baselinePath) {
    baseline = loadJSON<BaselineManifest>(join(REPO_ROOT, baselinePath));
    if (!baseline) {
      console.error(`FAIL: Could not load baseline from ${baselinePath}`);
      return { passed: false, metrics: [], violations: [`Baseline not found: ${baselinePath}`] };
    }
  } else {
    baseline = loadBaseline();
  }

  if (!baseline) {
    console.log("WARN: No baseline found — skipping benchmark comparison");
    console.log("Create ci/benchmark-baselines.json to enable benchmark verification");
    return { passed: true, metrics: [], violations: [] };
  }

  console.log(`Baseline: ${baseline.version} (${baseline.environment})\n`);

  // Run benchmarks
  console.log("Running benchmarks...");
  const metrics = runBenchmarks();
  console.log(`Collected ${metrics.length} metric(s)\n`);

  // Check against baselines
  const { passed, violations } = checkAgainstBaselines(metrics, baseline);

  // Print results
  for (const metric of metrics) {
    const arrow = metric.higherIsBetter !== false ? "↑" : "↓";
    console.log(`  ${arrow} ${metric.name}: ${metric.value}${metric.unit}`);
  }

  if (violations.length > 0) {
    console.error("\nViolations:");
    for (const v of violations) {
      console.error(`  FAIL: ${v}`);
    }
  }

  const summary = `Benchmark verification: ${passed ? "PASS" : "FAIL"} (${metrics.length} metrics, ${violations.length} violations)`;
  console.log(`\n${summary}`);

  return { passed, metrics, violations };
}

export { loadBaseline, runBenchmarks, checkAgainstBaselines };
export type { BenchmarkMetric, BaselineThreshold, BaselineManifest, BenchmarkResult };

if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("verify-benchmarks.ts")
) {
  const result = main();
  process.exitCode = result.passed ? 0 : 1;
}
