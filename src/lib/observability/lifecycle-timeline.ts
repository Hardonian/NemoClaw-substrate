// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TimelinePhase {
  name: string;
  startMs: number;
  endMs?: number;
  status: "running" | "completed" | "failed" | "skipped";
}

export interface LifecycleTimeline {
  sessionId: string;
  phases: TimelinePhase[];
  totalDurationMs: number;
}

// ---------------------------------------------------------------------------
// Lifecycle Timeline Builder
// ---------------------------------------------------------------------------

/**
 * Create a fresh, empty timeline for a given session.
 */
export function createTimeline(sessionId: string): LifecycleTimeline {
  return {
    sessionId,
    phases: [],
    totalDurationMs: 0,
  };
}

/**
 * Start a new phase on the timeline. Returns a new timeline object.
 */
export function startPhase(timeline: LifecycleTimeline, phaseName: string): LifecycleTimeline {
  const now = performance.now();
  return {
    ...timeline,
    phases: [
      ...timeline.phases,
      {
        name: phaseName,
        startMs: now,
        endMs: undefined,
        status: "running",
      },
    ],
    totalDurationMs: computeTotalDuration(timeline.phases),
  };
}

/**
 * End the most recently started running phase.
 * Returns a new timeline object.
 */
export function endPhase(
  timeline: LifecycleTimeline,
  status: "completed" | "failed" | "skipped" = "completed",
): LifecycleTimeline {
  const now = performance.now();
  const phases = [...timeline.phases];
  const runningIndex = findLastRunningIndex(phases);

  if (runningIndex === -1) {
    return timeline;
  }

  phases[runningIndex] = {
    ...phases[runningIndex],
    endMs: now,
    status,
  };

  return {
    ...timeline,
    phases,
    totalDurationMs: computeTotalDuration(phases),
  };
}

/**
 * Mark the most recent running phase as failed.
 */
export function failPhase(timeline: LifecycleTimeline): LifecycleTimeline {
  return endPhase(timeline, "failed");
}

/**
 * Compute the total duration in ms of all completed phases.
 */
export function computeTotalDuration(phases: TimelinePhase[]): number {
  let total = 0;
  for (const phase of phases) {
    if (phase.endMs !== undefined) {
      total += phase.endMs - phase.startMs;
    }
  }
  return Math.round(total);
}

/**
 * Get the duration of a single phase. Returns undefined if the phase is
 * still running or does not exist.
 */
export function getPhaseDurationMs(timeline: LifecycleTimeline, phaseName: string): number | undefined {
  const phase = timeline.phases.find((p) => p.name === phaseName);
  if (!phase || phase.endMs === undefined) return undefined;
  return Math.round(phase.endMs - phase.startMs);
}

/**
 * Get a summary string for a timeline.
 */
export function timelineSummary(timeline: LifecycleTimeline): string {
  const phaseSummary = timeline.phases
    .map((p) => {
      const dur = p.endMs !== undefined ? `${Math.round(p.endMs - p.startMs)}ms` : "running";
      return `${p.name} (${dur}, ${p.status})`;
    })
    .join(", ");
  return `Session ${timeline.sessionId}: [${phaseSummary}] total=${timeline.totalDurationMs}ms`;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function findLastRunningIndex(phases: TimelinePhase[]): number {
  for (let i = phases.length - 1; i >= 0; i--) {
    if (phases[i].status === "running") return i;
  }
  return -1;
}
