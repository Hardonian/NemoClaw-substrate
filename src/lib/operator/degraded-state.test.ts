// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import { buildSystemStatus } from "./system-status";
import {
  addDegradedExplanations,
  buildDegradedSummary,
  formatDegradedDetail,
} from "./degraded-state";

describe("addDegradedExplanations", () => {
  it("adds explanations for non-healthy components", () => {
    const status = buildSystemStatus([
      { name: "node-1", status: "healthy" },
      { name: "node-2", status: "degraded", degradedReason: "slow I/O" },
      { name: "node-3", status: "critical" },
    ]);
    const result = addDegradedExplanations(status);

    expect(result.explanations).toHaveLength(2);
    expect(result.explanations[0].component).toBe("node-2");
    expect(result.explanations[0].explanation).toBe("slow I/O");
    expect(result.explanations[0].severity).toBe("warning");
    expect(result.explanations[1].component).toBe("node-3");
    expect(result.explanations[1].severity).toBe("error");
  });

  it("preserves overall and timestamp from original", () => {
    const fixed = new Date("2026-01-15T12:00:00Z");
    const status = buildSystemStatus(
      [{ name: "x", status: "degraded" }],
      fixed,
    );
    const result = addDegradedExplanations(status);
    expect(result.overall).toBe("degraded");
    expect(result.timestamp).toBe("2026-01-15T12:00:00.000Z");
  });

  it("returns empty explanations when all healthy", () => {
    const status = buildSystemStatus([
      { name: "a", status: "healthy" },
      { name: "b", status: "healthy" },
    ]);
    const result = addDegradedExplanations(status);
    expect(result.explanations).toEqual([]);
  });

  it("falls back to default explanation when no degradedReason", () => {
    const status = buildSystemStatus([
      { name: "node-x", status: "degraded" },
    ]);
    const result = addDegradedExplanations(status);
    expect(result.explanations[0].explanation).toContain(
      "operating in degraded mode",
    );
  });
});

describe("buildDegradedSummary", () => {
  it("returns healthy message when all healthy", () => {
    expect(
      buildDegradedSummary([{ name: "x", status: "healthy" }]),
    ).toBe("All components healthy");
  });

  it("shows unreachable count", () => {
    const result = buildDegradedSummary([
      { name: "n1", status: "healthy" },
      { name: "n2", status: "critical" },
      { name: "n3", status: "critical" },
    ]);
    expect(result).toContain("2/3");
    expect(result).toContain("unreachable");
  });

  it("shows degraded count", () => {
    const result = buildDegradedSummary([
      { name: "n1", status: "healthy" },
      { name: "n2", status: "degraded" },
    ]);
    expect(result).toContain("1/2");
    expect(result).toContain("degraded");
  });

  it("combines unreachable and degraded", () => {
    const result = buildDegradedSummary([
      { name: "n1", status: "healthy" },
      { name: "n2", status: "critical" },
      { name: "n3", status: "degraded" },
    ]);
    expect(result).toContain("1 node(s) unreachable");
    expect(result).toContain("1 component(s) degraded");
  });
});

describe("formatDegradedDetail", () => {
  it("formats overall status and summary", () => {
    const status = buildSystemStatus([
      { name: "n1", status: "healthy" },
      { name: "n2", status: "degraded", degradedReason: "slow" },
    ]);
    const result = addDegradedExplanations(status);
    const text = formatDegradedDetail(result);

    expect(text).toContain("Overall: degraded");
    expect(text).toContain("degraded:");
    expect(text).toContain("[warning]");
    expect(text).toContain("n2");
  });

  it("empty when all healthy", () => {
    const status = buildSystemStatus([{ name: "x", status: "healthy" }]);
    const result = addDegradedExplanations(status);
    const text = formatDegradedDetail(result);
    expect(text).toContain("Overall: healthy");
    expect(text).toContain("All components healthy");
  });
});
