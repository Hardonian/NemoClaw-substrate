// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import {
  createReplay,
  replayStep,
  replayStepBack,
  replayJumpTo,
  replayRemaining,
  replayFormatStep,
} from "./replay-walkthrough";

function makeEvents(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `evt-${i}`,
    type: i === 0 ? "start" : "action",
    timestamp: `2026-01-15T12:00:0${i}Z`,
    detail: `Event ${i}`,
  }));
}

describe("createReplay", () => {
  it("initializes at index 0", () => {
    const state = createReplay(makeEvents(3));
    expect(state.currentIndex).toBe(0);
    expect(state.done).toBe(false);
    expect(state.events).toHaveLength(3);
  });

  it("marks done for empty events", () => {
    const state = createReplay([]);
    expect(state.done).toBe(true);
  });
});

describe("replayStep", () => {
  it("steps through events sequentially", () => {
    const state = createReplay(makeEvents(3));

    const step1 = replayStep(state);
    expect(step1).toBeDefined();
    expect(step1?.index).toBe(1);
    expect(step1?.total).toBe(3);
    expect(step1?.event.id).toBe("evt-0");

    const step2 = replayStep(state);
    expect(step2?.index).toBe(2);
    expect(step2?.event.id).toBe("evt-1");
  });

  it("returns undefined when done", () => {
    const state = createReplay(makeEvents(1));
    replayStep(state);
    expect(replayStep(state)).toBeUndefined();
  });

  it("attaches optional commentary", () => {
    const state = createReplay(makeEvents(1));
    const step = replayStep(state, "Agent started session");
    expect(step?.commentary).toBe("Agent started session");
  });

  it("marks done after last step", () => {
    const state = createReplay(makeEvents(2));
    replayStep(state);
    replayStep(state);
    expect(state.done).toBe(true);
  });
});

describe("replayStepBack", () => {
  it("goes back one step", () => {
    const state = createReplay(makeEvents(3));
    replayStep(state);
    replayStep(state);
    expect(state.currentIndex).toBe(2);

    const back = replayStepBack(state);
    expect(back?.index).toBe(2);
    expect(state.currentIndex).toBe(1);
  });

  it("returns undefined at start", () => {
    const state = createReplay(makeEvents(3));
    expect(replayStepBack(state)).toBeUndefined();
  });

  it("undoes done flag", () => {
    const state = createReplay(makeEvents(1));
    replayStep(state);
    expect(state.done).toBe(true);
    replayStepBack(state);
    expect(state.done).toBe(false);
  });
});

describe("replayJumpTo", () => {
  it("jumps to a specific index", () => {
    const state = createReplay(makeEvents(5));
    const step = replayJumpTo(state, 3);
    expect(step?.index).toBe(3);
    expect(step?.event.id).toBe("evt-2");
    expect(state.currentIndex).toBe(2);
  });

  it("returns undefined for out-of-range index", () => {
    const state = createReplay(makeEvents(3));
    expect(replayJumpTo(state, 0)).toBeUndefined();
    expect(replayJumpTo(state, 4)).toBeUndefined();
  });
});

describe("replayRemaining", () => {
  it("returns total at start", () => {
    const state = createReplay(makeEvents(5));
    expect(replayRemaining(state)).toBe(5);
  });

  it("decreases as steps are taken", () => {
    const state = createReplay(makeEvents(5));
    replayStep(state);
    replayStep(state);
    expect(replayRemaining(state)).toBe(3);
  });

  it("returns 0 when done", () => {
    const state = createReplay(makeEvents(2));
    replayStep(state);
    replayStep(state);
    expect(replayRemaining(state)).toBe(0);
  });
});

describe("replayFormatStep", () => {
  it("formats step with commentary", () => {
    const formatted = replayFormatStep({
      index: 1,
      total: 3,
      event: { id: "1", type: "start", timestamp: "2026-01-15T12:00:00Z", detail: "Started" },
      commentary: "Session beginning",
    });
    expect(formatted).toContain("[1/3]");
    expect(formatted).toContain("start");
    expect(formatted).toContain("Started");
    expect(formatted).toContain("Session beginning");
  });

  it("formats step without commentary", () => {
    const formatted = replayFormatStep({
      index: 1,
      total: 1,
      event: { id: "1", type: "end", timestamp: "2026-01-15T12:00:00Z", detail: "Done" },
    });
    expect(formatted).not.toContain(">");
  });
});
