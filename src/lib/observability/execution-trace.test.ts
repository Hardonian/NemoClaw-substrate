// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import {
  buildExecutionTrace,
  addSpan,
  getTotalDurationMs,
  summarizeTrace,
  traceToJson,
  detectBottlenecks,
  detectAnomalies,
} from "./execution-trace";

describe("buildExecutionTrace", () => {
  it("builds a trace from spans", () => {
    const trace = buildExecutionTrace("t-1", [
      { name: "init", durationMs: 10, annotations: [] },
      { name: "fetch", durationMs: 200, annotations: ["cache-miss"] },
    ]);
    expect(trace.traceId).toBe("t-1");
    expect(trace.spans).toHaveLength(2);
    expect(trace.bottlenecks).toBeDefined();
    expect(trace.anomalies).toBeDefined();
  });

  it("detects bottlenecks automatically", () => {
    const trace = buildExecutionTrace("t-2", [
      { name: "fast", durationMs: 10, annotations: [] },
      { name: "slow", durationMs: 500, annotations: [] },
    ]);
    expect(trace.bottlenecks.some((b) => b.includes("slow"))).toBe(true);
  });

  it("detects anomalies automatically", () => {
    const trace = buildExecutionTrace("t-3", [
      { name: "normal", durationMs: 100, annotations: [] },
      { name: "timeout", durationMs: 6000, annotations: [] },
    ]);
    expect(trace.anomalies.some((a) => a.includes("timeout"))).toBe(true);
  });
});

describe("addSpan", () => {
  it("returns a new trace with the added span", () => {
    const trace = buildExecutionTrace("t-4", [
      { name: "first", durationMs: 10, annotations: [] },
    ]);
    const updated = addSpan(trace, { name: "second", durationMs: 20, annotations: [] });
    expect(updated.spans).toHaveLength(2);
    expect(updated.spans[1].name).toBe("second");
  });

  it("does not mutate the original trace", () => {
    const trace = buildExecutionTrace("t-5", []);
    addSpan(trace, { name: "added", durationMs: 5, annotations: [] });
    expect(trace.spans).toHaveLength(0);
  });

  it("recomputes bottlenecks and anomalies", () => {
    const trace = buildExecutionTrace("t-6", [
      { name: "a", durationMs: 10, annotations: [] },
    ]);
    const updated = addSpan(trace, { name: "b", durationMs: 6000, annotations: [] });
    expect(updated.anomalies.some((a) => a.includes("b"))).toBe(true);
  });
});

describe("getTotalDurationMs", () => {
  it("sums all span durations", () => {
    const trace = buildExecutionTrace("t-7", [
      { name: "a", durationMs: 100, annotations: [] },
      { name: "b", durationMs: 200, annotations: [] },
      { name: "c", durationMs: 50, annotations: [] },
    ]);
    expect(getTotalDurationMs(trace)).toBe(350);
  });

  it("returns 0 for empty trace", () => {
    const trace = buildExecutionTrace("t-8", []);
    expect(getTotalDurationMs(trace)).toBe(0);
  });
});

describe("summarizeTrace", () => {
  it("produces a human-readable summary", () => {
    const trace = buildExecutionTrace("t-9", [
      { name: "boot", durationMs: 50, annotations: ["cold-start"] },
      { name: "request", durationMs: 200, annotations: [] },
    ]);
    const summary = summarizeTrace(trace);
    expect(summary).toContain("t-9");
    expect(summary).toContain("250ms total");
    expect(summary).toContain("2 spans");
    expect(summary).toContain("boot: 50ms");
    expect(summary).toContain("request: 200ms");
    expect(summary).toContain("cold-start");
  });

  it("includes bottleneck section when present", () => {
    const trace = buildExecutionTrace("t-10", [
      { name: "tiny", durationMs: 1, annotations: [] },
      { name: "huge", durationMs: 9000, annotations: [] },
    ]);
    const summary = summarizeTrace(trace);
    expect(summary).toContain("Bottlenecks:");
    expect(summary).toContain("huge");
  });

  it("includes anomaly section when present", () => {
    const trace = buildExecutionTrace("t-11", [
      { name: "slow-op", durationMs: 7000, annotations: [] },
    ]);
    const summary = summarizeTrace(trace);
    expect(summary).toContain("Anomalies:");
    expect(summary).toContain("slow-op");
  });

  it("omits sections when empty", () => {
    const trace = buildExecutionTrace("t-12", [
      { name: "a", durationMs: 10, annotations: [] },
      { name: "b", durationMs: 10, annotations: [] },
      { name: "c", durationMs: 10, annotations: [] },
    ]);
    const summary = summarizeTrace(trace);
    expect(summary).not.toContain("Bottlenecks:");
    expect(summary).not.toContain("Anomalies:");
  });
});

describe("traceToJson", () => {
  it("produces valid JSON", () => {
    const trace = buildExecutionTrace("t-13", [
      { name: "x", durationMs: 5, annotations: ["tag"] },
    ]);
    const json = traceToJson(trace);
    const parsed = JSON.parse(json);
    expect(parsed.traceId).toBe("t-13");
    expect(parsed.spans).toHaveLength(1);
    expect(parsed.bottlenecks).toBeDefined();
    expect(parsed.anomalies).toBeDefined();
  });
});

describe("detectBottlenecks", () => {
  it("identifies spans consuming >50% of total time", () => {
    const spans = [
      { name: "a", durationMs: 10, annotations: [] },
      { name: "b", durationMs: 10, annotations: [] },
      { name: "c", durationMs: 80, annotations: [] },
    ];
    const bottlenecks = detectBottlenecks(spans);
    expect(bottlenecks).toHaveLength(1);
    expect(bottlenecks[0]).toContain("c");
    expect(bottlenecks[0]).toContain("80%");
  });

  it("returns empty when no span exceeds threshold", () => {
    const spans = [
      { name: "a", durationMs: 30, annotations: [] },
      { name: "b", durationMs: 30, annotations: [] },
      { name: "c", durationMs: 40, annotations: [] },
    ];
    expect(detectBottlenecks(spans)).toHaveLength(0);
  });

  it("returns empty for zero total duration", () => {
    expect(detectBottlenecks([])).toEqual([]);
  });
});

describe("detectAnomalies", () => {
  it("identifies spans exceeding 5000ms", () => {
    const spans = [
      { name: "ok", durationMs: 100, annotations: [] },
      { name: "bad", durationMs: 5001, annotations: [] },
    ];
    const anomalies = detectAnomalies(spans);
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0]).toContain("bad");
    expect(anomalies[0]).toContain("5001ms");
  });

  it("detects multiple anomalies", () => {
    const spans = [
      { name: "x", durationMs: 6000, annotations: [] },
      { name: "y", durationMs: 7000, annotations: [] },
    ];
    expect(detectAnomalies(spans)).toHaveLength(2);
  });

  it("returns empty when all spans are within threshold", () => {
    const spans = [
      { name: "a", durationMs: 4999, annotations: [] },
    ];
    expect(detectAnomalies(spans)).toEqual([]);
  });
});
