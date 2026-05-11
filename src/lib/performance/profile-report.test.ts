// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import {
  createNoopCollector,
  createSimulatedCollector,
  profileOperation,
  profileOperations,
  summarizeProfile,
  DEFAULT_PROFILE_CONFIG,
} from "./profile-report";

describe("createNoopCollector", () => {
  it("returns a collector with no-op methods", () => {
    const collector = createNoopCollector();
    expect(() => collector.start()).not.toThrow();
    expect(() => collector.stop()).not.toThrow();
  });
});

describe("createSimulatedCollector", () => {
  it("returns a collector with callable methods", () => {
    const collector = createSimulatedCollector(0.01);
    expect(() => collector.start()).not.toThrow();
    expect(() => collector.stop()).not.toThrow();
  });

  it("accepts custom overhead value", () => {
    const collector = createSimulatedCollector(0.05);
    expect(() => collector.start()).not.toThrow();
    expect(() => collector.stop()).not.toThrow();
  });
});

describe("profileOperation", () => {
  it("returns valid profile result", () => {
    const result = profileOperation(
      "noop-operation",
      () => {
        // Intentionally empty.
      },
      createNoopCollector(),
      { iterations: 10, maxOverheadPercent: 5 },
    );

    expect(result.operationName).toBe("noop-operation");
    expect(result.baselineMeanMs).toBeGreaterThanOrEqual(0);
    expect(result.instrumentedMeanMs).toBeGreaterThanOrEqual(0);
    expect(result.overheadPercent).toBeGreaterThanOrEqual(0);
  });

  it("meets budget for noop collector", () => {
    const result = profileOperation(
      "noop",
      () => {},
      createNoopCollector(),
      { iterations: 10, maxOverheadPercent: 5 },
    );

    expect(result.withinBudget).toBe(true);
  });

  it("detects overhead from simulated collector", () => {
    const result = profileOperation(
      "light-work",
      () => {
        const _x = Math.sqrt(2);
      },
      createSimulatedCollector(0.01),
      { iterations: 20, maxOverheadPercent: 1 },
    );

    expect(result.overheadPercent).toBeGreaterThanOrEqual(0);
    expect(result.baselineMeanMs).toBeLessThanOrEqual(result.instrumentedMeanMs);
  });

  it("exceeds budget when overhead is too high", () => {
    const result = profileOperation(
      "fast-op",
      () => {
        const _x = Math.sqrt(2);
      },
      createSimulatedCollector(0.5),
      { iterations: 20, maxOverheadPercent: 0.001 },
    );

    expect(result.withinBudget).toBe(false);
  });
});

describe("profileOperations", () => {
  it("profiles multiple operations", () => {
    const results = profileOperations(
      [
        {
          name: "op1",
          operation: () => {},
          collector: createNoopCollector(),
        },
        {
          name: "op2",
          operation: () => {
            const _x = Math.sqrt(2);
          },
          collector: createNoopCollector(),
        },
      ],
      { iterations: 5, maxOverheadPercent: 10 },
    );

    expect(results).toHaveLength(2);
    expect(results[0].operationName).toBe("op1");
    expect(results[1].operationName).toBe("op2");
  });
});

describe("summarizeProfile", () => {
  it("produces formatted output", () => {
    const results = [
      {
        operationName: "test-op",
        baselineMeanMs: 1.0,
        instrumentedMeanMs: 1.05,
        overheadPercent: 5,
        withinBudget: true,
        maxOverheadPercent: 10,
      },
    ];

    const summary = summarizeProfile(results);
    expect(summary).toContain("Diagnostic Overhead Profile");
    expect(summary).toContain("test-op");
    expect(summary).toContain("OK");
  });

  it("shows FAIL when budget exceeded", () => {
    const results = [
      {
        operationName: "slow-op",
        baselineMeanMs: 1.0,
        instrumentedMeanMs: 5.0,
        overheadPercent: 400,
        withinBudget: false,
        maxOverheadPercent: 5,
      },
    ];

    const summary = summarizeProfile(results);
    expect(summary).toContain("EXCEEDS BUDGET");
    expect(summary).toContain("FAIL");
  });
});

describe("DEFAULT_PROFILE_CONFIG", () => {
  it("has expected default values", () => {
    expect(DEFAULT_PROFILE_CONFIG.iterations).toBe(100);
    expect(DEFAULT_PROFILE_CONFIG.maxOverheadPercent).toBe(5);
  });
});
