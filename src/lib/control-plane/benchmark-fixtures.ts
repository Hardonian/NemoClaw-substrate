// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Benchmark fixture generation.
 *
 * Produces:
 * - Large deterministic event streams
 * - Replay stress fixtures
 * - Diagnostics stress fixtures
 *
 * All fixtures are deterministic given the same seed.
 * No routing, execution lifecycle, orchestration, retries, remote execution, or daemon behavior.
 */

import { createHash } from "node:crypto";

import type { OperationalEvent, OperationalEventCategory } from "./operational-memory";
import { deterministicSerialize } from "./serde";
import { buildReplayEnvelope } from "./replay";
import type { ReplayEnvelope } from "./replay";
import { buildEvidenceBundle, buildReplayEvidencePackage } from "./evidence-export";
import type { EvidenceBundle, ReplayEvidencePackage, EvidenceClassification } from "./evidence-types";

export interface BenchmarkEventStreamOptions {
  eventCount: number;
  seed: string;
  baseTimestamp: string;
  categoryMix: Record<string, number>;
  payloadSize: "small" | "medium" | "large";
}

const DEFAULT_BENCHMARK_OPTIONS: BenchmarkEventStreamOptions = {
  eventCount: 1000,
  seed: "benchmark",
  baseTimestamp: "2026-05-09T12:00:00Z",
  categoryMix: {
    receipt: 0.2,
    policy_outcome: 0.15,
    execution_plan_created: 0.1,
    execution_plan_approved: 0.1,
    execution_authorization_granted: 0.1,
    degraded_state: 0.1,
    fallback: 0.05,
    diagnostics_snapshot: 0.05,
    replay_metadata: 0.05,
    scheduler_outcome: 0.05,
    operator_override: 0.025,
    runtime_action: 0.025,
  },
  payloadSize: "small",
};

export interface BenchmarkEventStreamResult {
  events: OperationalEvent[];
  envelope: ReplayEnvelope;
  bundle: EvidenceBundle;
  pkg: ReplayEvidencePackage;
  streamHash: string;
  categoryCounts: Record<string, number>;
  generationTimeMs: number;
}

function seededRandom(seed: string, index: number): number {
  const hash = createHash("sha256").update(`${seed}:${index}`).digest("hex");
  return parseInt(hash.slice(0, 8), 16) / 0xffffffff;
}

function deterministicTimestamp(base: string, offsetSeconds: number): string {
  const baseMs = Date.parse(base);
  return new Date(baseMs + offsetSeconds * 1000).toISOString();
}

function selectCategory(cumulativeWeights: Array<[string, number]>, r: number): string {
  let cumulative = 0;
  for (const [category, weight] of cumulativeWeights) {
    cumulative += weight;
    if (r < cumulative) return category;
  }
  return cumulativeWeights[cumulativeWeights.length - 1][0];
}

function buildPayload(index: number, category: string, size: "small" | "medium" | "large"): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    sequence: index,
    category,
    fixtureIndex: index,
  };

  if (size === "medium" || size === "large") {
    payload.tags = Array.from({ length: size === "large" ? 20 : 5 }, (_, i) => `tag-${index}-${i}`);
    payload.metadata = {
      generatedBy: "benchmark-fixture",
      payloadSize: size,
      extraData: Array.from({ length: size === "large" ? 50 : 10 }, (_, i) => `data-${index}-${i}`).join(","),
    };
  }

  if (size === "large") {
    payload.nested = {
      level1: {
        level2: {
          level3: {
            deepData: Array.from({ length: 20 }, (_, i) => `deep-${index}-${i}`),
            numericData: Array.from({ length: 20 }, (_, i) => seededRandom("benchmark-large", index * 100 + i) * 1000),
          },
        },
      },
    };
  }

  if (category === "degraded_state") {
    payload.degraded = {
      category: "degraded",
      reason: `benchmark-degraded-${index}`,
      affectedSubsystem: `subsystem-${index % 10}`,
      severity: ["info", "warning", "error", "critical"][index % 4],
      reasonCode: "unknown_error",
      explanation: `Benchmark degraded state ${index}`,
      sourceComponent: "benchmark-fixture",
      timestamp: deterministicTimestamp("2026-05-09T12:00:00Z", index),
    };
  }

  if (category === "fallback") {
    payload.fallback = {
      attempt: index,
      reason: `benchmark-fallback-${index}`,
      target: `node-benchmark-${index % 5}`,
    };
  }

  return payload;
}

