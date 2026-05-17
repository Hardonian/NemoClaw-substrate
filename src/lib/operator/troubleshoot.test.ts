// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import {
  aggregateTroubleshoot,
  filterEventsBySeverity,
  metricsByName,
} from "./troubleshoot";
import type { EventEntry, MetricEntry } from "./troubleshoot";

function makeEvent(
  type: string,
  message: string,
  severity: EventEntry["severity"],
): EventEntry {
  return { type, message, severity, timestamp: "2026-01-15T12:00:00Z" };
}

function makeMetric(
  name: string,
  value: number,
  unit?: string,
): MetricEntry {
  return { name, value, unit, timestamp: "2026-01-15T12:00:00Z" };
}

describe("aggregateTroubleshoot", () => {
  it("aggregates logs, metrics, and events", () => {
    const logs = ["info log 1", "error log 2"];
    const metrics = [makeMetric("cpu_usage", 45)];
    const events = [makeEvent("start", "session started", "info")];

    const result = aggregateTroubleshoot(logs, metrics, events);

    expect(result.logs).toEqual(logs);
    expect(result.metrics).toEqual(metrics);
    expect(result.events).toEqual(events);
    expect(result.recommendations).toBeDefined();
  });

  it("recommends investigating errors", () => {
    const result = aggregateTroubleshoot([], [], [
      makeEvent("crash", "segfault", "error"),
    ]);
    expect(result.recommendations).toContain(
      "Investigate 1 error event(s)",
    );
  });

  it("recommends review on high warning rate", () => {
    const warnings = Array.from({ length: 4 }, (_, i) =>
      makeEvent(`warn-${i}`, `warning ${i}`, "warning"),
    );
    const result = aggregateTroubleshoot([], [], warnings);
    expect(result.recommendations).toContain(
      "High warning rate detected; review recent changes",
    );
  });

  it("recommends on high CPU", () => {
    const result = aggregateTroubleshoot([], [makeMetric("cpu_usage", 95)], []);
    expect(result.recommendations).toContain(
      "CPU usage exceeds 90%; consider scaling or optimizing workloads",
    );
  });

  it("recommends on high memory", () => {
    const result = aggregateTroubleshoot([], [makeMetric("memory_usage", 92)], []);
    expect(result.recommendations).toContain(
      "Memory usage exceeds 85%; check for leaks or increase limits",
    );
  });

  it("recommends on unreachable nodes", () => {
    const result = aggregateTroubleshoot([], [], [
      makeEvent("node_unreachable", "timeout", "error"),
    ]);
    expect(result.recommendations).toContain(
      "1 node(s) unreachable; verify network and node health",
    );
  });

  it("shows no issues when clean", () => {
    const result = aggregateTroubleshoot([], [], []);
    expect(result.recommendations).toContain(
      "No issues detected; system operating normally",
    );
  });
});

describe("filterEventsBySeverity", () => {
  const events: EventEntry[] = [
    makeEvent("a", "info", "info"),
    makeEvent("b", "warn", "warning"),
    makeEvent("c", "err", "error"),
  ];

  it("info returns all", () => {
    expect(filterEventsBySeverity(events, "info")).toHaveLength(3);
  });

  it("warning excludes info", () => {
    expect(filterEventsBySeverity(events, "warning")).toHaveLength(2);
  });

  it("error only returns errors", () => {
    expect(filterEventsBySeverity(events, "error")).toHaveLength(1);
  });
});

describe("metricsByName", () => {
  it("groups metrics by name", () => {
    const metrics = [
      makeMetric("cpu", 10),
      makeMetric("cpu", 20),
      makeMetric("mem", 50),
    ];
    const grouped = metricsByName(metrics);
    expect(grouped["cpu"]).toHaveLength(2);
    expect(grouped["mem"]).toHaveLength(1);
  });
});
