// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import {
  buildSystemStatus,
  statusFromRecords,
  formatDegradedSummary,
} from "./system-status";

describe("buildSystemStatus", () => {
  it("returns healthy when all components are healthy", () => {
    const result = buildSystemStatus([
      { name: "sandbox", status: "healthy" },
      { name: "network", status: "healthy" },
    ]);
    expect(result.overall).toBe("healthy");
    expect(result.components).toHaveLength(2);
    expect(result.timestamp).toBeDefined();
  });

  it("returns degraded when any component is degraded", () => {
    const result = buildSystemStatus([
      { name: "sandbox", status: "healthy" },
      { name: "network", status: "degraded", degradedReason: "high latency" },
    ]);
    expect(result.overall).toBe("degraded");
  });

  it("returns critical when any component is critical", () => {
    const result = buildSystemStatus([
      { name: "sandbox", status: "healthy" },
      { name: "network", status: "critical" },
    ]);
    expect(result.overall).toBe("critical");
  });

  it("critical overrides degraded", () => {
    const result = buildSystemStatus([
      { name: "sandbox", status: "degraded" },
      { name: "network", status: "critical" },
    ]);
    expect(result.overall).toBe("critical");
  });

  it("uses provided timestamp", () => {
    const fixed = new Date("2026-01-15T12:00:00Z");
    const result = buildSystemStatus([], fixed);
    expect(result.timestamp).toBe("2026-01-15T12:00:00.000Z");
  });

  it("includes detail and degradedReason in components", () => {
    const result = buildSystemStatus([
      { name: "sandbox", status: "degraded", detail: "high load", degradedReason: "CPU > 95%" },
    ]);
    expect(result.components[0].detail).toBe("high load");
    expect(result.components[0].degradedReason).toBe("CPU > 95%");
  });
});

describe("statusFromRecords", () => {
  it("maps OperatorRecord to ComponentStatus", () => {
    const result = statusFromRecords([
      { id: "node-1", state: "running", detail: "ok" },
    ]);
    expect(result.components[0]).toEqual(
      expect.objectContaining({ name: "node-1", status: "healthy" }),
    );
  });

  it("marks unavailable records as critical", () => {
    const result = statusFromRecords([
      { id: "node-2", state: "down", detail: "timeout", unavailable: true },
    ]);
    expect(result.components[0].status).toBe("critical");
  });

  it("marks degraded records as degraded", () => {
    const result = statusFromRecords([
      { id: "node-3", state: "slow", detail: "latency", degraded: true },
    ]);
    expect(result.components[0].status).toBe("degraded");
  });
});

describe("formatDegradedSummary", () => {
  it("returns healthy message when all are healthy", () => {
    const result = buildSystemStatus([{ name: "x", status: "healthy" }]);
    expect(formatDegradedSummary(result)).toBe("All components healthy");
  });

  it("shows degraded count", () => {
    const result = buildSystemStatus([
      { name: "a", status: "healthy" },
      { name: "b", status: "degraded" },
      { name: "c", status: "critical" },
    ]);
    expect(formatDegradedSummary(result)).toBe(
      "degraded: 2/3 components non-healthy",
    );
  });
});
