// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { OperationalMemoryLog } from "./operational-memory";
import { buildReplayEnvelope, validateReplayEnvelope } from "./replay";
import { buildPromotionProposals, generatePolicyCandidates } from "./policy-promotion";
import { summarizeDegradedTimeline, summarizeFallbackFrequency, summarizePolicyOutcomes } from "./observability";

describe("operational intelligence substrate", () => {
  it("keeps append ordering and deterministic ids", () => {
    const log = new OperationalMemoryLog();
    const e1 = log.append({ occurredAt: "2026-05-09T00:00:00.000Z", category: "policy_outcome", source: "test", provenance: {}, payload: { policyDecision: { allowed: false, requiredApproval: false, reasons: [{ code: "deny" }] } } });
    const e2 = log.append({ occurredAt: "2026-05-09T00:00:01.000Z", category: "fallback", source: "test", provenance: {}, payload: { fallback: { reason: "policy_blocked" } } });
    expect(log.list().map((e) => e.sequence)).toEqual([0, 1]);
    expect(e1.eventId).not.toEqual(e2.eventId);
  });

  it("validates replay stability and integrity", () => {
    const log = new OperationalMemoryLog();
    log.append({ occurredAt: "2026-05-09T00:00:00.000Z", category: "policy_outcome", source: "test", provenance: {}, payload: { policyDecision: { allowed: true, requiredApproval: false } } });
    const envelope = buildReplayEnvelope(log.list(), "2026-05-09T00:00:02.000Z");
    expect(validateReplayEnvelope(envelope).ok).toBe(true);
  });

  it("groups policy candidates and remains proposal-only", () => {
    const log = new OperationalMemoryLog();
    log.append({ occurredAt: "2026-05-09T00:00:00.000Z", category: "fallback", source: "test", provenance: {}, payload: { fallback: { reason: "policy_blocked" } } });
    log.append({ occurredAt: "2026-05-09T00:00:01.000Z", category: "fallback", source: "test", provenance: {}, payload: { fallback: { reason: "policy_blocked" } } });
    const candidates = generatePolicyCandidates(log.list(), 2);
    const proposals = buildPromotionProposals(candidates);
    expect(candidates.length).toBe(1);
    expect(proposals[0]?.status).toBe("review_required");
  });

  it("has stable observability summaries and empty behavior", () => {
    const log = new OperationalMemoryLog();
    expect(summarizePolicyOutcomes(log.list())).toEqual({ allow: 0, deny: 0, approval_required: 0, unavailable: 0 });
    log.append({ occurredAt: "2026-05-09T00:00:00.000Z", category: "degraded_state", source: "test", provenance: {}, payload: { degraded: { reasonCode: "heartbeat_stale" } } });
    log.append({ occurredAt: "2026-05-09T00:00:01.000Z", category: "fallback", source: "test", provenance: {}, payload: { fallback: { reason: "provider_timeout" } } });
    expect(summarizeDegradedTimeline(log.list())[0]).toContain("heartbeat_stale");
    expect(summarizeFallbackFrequency(log.list())).toEqual({ provider_timeout: 1 });
  });
});
