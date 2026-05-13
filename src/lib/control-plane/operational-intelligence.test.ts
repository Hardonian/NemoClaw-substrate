// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { OperationalMemoryLog } from "./operational-memory";
import { buildReplayEnvelope, validateReplayEnvelope } from "./replay";
import { buildPromotionProposals, generatePolicyCandidates } from "./policy-promotion";
import { summarizeDegradedTimeline, summarizeDegradedStateTriggerFrequency, summarizePolicyOutcomes, summarizeTelemetryDimensions, summarizeTelemetryEventCounts } from "./observability";

describe("operational intelligence substrate", () => {
  it("keeps append ordering and deterministic ids", () => {
    const log = new OperationalMemoryLog();
    const e1 = log.append({ occurredAt: "2026-05-09T00:00:00.000Z", category: "policy_outcome", source: "test", provenance: {}, payload: { policyDecision: { allowed: false, requiredApproval: false, reasons: [{ code: "deny" }] } } });
    const e2 = log.append({ occurredAt: "2026-05-09T00:00:01.000Z", category: "degraded_state_trigger", source: "test", provenance: {}, payload: { degraded_state_trigger: { reason: "policy_blocked" } } });
    expect(log.list().map((e) => e.sequence)).toEqual([0, 1]);
    expect(e1.eventId).not.toEqual(e2.eventId);
  });

  it("validates replay stability and integrity", () => {
    const log = new OperationalMemoryLog();
    log.append({ occurredAt: "2026-05-09T00:00:00.000Z", category: "policy_outcome", source: "test", provenance: {}, replayRef: { lineage: ["test"], replayVersion: "1" }, payload: { policyDecision: { allowed: true, requiredApproval: false, reasons: [{ code: "policy_default_allow" }] } } });
    const envelope = buildReplayEnvelope(log.list(), "2026-05-09T00:00:02.000Z");
    expect(validateReplayEnvelope(envelope).ok).toBe(true);
  });

  it("preserves telemetry event kind and reasonCode through replay", () => {
    const log = new OperationalMemoryLog();
    log.append({ occurredAt: "2026-05-09T00:00:00.000Z", category: "telemetry_registry_update_skipped", source: "worker-probes", provenance: {}, payload: { reasonCode: "retained_previous_observed", confidence: "low" } });
    const envelope = buildReplayEnvelope(log.list(), "2026-05-09T00:00:02.000Z");
    expect(envelope.events[0]?.category).toBe("telemetry_registry_update_skipped");
    expect(envelope.events[0]?.payload.reasonCode).toBe("retained_previous_observed");
  });

  it("groups policy candidates and remains proposal-only", () => {
    const log = new OperationalMemoryLog();
    log.append({ occurredAt: "2026-05-09T00:00:00.000Z", category: "degraded_state_trigger", source: "test", provenance: {}, payload: { degraded_state_trigger: { reason: "policy_blocked" } } });
    log.append({ occurredAt: "2026-05-09T00:00:01.000Z", category: "degraded_state_trigger", source: "test", provenance: {}, payload: { degraded_state_trigger: { reason: "policy_blocked" } } });
    const candidates = generatePolicyCandidates(log.list(), 2);
    const proposals = buildPromotionProposals(candidates);
    expect(candidates.length).toBe(1);
    expect(proposals[0]?.status).toBe("review_required");
  });

  it("has stable observability summaries and empty behavior", () => {
    const log = new OperationalMemoryLog();
    expect(summarizePolicyOutcomes(log.list())).toEqual({ allow: 0, deny: 0, approval_required: 0, unavailable: 0 });
    log.append({ occurredAt: "2026-05-09T00:00:00.000Z", category: "degraded_state", source: "test", provenance: {}, payload: { degraded: { reasonCode: "heartbeat_stale" } } });
    log.append({ occurredAt: "2026-05-09T00:00:01.000Z", category: "degraded_state_trigger", source: "test", provenance: {}, payload: { degraded_state_trigger: { reason: "provider_timeout" } } });
    expect(summarizeDegradedTimeline(log.list())[0]).toContain("heartbeat_stale");
    expect(summarizeDegradedStateTriggerFrequency(log.list())).toEqual({ provider_timeout: 1 });
  });

  it("aggregates telemetry dimensions", () => {
    const log = new OperationalMemoryLog();
    log.append({ occurredAt: "2026-05-09T00:00:00.000Z", category: "telemetry_probe_started", source: "worker-probes", provenance: {}, payload: { confidence: "low" } });
    log.append({ occurredAt: "2026-05-09T00:00:01.000Z", category: "telemetry_parse_partial", source: "worker-probes", provenance: {}, payload: { confidence: "medium" } });
    log.append({ occurredAt: "2026-05-09T00:00:02.000Z", category: "telemetry_registry_update_skipped", source: "worker-probes", provenance: {}, payload: { confidence: "low" } });
    log.append({ occurredAt: "2026-05-09T00:00:03.000Z", category: "telemetry_registry_update_applied", source: "worker-probes", provenance: {}, payload: { confidence: "high" } });
    log.append({ occurredAt: "2026-05-09T00:00:04.000Z", category: "telemetry_conflict_detected", source: "worker-probes", provenance: {}, payload: { confidence: "low" } });
    log.append({ occurredAt: "2026-05-09T00:00:05.000Z", category: "telemetry_stale", source: "worker-probes", provenance: {}, payload: { confidence: "low" } });
    expect(summarizeTelemetryEventCounts(log.list())).toEqual({ telemetry_conflict_detected: 1, telemetry_parse_partial: 1, telemetry_probe_started: 1, telemetry_registry_update_applied: 1, telemetry_registry_update_skipped: 1, telemetry_stale: 1 });
    expect(summarizeTelemetryDimensions(log.list()).confidence).toEqual({ high: 1, low: 4, medium: 1 });
  });


  it("treats replay_metadata and diagnostics_snapshot as reserved (not telemetry aggregates)", () => {
    const log = new OperationalMemoryLog();
    log.append({ occurredAt: "2026-05-09T00:00:00.000Z", category: "replay_metadata", source: "test", provenance: {}, payload: { note: "reserved" } });
    log.append({ occurredAt: "2026-05-09T00:00:01.000Z", category: "diagnostics_snapshot", source: "test", provenance: {}, payload: { note: "reserved" } });
    expect(summarizeTelemetryEventCounts(log.list())).toEqual({});
    expect(summarizeTelemetryDimensions(log.list())).toEqual({ confidence: {}, source: {} });
  });

});
