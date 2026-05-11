// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { LifecycleTimeline, TimelinePhase } from "./lifecycle-timeline";

// ---------------------------------------------------------------------------
// Trace Renderer — terminal-friendly ASCII timeline rendering
// ---------------------------------------------------------------------------

const BAR_WIDTH = 40;

/**
 * Render a lifecycle timeline as ASCII art suitable for terminal output.
 */
export function renderTimeline(timeline: LifecycleTimeline, maxWidth: number = 80): string {
  const lines: string[] = [];
  const maxNameLen = Math.max(...timeline.phases.map((p) => p.name.length), 10);

  lines.push(`Timeline: ${timeline.sessionId}`);
  lines.push("─".repeat(Math.min(maxWidth, 72)));

  const totalMs = timeline.totalDurationMs || 1;

  for (const phase of timeline.phases) {
    const duration = phase.endMs !== undefined ? phase.endMs - phase.startMs : 0;
    const pct = totalMs > 0 ? duration / totalMs : 0;
    const barLen = Math.max(1, Math.round(pct * BAR_WIDTH));
    const statusSymbol = statusIcon(phase.status);
    const paddedName = phase.name.padEnd(maxNameLen);
    const bar = buildBar(barLen, phase.status);
    const durStr =
      phase.endMs !== undefined ? `${Math.round(duration)}ms` : "running...";

    lines.push(`  ${statusSymbol} ${paddedName} ${bar} ${durStr}`);
  }

  lines.push("─".repeat(Math.min(maxWidth, 72)));
  lines.push(`  Total: ${timeline.totalDurationMs}ms`);
  return lines.join("\n");
}

/**
 * Render a compact single-line summary for a phase.
 */
export function renderPhaseCompact(phase: TimelinePhase): string {
  const dur = phase.endMs !== undefined ? `${Math.round(phase.endMs - phase.startMs)}ms` : "—";
  return `${statusIcon(phase.status)} ${phase.name}: ${dur}`;
}

/**
 * Render a list of phases as a simple text table.
 */
export function renderPhaseTable(phases: TimelinePhase[]): string {
  const header = "Phase".padEnd(20) + "Status".padEnd(12) + "Duration";
  const separator = "─".repeat(header.length);
  const lines = [header, separator];

  for (const phase of phases) {
    const dur = phase.endMs !== undefined ? `${Math.round(phase.endMs - phase.startMs)}ms` : "—";
    lines.push(phase.name.padEnd(20) + phase.status.padEnd(12) + dur);
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function statusIcon(status: TimelinePhase["status"]): string {
  switch (status) {
    case "completed":
      return "✓";
    case "failed":
      return "✗";
    case "running":
      return "…";
    case "skipped":
      return "–";
  }
}

function buildBar(len: number, status: TimelinePhase["status"]): string {
  const filled = "█".repeat(len);
  const empty = "░".repeat(BAR_WIDTH - len);
  return `[${filled}${empty}]`;
}
