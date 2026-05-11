// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi } from "vitest";
import { renderTimeline, renderPhaseCompact, renderPhaseTable } from "./trace-renderer";
import type { LifecycleTimeline, TimelinePhase } from "./lifecycle-timeline";

function makeTimeline(phases: TimelinePhase[]): LifecycleTimeline {
  return {
    sessionId: "test-session",
    phases,
    totalDurationMs: phases.reduce((sum, p) => {
      return sum + (p.endMs !== undefined ? p.endMs - p.startMs : 0);
    }, 0),
  };
}

describe("renderTimeline", () => {
  it("renders a timeline with header and phases", () => {
    const timeline = makeTimeline([
      { name: "init", startMs: 0, endMs: 100, status: "completed" },
      { name: "fetch", startMs: 100, endMs: 300, status: "completed" },
    ]);
    const output = renderTimeline(timeline);
    expect(output).toContain("Timeline: test-session");
    expect(output).toContain("init");
    expect(output).toContain("fetch");
    expect(output).toContain("Total: 300ms");
  });

  it("shows running status for in-progress phases", () => {
    const timeline = makeTimeline([
      { name: "running-phase", startMs: 0, endMs: undefined, status: "running" },
    ]);
    const output = renderTimeline(timeline);
    expect(output).toContain("running...");
  });

  it("uses consistent bar width", () => {
    const timeline = makeTimeline([
      { name: "short", startMs: 0, endMs: 10, status: "completed" },
      { name: "long", startMs: 10, endMs: 110, status: "completed" },
    ]);
    const output = renderTimeline(timeline);
    const bars = output.match(/\[[█░]+\]/g);
    expect(bars).not.toBeNull();
    for (const bar of bars ?? []) {
      expect(bar.length).toBe(42); // [ + 40 chars + ]
    }
  });

  it("includes maxWidth in output", () => {
    const timeline = makeTimeline([
      { name: "a", startMs: 0, endMs: 50, status: "completed" },
    ]);
    const output = renderTimeline(timeline, 50);
    // Separator lines respect maxWidth
    const separatorLines = output.split("\n").filter((l) => /^─+$/.test(l));
    for (const line of separatorLines) {
      expect(line.length).toBeLessThanOrEqual(50);
    }
  });
});

describe("renderPhaseCompact", () => {
  it("renders a single phase on one line", () => {
    const phase: TimelinePhase = { name: "boot", startMs: 0, endMs: 50, status: "completed" };
    const output = renderPhaseCompact(phase);
    expect(output).toBe("✓ boot: 50ms");
  });

  it("shows dash for running phase duration", () => {
    const phase: TimelinePhase = { name: "wait", startMs: 0, endMs: undefined, status: "running" };
    const output = renderPhaseCompact(phase);
    expect(output).toContain("wait");
    expect(output).toContain("—");
  });
});

describe("renderPhaseTable", () => {
  it("renders phases as a text table", () => {
    const phases: TimelinePhase[] = [
      { name: "init", startMs: 0, endMs: 100, status: "completed" },
      { name: "build", startMs: 100, endMs: 500, status: "completed" },
    ];
    const output = renderPhaseTable(phases);
    expect(output).toContain("Phase");
    expect(output).toContain("Status");
    expect(output).toContain("Duration");
    expect(output).toContain("init");
    expect(output).toContain("100ms");
    expect(output).toContain("400ms");
  });

  it("handles empty phase list", () => {
    const output = renderPhaseTable([]);
    expect(output).toContain("Phase");
  });
});
