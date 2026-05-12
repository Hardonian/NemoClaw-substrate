// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi } from "vitest";
import {
  TimelinePhase,
  createTimeline,
  startPhase,
  endPhase,
  failPhase,
  computeTotalDuration,
  getPhaseDurationMs,
  timelineSummary,
  type TimelinePhase,
} from "./lifecycle-timeline";

// Mock performance.now for deterministic timestamps
let mockNow = 1000;
vi.spyOn(performance, "now").mockImplementation(() => mockNow);

function advance(ms: number) {
  mockNow += ms;
}

describe("createTimeline", () => {
  it("creates an empty timeline with the given session ID", () => {
    const t = createTimeline("sess-42");
    expect(t.sessionId).toBe("sess-42");
    expect(t.phases).toEqual([]);
    expect(t.totalDurationMs).toBe(0);
  });
});

describe("startPhase", () => {
  it("adds a running phase to the timeline", () => {
    const t = createTimeline("s1");
    const updated = startPhase(t, "init");
    expect(updated.phases).toHaveLength(1);
    expect(updated.phases[0]).toEqual({
      name: "init",
      startMs: mockNow,
      endMs: undefined,
      status: "running",
    });
  });

  it("accumulates phases", () => {
    const t = createTimeline("s1");
    const t1 = startPhase(t, "init");
    advance(50);
    const t2 = startPhase(t1, "fetch");
    expect(t2.phases).toHaveLength(2);
    expect(t2.phases[0].name).toBe("init");
    expect(t2.phases[1].name).toBe("fetch");
  });
});

describe("endPhase", () => {
  it("ends the most recent running phase", () => {
    advance(10);
    const t = createTimeline("s1");
    const started = startPhase(t, "work");
    advance(200);
    const ended = endPhase(started, "completed");
    expect(ended.phases[0].status).toBe("completed");
    expect(ended.phases[0].endMs).toBe(mockNow);
  });

  it("updates totalDurationMs", () => {
    const t = createTimeline("s1");
    advance(10);
    const started = startPhase(t, "work");
    advance(300);
    const ended = endPhase(started, "completed");
    expect(ended.totalDurationMs).toBe(300);
  });

  it("returns unchanged timeline if no running phase", () => {
    const t = createTimeline("s1");
    const updated = endPhase(t);
    expect(updated).toBe(t);
  });

  it("ends the last running phase when multiple are running", () => {
    const t = createTimeline("s1");
    advance(10);
    const t1 = startPhase(t, "first");
    advance(5);
    const t2 = startPhase(t1, "second");
    advance(100);
    const ended = endPhase(t2);
    expect(ended.phases[0].status).toBe("running");
    expect(ended.phases[1].status).toBe("completed");
    expect(ended.phases[1].endMs).toBe(mockNow);
  });
});

describe("failPhase", () => {
  it("marks the last running phase as failed", () => {
    const t = createTimeline("s1");
    advance(10);
    const started = startPhase(t, "risky");
    advance(50);
    const failed = failPhase(started);
    expect(failed.phases[0].status).toBe("failed");
  });
});

describe("computeTotalDuration", () => {
  it("sums only completed phases", () => {
    const phases: TimelinePhase[] = [
      { name: "a", startMs: 0, endMs: 100, status: "completed" },
      { name: "b", startMs: 100, endMs: 250, status: "completed" },
      { name: "c", startMs: 250, endMs: undefined, status: "running" },
    ];
    expect(computeTotalDuration(phases)).toBe(250);
  });

  it("returns 0 for empty array", () => {
    expect(computeTotalDuration([])).toBe(0);
  });
});

describe("getPhaseDurationMs", () => {
  it("returns duration for a completed phase", () => {
    const t = createTimeline("s1");
    advance(10);
    const started = startPhase(t, "work");
    advance(123);
    const ended = endPhase(started);
    expect(getPhaseDurationMs(ended, "work")).toBe(123);
  });

  it("returns undefined for a running phase", () => {
    const t = createTimeline("s1");
    const started = startPhase(t, "work");
    expect(getPhaseDurationMs(started, "work")).toBeUndefined();
  });

  it("returns undefined for a nonexistent phase", () => {
    const t = createTimeline("s1");
    expect(getPhaseDurationMs(t, "nonexistent")).toBeUndefined();
  });
});

describe("timelineSummary", () => {
  it("produces a readable summary", () => {
    const t = createTimeline("s1");
    advance(10);
    const t1 = startPhase(t, "init");
    advance(100);
    const t2 = endPhase(t1);
    advance(10);
    const t3 = startPhase(t2, "fetch");
    const summary = timelineSummary(t3);
    expect(summary).toContain("Session s1");
    expect(summary).toContain("init");
    expect(summary).toContain("fetch");
  });
});