export function generateBenchmarkEventStream(input: Partial<BenchmarkEventStreamOptions> = {}): BenchmarkEventStreamResult {
  const startMs = Date.now();
  const opts = { ...DEFAULT_BENCHMARK_OPTIONS, ...input };

  const cumulativeWeights: Array<[string, number]> = [];
  let cumulative = 0;
  for (const [category, weight] of Object.entries(opts.categoryMix)) {
    cumulative += weight;
    cumulativeWeights.push([category, weight]);
  }

  const events: OperationalEvent[] = [];
  const categoryCounts: Record<string, number> = {};

  for (let i = 0; i < opts.eventCount; i++) {
    const r = seededRandom(opts.seed, i);
    const category = selectCategory(cumulativeWeights, r);
    categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;

    const ts = deterministicTimestamp(opts.baseTimestamp, Math.floor(i * 0.5));
    const eventId = `op-bench-${createHash("sha256").update(`${opts.seed}:${i}`).digest("base64url").slice(0, 12)}`;

    events.push({
      eventId,
      occurredAt: ts,
      sequence: i,
      category: category as OperationalEventCategory,
      source: "benchmark-fixture",
      provenance: { requestId: `req-bench-${i}`, actor: "benchmark" },
      replayRef: { lineage: ["benchmark", opts.seed, `seq-${i}`], replayVersion: "1" },
      payload: buildPayload(i, category, opts.payloadSize),
    });
  }

  const envelope = buildReplayEnvelope(events, opts.baseTimestamp);
  const generatedAt = opts.baseTimestamp;

  const bundle = buildEvidenceBundle({
    artifacts: [],
    generatedAt,
    classification: "internal",
  });

  const pkg = buildReplayEvidencePackage({
    replayEnvelope: envelope,
    events,
    generatedAt,
  });

  const streamHash = createHash("sha256")
    .update(deterministicSerialize({
      seed: opts.seed,
      eventCount: opts.eventCount,
      categoryCounts,
      firstEventId: events[0]?.eventId,
      lastEventId: events[events.length - 1]?.eventId,
    }))
    .digest("hex");

  return {
    events,
    envelope,
    bundle,
    pkg,
    streamHash,
    categoryCounts,
    generationTimeMs: Date.now() - startMs,
  };
}

export interface ReplayStressFixtureOptions {
  eventCount: number;
  seed: string;
  baseTimestamp: string;
  includeFullLineage: boolean;
  includeNestedPayloads: boolean;
  classification: EvidenceClassification;
}

const DEFAULT_REPLAY_STRESS_OPTIONS: ReplayStressFixtureOptions = {
  eventCount: 5000,
  seed: "replay-stress",
  baseTimestamp: "2026-05-09T12:00:00Z",
  includeFullLineage: true,
  includeNestedPayloads: true,
  classification: "internal",
};

export interface ReplayStressFixtureResult {
  events: OperationalEvent[];
  envelope: ReplayEnvelope;
  pkg: ReplayEvidencePackage;
  fixtureHash: string;
  eventSize: number;
  envelopeSize: number;
  packageSize: number;
}

export function generateReplayStressFixture(input: Partial<ReplayStressFixtureOptions> = {}): ReplayStressFixtureResult {
  const opts = { ...DEFAULT_REPLAY_STRESS_OPTIONS, ...input };
  const events: OperationalEvent[] = [];

  const stressCategories: OperationalEventCategory[] = [
    "execution_plan_created",
    "execution_plan_approved",
    "execution_authorization_granted",
    "execution_replay_validation_succeeded",
    "execution_plan_phase_transition",
    "execution_policy_snapshot_recorded",
    "execution_trust_snapshot_recorded",
    "receipt",
    "policy_outcome",
    "scheduler_outcome",
  ];

  for (let i = 0; i < opts.eventCount; i++) {
    const category = stressCategories[i % stressCategories.length];
    const ts = deterministicTimestamp(opts.baseTimestamp, Math.floor(i * 0.1));
    const eventId = `op-stress-${createHash("sha256").update(`${opts.seed}:${i}`).digest("base64url").slice(0, 12)}`;
    const planId = `plan-stress-${Math.floor(i / 10)}`;

    const payload: Record<string, unknown> = {
      sequence: i,
      category,
      planId,
    };

    if (opts.includeNestedPayloads) {
      payload.nested = {
        depth1: {
          depth2: {
            depth3: {
              value: seededRandom(opts.seed, i * 37) * 10000,
              tags: Array.from({ length: 3 }, (_, j) => `stress-tag-${i}-${j}`),
            },
          },
        },
      };
    }

    const lineage = opts.includeFullLineage
      ? ["replay-stress", opts.seed, planId, `seq-${i}`]
      : ["replay-stress", `seq-${i}`];

    events.push({
      eventId,
      occurredAt: ts,
      sequence: i,
      category,
      source: "replay-stress-fixture",
      provenance: { requestId: `req-stress-${i}`, actor: "replay-stress" },
      replayRef: { lineage, replayVersion: "1" },
      payload,
    });
  }

  const envelope = buildReplayEnvelope(events, opts.baseTimestamp);
  const generatedAt = opts.baseTimestamp;

  const pkg = buildReplayEvidencePackage({
    replayEnvelope: envelope,
    events,
    generatedAt,
  });

  const fixtureHash = createHash("sha256")
    .update(deterministicSerialize({
      seed: opts.seed,
      eventCount: opts.eventCount,
      envelopeDigest: envelope.digest,
    }))
    .digest("hex");

  return {
    events,
    envelope,
    pkg,
    fixtureHash,
    eventSize: Buffer.byteLength(deterministicSerialize(events), "utf8"),
    envelopeSize: Buffer.byteLength(deterministicSerialize(envelope), "utf8"),
    packageSize: Buffer.byteLength(deterministicSerialize(pkg), "utf8"),
  };
}

