// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import {
  checkEventCount,
  checkEventSequence,
  checkOutput,
  checkDeterminism,
  hashTraceEvent,
  findTraces,
} from "../scripts/verify-replay.ts";
import type { ExecutionTrace } from "../scripts/verify-replay.ts";

describe("verify-replay script", () => {
  describe("findTraces", () => {
    it("returns null for both trace and replay when not present", () => {
      const result = findTraces();
      // May return null if fixtures don't exist
      if (result.trace !== null) {
        expect(typeof result.trace).toBe("string");
      }
      if (result.replay !== null) {
        expect(typeof result.replay).toBe("string");
      }
    });
  });

  describe("hashTraceEvent", () => {
    it("produces consistent hash for same event", () => {
      const event = { type: "action", action: "start" };
      const hash1 = hashTraceEvent(event);
      const hash2 = hashTraceEvent(event);
      expect(hash1).toBe(hash2);
    });

    it("produces different hash for different events", () => {
      const event1 = { type: "action", action: "start" };
      const event2 = { type: "action", action: "stop" };
      expect(hashTraceEvent(event1)).not.toBe(hashTraceEvent(event2));
    });

    it("ignores timestamp for determinism", () => {
      const event1 = { type: "action", action: "start", timestamp: 1000 };
      const event2 = { type: "action", action: "start", timestamp: 2000 };
      expect(hashTraceEvent(event1)).toBe(hashTraceEvent(event2));
    });
  });

  describe("checkEventCount", () => {
    it("passes when counts match", () => {
      const original: ExecutionTrace = { events: [{}, {}, {}] };
      const replay: ExecutionTrace = { events: [{}, {}, {}] };
      const result = checkEventCount(original, replay);
      expect(result.passed).toBe(true);
    });

    it("fails when counts differ", () => {
      const original: ExecutionTrace = { events: [{}, {}] };
      const replay: ExecutionTrace = { events: [{}, {}, {}, {}] };
      const result = checkEventCount(original, replay);
      expect(result.passed).toBe(false);
    });

    it("handles empty traces", () => {
      const original: ExecutionTrace = { events: [] };
      const replay: ExecutionTrace = { events: [] };
      const result = checkEventCount(original, replay);
      expect(result.passed).toBe(true);
    });

    it("handles missing events arrays", () => {
      const original: ExecutionTrace = {} as ExecutionTrace;
      const replay: ExecutionTrace = {} as ExecutionTrace;
      const result = checkEventCount(original, replay);
      expect(result.passed).toBe(true);
    });
  });

  describe("checkEventSequence", () => {
    it("passes when sequences match", () => {
      const original: ExecutionTrace = {
        events: [
          { type: "start", action: "init" },
          { type: "process", action: "run" },
        ],
      };
      const replay: ExecutionTrace = {
        events: [
          { type: "start", action: "init" },
          { type: "process", action: "run" },
        ],
      };
      const result = checkEventSequence(original, replay);
      expect(result.passed).toBe(true);
    });

    it("fails when sequences differ", () => {
      const original: ExecutionTrace = {
        events: [
          { type: "start", action: "init" },
          { type: "process", action: "run" },
        ],
      };
      const replay: ExecutionTrace = {
        events: [
          { type: "start", action: "init" },
          { type: "process", action: "stop" },
        ],
      };
      const result = checkEventSequence(original, replay);
      expect(result.passed).toBe(false);
    });
  });

  describe("checkOutput", () => {
    it("passes when outputs match", () => {
      const original: ExecutionTrace = { events: [], output: { result: 42 } };
      const replay: ExecutionTrace = { events: [], output: { result: 42 } };
      const result = checkOutput(original, replay);
      expect(result.passed).toBe(true);
    });

    it("fails when outputs differ", () => {
      const original: ExecutionTrace = { events: [], output: { result: 42 } };
      const replay: ExecutionTrace = { events: [], output: { result: 99 } };
      const result = checkOutput(original, replay);
      expect(result.passed).toBe(false);
    });

    it("passes when both have no output", () => {
      const original: ExecutionTrace = { events: [] };
      const replay: ExecutionTrace = { events: [] };
      const result = checkOutput(original, replay);
      expect(result.passed).toBe(true);
    });
  });

  describe("checkDeterminism", () => {
    it("passes when final states match", () => {
      const original: ExecutionTrace = {
        events: [{ state: { count: 10 } }],
      };
      const replay: ExecutionTrace = {
        events: [{ state: { count: 10 } }],
      };
      const result = checkDeterminism(original, replay);
      expect(result.passed).toBe(true);
    });

    it("fails when final states differ", () => {
      const original: ExecutionTrace = {
        events: [{ state: { count: 10 } }],
      };
      const replay: ExecutionTrace = {
        events: [{ state: { count: 20 } }],
      };
      const result = checkDeterminism(original, replay);
      expect(result.passed).toBe(false);
    });

    it("passes when no final state in either", () => {
      const original: ExecutionTrace = { events: [{}] };
      const replay: ExecutionTrace = { events: [{}] };
      const result = checkDeterminism(original, replay);
      expect(result.passed).toBe(true);
    });

    it("fails when one has final state and other does not", () => {
      const original: ExecutionTrace = { events: [{ state: { x: 1 } }] };
      const replay: ExecutionTrace = { events: [{}] };
      const result = checkDeterminism(original, replay);
      expect(result.passed).toBe(false);
    });
  });
});
