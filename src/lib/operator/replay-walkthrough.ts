// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export interface SessionEvent {
  id: string;
  type: string;
  timestamp: string;
  detail: string;
}

export interface ReplayStep {
  index: number;
  total: number;
  event: SessionEvent;
  commentary?: string;
}

export interface ReplayState {
  events: SessionEvent[];
  currentIndex: number;
  done: boolean;
}

export function createReplay(events: SessionEvent[]): ReplayState {
  return {
    events,
    currentIndex: 0,
    done: events.length === 0,
  };
}

export function replayStep(
  state: ReplayState,
  commentary?: string,
): ReplayStep | undefined {
  if (state.done || state.currentIndex >= state.events.length) {
    return undefined;
  }

  const event = state.events[state.currentIndex];
  const step: ReplayStep = {
    index: state.currentIndex + 1,
    total: state.events.length,
    event,
    commentary,
  };

  state.currentIndex += 1;
  state.done = state.currentIndex >= state.events.length;

  return step;
}

export function replayStepBack(state: ReplayState): ReplayStep | undefined {
  if (state.currentIndex <= 0) {
    return undefined;
  }

  state.currentIndex -= 1;
  state.done = false;

  const event = state.events[state.currentIndex];
  return {
    index: state.currentIndex + 1,
    total: state.events.length,
    event,
  };
}

export function replayJumpTo(
  state: ReplayState,
  index: number,
): ReplayStep | undefined {
  if (index < 1 || index > state.events.length) {
    return undefined;
  }

  state.currentIndex = index - 1;
  state.done = state.currentIndex >= state.events.length - 1;

  const event = state.events[state.currentIndex];
  return {
    index,
    total: state.events.length,
    event,
  };
}

export function replayRemaining(state: ReplayState): number {
  return Math.max(0, state.events.length - state.currentIndex);
}

export function replayFormatStep(step: ReplayStep): string {
  const lines: string[] = [];
  lines.push(`[${step.index}/${step.total}] ${step.event.type} @ ${step.event.timestamp}`);
  lines.push(`  ${step.event.detail}`);
  if (step.commentary) {
    lines.push(`  > ${step.commentary}`);
  }
  return lines.join("\n");
}