export interface DiagnosticsStressFixtureOptions {
  diagnosticCount: number;
  seed: string;
  baseTimestamp: string;
  includeTelemetry: boolean;
  includeReplayMetadata: boolean;
}

const DEFAULT_DIAGNOSTICS_STRESS_OPTIONS: DiagnosticsStressFixtureOptions = {
  diagnosticCount: 2000,
  seed: "diagnostics-stress",
  baseTimestamp: "2026-05-09T12:00:00Z",
  includeTelemetry: true,
  includeReplayMetadata: true,
};

export interface DiagnosticsStressFixtureResult {
  events: OperationalEvent[];
  envelope: ReplayEnvelope;
  fixtureHash: string;
  telemetryCount: number;
  replayMetadataCount: number;
  diagnosticsSnapshotCount: number;
}

export function generateDiagnosticsStressFixture(input: Partial<DiagnosticsStressFixtureOptions> = {}): DiagnosticsStressFixtureResult {
  const opts = { ...DEFAULT_DIAGNOSTICS_STRESS_OPTIONS, ...input };
  const events: OperationalEvent[] = [];

  const diagnosticCategories: OperationalEventCategory[] = [
    "diagnostics_snapshot",
    "telemetry_probe_started",
    "telemetry_probe_succeeded",
    "telemetry_probe_failed",
    "telemetry_parse_succeeded",
    "telemetry_parse_failed",
    "telemetry_unavailable",
    "telemetry_stale",
    "telemetry_conflict_detected",
    "telemetry_registry_update_applied",
    "telemetry_registry_update_skipped",
  ];

  const replayMetadataCategories: OperationalEventCategory[] = ["replay_metadata"];

  let seq = 0;
  let telemetryCount = 0;
  let replayMetadataCount = 0;
  let diagnosticsSnapshotCount = 0;

  for (let i = 0; i < opts.diagnosticCount; i++) {
    const r = seededRandom(opts.seed, i);
    let category: OperationalEventCategory;

    if (r < 0.3) {
      category = "diagnostics_snapshot";
      diagnosticsSnapshotCount++;
    } else if (r < 0.7 && opts.includeTelemetry) {
      category = diagnosticCategories[1 + Math.floor(seededRandom(opts.seed, i * 13) * (diagnosticCategories.length - 1))];
      telemetryCount++;
    } else if (opts.includeReplayMetadata) {
      category = replayMetadataCategories[0];
      replayMetadataCount++;
    } else {
      category = "diagnostics_snapshot";
      diagnosticsSnapshotCount++;
    }

    const ts = deterministicTimestamp(opts.baseTimestamp, Math.floor(i * 2));
    const eventId = `op-diag-stress-${createHash("sha256").update(`${opts.seed}:${i}`).digest("base64url").slice(0, 12)}`;

    const payload: Record<string, unknown> = {
      sequence: i,
      category,
      fixtureIndex: i,
    };

    if (category.includes("telemetry")) {
      payload.probeId = `probe-${i % 20}`;
      payload.targetSubsystem = `subsystem-${i % 5}`;
      if (category.includes("failed")) {
        payload.errorCode = `ERR_TELEMETRY_${i % 10}`;
        payload.errorMessage = `Telemetry failure for probe-${i % 20}`;
      }
      if (category.includes("conflict")) {
        payload.conflictingSources = [`source-a-${i}`, `source-b-${i}`];
        payload.conflictingValues = [seededRandom(opts.seed, i * 41), seededRandom(opts.seed, i * 42)];
      }
    }

    if (category === "diagnostics_snapshot") {
      payload.snapshotVersion = i % 5;
      payload.metrics = {
        cpu: seededRandom(opts.seed, i * 51) * 100,
        memory: seededRandom(opts.seed, i * 52) * 100,
        latency: seededRandom(opts.seed, i * 53) * 5000,
      };
    }

    events.push({
      eventId,
      occurredAt: ts,
      sequence: seq++,
      category,
      source: "diagnostics-stress-fixture",
      provenance: { actor: "diagnostics-stress" },
      replayRef: { lineage: ["diagnostics-stress", opts.seed, `seq-${i}`], replayVersion: "1" },
      payload,
    });
  }

  const envelope = buildReplayEnvelope(events, opts.baseTimestamp);
  const fixtureHash = createHash("sha256")
    .update(deterministicSerialize({
      seed: opts.seed,
      diagnosticCount: opts.diagnosticCount,
      telemetryCount,
      replayMetadataCount,
      diagnosticsSnapshotCount,
    }))
    .digest("hex");

  return {
    events,
    envelope,
    fixtureHash,
    telemetryCount,
    replayMetadataCount,
    diagnosticsSnapshotCount,
  };
}
