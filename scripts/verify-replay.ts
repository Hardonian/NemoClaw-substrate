#!/usr/bin/env -S npx tsx
// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
//
// Verifies replay integrity: deterministic replay matches original execution trace.
// Compares replay output against original execution traces.
//
// Usage:
//   npx tsx scripts/verify-replay.ts
//   npx tsx scripts/verify-replay.ts --trace <path> --replay <path>

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

type TraceEvent = {
  id?: string | number;
  type?: string;
  timestamp?: number | string;
  action?: string;
  result?: unknown;
  state?: Record<string, unknown>;
  [key: string]: unknown;
};

type ExecutionTrace = {
  version?: string;
  id?: string;
  events: TraceEvent[];
  metadata?: Record<string, unknown>;
  output?: unknown;
};

type ReplayCheck = { name: string; passed: boolean; detail: string };

type ReplayResult = {
  passed: boolean;
  checks: ReplayCheck[];
};

function loadJSON<T>(absPath: string): T | null {
  if (!existsSync(absPath)) return null;
  try {
    return JSON.parse(readFileSync(absPath, "utf-8")) as T;
  } catch {
    return null;
  }
}

function findTraces(): { trace: string | null; replay: string | null } {
  const traceCandidates = [
    "test/fixtures/trace.json",
    ".replay/trace.json",
    "traces/latest.json",
    "ci/trace.json",
  ];
  const replayCandidates = [
    "test/fixtures/replay.json",
    ".replay/replay.json",
    "replays/latest.json",
    "ci/replay.json",
  ];

  let trace: string | null = null;
  for (const candidate of traceCandidates) {
    if (existsSync(join(REPO_ROOT, candidate))) {
      trace = candidate;
      break;
    }
  }

  let replay: string | null = null;
  for (const candidate of replayCandidates) {
    if (existsSync(join(REPO_ROOT, candidate))) {
      replay = candidate;
      break;
    }
  }

  return { trace, replay };
}

function hashTraceEvent(event: TraceEvent): string {
  // Exclude non-deterministic fields (timestamp) for comparison
  const { timestamp, ...stable } = event;
  const serialized = JSON.stringify(stable, Object.keys(stable).sort());
  return createHash("sha256").update(serialized).digest("hex").slice(0, 16);
}

function checkEventCount(original: ExecutionTrace, replay: ExecutionTrace): ReplayCheck {
  const origCount = original.events?.length ?? 0;
  const replayCount = replay.events?.length ?? 0;

  if (origCount !== replayCount) {
    return {
      name: "event_count",
      passed: false,
      detail: `Original has ${origCount} events, replay has ${replayCount}`,
    };
  }
  return { name: "event_count", passed: true, detail: `${origCount} events match` };
}

function checkEventSequence(original: ExecutionTrace, replay: ExecutionTrace): ReplayCheck {
  const origEvents = original.events ?? [];
  const replayEvents = replay.events ?? [];
  const mismatches: string[] = [];

  const maxLen = Math.max(origEvents.length, replayEvents.length);
  for (let i = 0; i < maxLen; i++) {
    const origHash = i < origEvents.length ? hashTraceEvent(origEvents[i]) : "missing";
    const replayHash = i < replayEvents.length ? hashTraceEvent(replayEvents[i]) : "missing";

    if (origHash !== replayHash) {
      mismatches.push(`[${i}] ${origHash} != ${replayHash}`);
    }
  }

  if (mismatches.length > 0) {
    const display = mismatches.length > 5
      ? mismatches.slice(0, 5).concat([`... and ${mismatches.length - 5} more`])
      : mismatches;
    return {
      name: "event_sequence",
      passed: false,
      detail: `${mismatches.length} mismatch(es): ${display.join(", ")}`,
    };
  }
  return { name: "event_sequence", passed: true, detail: "All events match" };
}

function checkOutput(original: ExecutionTrace, replay: ExecutionTrace): ReplayCheck {
  const origOutput = JSON.stringify(original.output ?? null);
  const replayOutput = JSON.stringify(replay.output ?? null);

  if (origOutput !== replayOutput) {
    return {
      name: "output_match",
      passed: false,
      detail: `Output differs (original ${origOutput.length} chars, replay ${replayOutput.length} chars)`,
    };
  }
  return { name: "output_match", passed: true, detail: "Outputs match" };
}

