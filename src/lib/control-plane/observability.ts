// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { NodeDescriptor } from "./types";
import type { OperationalEvent } from "./operational-memory";

export function summarizePolicyOutcomes(events: OperationalEvent[]): Record<string, number> {
  const summary: Record<string, number> = { allow: 0, deny: 0, approval_required: 0, unavailable: 0 };
  for (const event of events.filter((e) => e.category === "policy_outcome")) {
    const decision = event.payload["policyDecision"] as { allowed?: boolean; requiredApproval?: boolean } | undefined;
    if (!decision) { summary.unavailable += 1; continue; }
    if (decision.allowed && decision.requiredApproval) summary.approval_required += 1;
    else if (decision.allowed) summary.allow += 1;
    else summary.deny += 1;
  }
  return summary;
}

export function summarizeDegradedTimeline(events: OperationalEvent[]): string[] {
  return events
    .filter((e) => e.category === "degraded_state")
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
    .map((e) => `${e.occurredAt} observed ${(e.payload["degraded"] as { reasonCode?: string } | undefined)?.reasonCode ?? "unknown"}`);
}

export function summarizeFallbackFrequency(events: OperationalEvent[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const event of events.filter((e) => e.category === "fallback")) {
    const reason = (event.payload["fallback"] as { reason?: string } | undefined)?.reason ?? "unknown";
    out[reason] = (out[reason] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

export function summarizeStaleNodes(nodes: NodeDescriptor[], now: string, staleAfterMs = 60_000): string[] {
  const nowMs = Date.parse(now);
  return nodes
    .filter((n) => nowMs - Date.parse(n.lastHeartbeatAt) > staleAfterMs || n.health === "stale")
    .sort((a, b) => a.nodeId.localeCompare(b.nodeId))
    .map((n) => `${n.nodeId}: observed ${n.health}`);
}

const TELEMETRY_KINDS = new Set([
  "telemetry_probe_started", "telemetry_probe_succeeded", "telemetry_probe_failed", "telemetry_parse_succeeded", "telemetry_parse_partial", "telemetry_parse_failed", "telemetry_unavailable", "telemetry_stale", "telemetry_conflict_detected", "telemetry_registry_update_applied", "telemetry_registry_update_skipped",
]);

export function summarizeTelemetryEventCounts(events: OperationalEvent[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const event of events) if (TELEMETRY_KINDS.has(event.category)) out[event.category] = (out[event.category] ?? 0) + 1;
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

export function summarizeTelemetryDimensions(events: OperationalEvent[]): { confidence: Record<string, number>; source: Record<string, number> } {
  const confidence: Record<string, number> = {};
  const source: Record<string, number> = {};
  for (const event of events.filter((e) => TELEMETRY_KINDS.has(e.category))) {
    source[event.source] = (source[event.source] ?? 0) + 1;
    const value = String((event.payload["confidence"] ?? "unknown"));
    confidence[value] = (confidence[value] ?? 0) + 1;
  }
  return { confidence, source };
}
