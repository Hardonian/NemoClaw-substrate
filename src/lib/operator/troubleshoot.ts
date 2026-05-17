// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export interface MetricEntry {
  name: string;
  value: number;
  unit?: string;
  timestamp: string;
}

export interface EventEntry {
  type: string;
  message: string;
  severity: "info" | "warning" | "error";
  timestamp: string;
}

export interface TroubleshootResult {
  logs: string[];
  metrics: MetricEntry[];
  events: EventEntry[];
  recommendations: string[];
}

export function aggregateTroubleshoot(
  logs: string[],
  metrics: MetricEntry[],
  events: EventEntry[],
): TroubleshootResult {
  const recommendations = deriveRecommendations(events, metrics);
  return { logs, metrics, events, recommendations };
}

function deriveRecommendations(
  events: EventEntry[],
  metrics: MetricEntry[],
): string[] {
  const recs: string[] = [];

  const errors = events.filter((e) => e.severity === "error");
  if (errors.length > 0) {
    recs.push(`Investigate ${errors.length} error event(s)`);
  }

  const warnings = events.filter((e) => e.severity === "warning");
  if (warnings.length > 3) {
    recs.push("High warning rate detected; review recent changes");
  }

  const highCpu = metrics.filter(
    (m) => m.name === "cpu_usage" && m.value > 90,
  );
  if (highCpu.length > 0) {
    recs.push("CPU usage exceeds 90%; consider scaling or optimizing workloads");
  }

  const highMem = metrics.filter(
    (m) => m.name === "memory_usage" && m.value > 85,
  );
  if (highMem.length > 0) {
    recs.push("Memory usage exceeds 85%; check for leaks or increase limits");
  }

  const nodeDown = events.filter(
    (e) => e.type === "node_unreachable" || e.type === "node_down",
  );
  if (nodeDown.length > 0) {
    recs.push(`${nodeDown.length} node(s) unreachable; verify network and node health`);
  }

  if (recs.length === 0 && events.length === 0) {
    recs.push("No issues detected; system operating normally");
  }

  return recs;
}

export function filterEventsBySeverity(
  events: EventEntry[],
  minSeverity: "info" | "warning" | "error",
): EventEntry[] {
  const order: Record<string, number> = { info: 0, warning: 1, error: 2 };
  const threshold = order[minSeverity] ?? 0;
  return events.filter((e) => (order[e.severity] ?? 0) >= threshold);
}

export function metricsByName(
  metrics: MetricEntry[],
): Record<string, MetricEntry[]> {
  const result: Record<string, MetricEntry[]> = {};
  for (const m of metrics) {
    (result[m.name] ??= []).push(m);
  }
  return result;
}