function checkDeterminism(original: ExecutionTrace, replay: ExecutionTrace): ReplayCheck {
  // Verify that replay events produce the same final state
  const origFinalState = original.events?.[original.events.length - 1]?.state;
  const replayFinalState = replay.events?.[replay.events.length - 1]?.state;

  if (!origFinalState && !replayFinalState) {
    return { name: "determinism", passed: true, detail: "No final state to compare" };
  }

  if (!origFinalState || !replayFinalState) {
    return {
      name: "determinism",
      passed: false,
      detail: "Final state missing in one trace",
    };
  }

  const origHash = JSON.stringify(origFinalState, Object.keys(origFinalState as object).sort());
  const replayHash = JSON.stringify(replayFinalState, Object.keys(replayFinalState as object).sort());

  if (origHash !== replayHash) {
    return {
      name: "determinism",
      passed: false,
      detail: "Final state differs between original and replay",
    };
  }
  return { name: "determinism", passed: true, detail: "Final states match" };
}

function main(): ReplayResult {
  const args = process.argv.slice(2);
  const tracePath = args.includes("--trace")
    ? args[args.indexOf("--trace") + 1]
    : null;
  const replayPath = args.includes("--replay")
    ? args[args.indexOf("--replay") + 1]
    : null;

  console.log("=== Replay Verification ===\n");

  // Find traces
  let traceFile = tracePath;
  let replayFile = replayPath;

  if (!traceFile || !replayFile) {
    const found = findTraces();
    traceFile = traceFile ?? found.trace;
    replayFile = replayFile ?? found.replay;
  }

  if (!traceFile) {
    console.log("WARN: No trace found — skipping replay verification");
    console.log("Provide --trace <path> or create test/fixtures/trace.json");
    return { passed: true, checks: [{ name: "trace_exists", passed: true, detail: "No trace to verify" }] };
  }

  if (!replayFile) {
    console.log("WARN: No replay found — skipping replay verification");
    console.log("Provide --replay <path> or create test/fixtures/replay.json");
    return { passed: true, checks: [{ name: "replay_exists", passed: true, detail: "No replay to verify" }] };
  }

  const trace = loadJSON<ExecutionTrace>(join(REPO_ROOT, traceFile));
  const replay = loadJSON<ExecutionTrace>(join(REPO_ROOT, replayFile));

  if (!trace) {
    console.error(`FAIL: Could not parse trace: ${traceFile}`);
    return { passed: false, checks: [{ name: "parse_trace", passed: false, detail: `Invalid JSON: ${traceFile}` }] };
  }
  if (!replay) {
    console.error(`FAIL: Could not parse replay: ${replayFile}`);
    return { passed: false, checks: [{ name: "parse_replay", passed: false, detail: `Invalid JSON: ${replayFile}` }] };
  }

  console.log(`Trace: ${traceFile} (${trace.events?.length ?? 0} events)`);
  console.log(`Replay: ${replayFile} (${replay.events?.length ?? 0} events)\n`);

  const checks: ReplayCheck[] = [];

  checks.push(checkEventCount(trace, replay));
  checks.push(checkEventSequence(trace, replay));
  checks.push(checkOutput(trace, replay));
  checks.push(checkDeterminism(trace, replay));

  // Print results
  const failures = checks.filter((c) => !c.passed);
  for (const check of checks) {
    const status = check.passed ? "PASS" : "FAIL";
    console.log(`${status} ${check.name}: ${check.detail}`);
  }

  const summary = `Replay verification: ${failures.length === 0 ? "PASS" : "FAIL"} (${checks.length - failures.length}/${checks.length} checks passed)`;
  console.log(`\n${summary}`);

  return { passed: failures.length === 0, checks };
}

export { checkEventCount, checkEventSequence, checkOutput, checkDeterminism, hashTraceEvent, findTraces };
export type { ExecutionTrace, TraceEvent, ReplayCheck, ReplayResult };

if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("verify-replay.ts")
) {
  const result = main();
  process.exitCode = result.passed ? 0 : 1;
}
