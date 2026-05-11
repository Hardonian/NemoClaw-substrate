// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import {
  captureDiagnosticSnapshot,
  gatherSystemInfo,
  formatDiagnosticSnapshot,
  diagnosticSnapshotToJson,
} from "./diagnostic-snapshot";

describe("gatherSystemInfo", () => {
  it("returns structured system info", () => {
    const info = gatherSystemInfo();
    expect(info.platform).toBeDefined();
    expect(info.arch).toBeDefined();
    expect(info.nodeVersion).toMatch(/^v\d+\.\d+\.\d+/);
    expect(info.uptime).toBeGreaterThanOrEqual(0);
    expect(info.memoryUsage).toBeDefined();
    expect(typeof info.memoryUsage.heapUsed).toBe("number");
  });
});

describe("captureDiagnosticSnapshot", () => {
  it("captures a snapshot with all required fields", () => {
    const snapshot = captureDiagnosticSnapshot({
      config: { featureA: true, dbUrl: "postgres://localhost" },
      logs: ["info: started", "warn: slow query"],
      metrics: { requests: 42, errors: 3 },
    });

    expect(snapshot.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T/);
    expect(snapshot.config).toEqual({ featureA: true, dbUrl: "postgres://localhost" });
    expect(snapshot.logs).toEqual(["info: started", "warn: slow query"]);
    expect(snapshot.metrics).toEqual({ requests: 42, errors: 3 });
    expect(snapshot.systemInfo.platform).toBeDefined();
  });

  it("handles empty inputs", () => {
    const snapshot = captureDiagnosticSnapshot({
      config: {},
      logs: [],
      metrics: {},
    });
    expect(snapshot.config).toEqual({});
    expect(snapshot.logs).toEqual([]);
    expect(snapshot.metrics).toEqual({});
  });
});

describe("formatDiagnosticSnapshot", () => {
  it("produces a human-readable string", () => {
    const snapshot = captureDiagnosticSnapshot({
      config: { key: "val" },
      logs: ["log1", "log2"],
      metrics: { m1: 10 },
    });
    const formatted = formatDiagnosticSnapshot(snapshot);
    expect(formatted).toContain("Diagnostic Snapshot");
    expect(formatted).toContain(snapshot.timestamp);
    expect(formatted).toContain("Platform:");
    expect(formatted).toContain("key: val");
    expect(formatted).toContain("m1: 10");
    expect(formatted).toContain("log1");
  });

  it("truncates logs when more than 10", () => {
    const logs = Array.from({ length: 15 }, (_, i) => `log-${i}`);
    const snapshot = captureDiagnosticSnapshot({
      config: {},
      logs,
      metrics: {},
    });
    const formatted = formatDiagnosticSnapshot(snapshot);
    expect(formatted).toContain("log-9");
    expect(formatted).toContain("5 more");
    expect(formatted).not.toContain("log-14");
  });

  it("handles empty logs gracefully", () => {
    const snapshot = captureDiagnosticSnapshot({
      config: {},
      logs: [],
      metrics: {},
    });
    const formatted = formatDiagnosticSnapshot(snapshot);
    expect(formatted).not.toContain("Logs");
  });

  it("shows (none) when config is empty", () => {
    const snapshot = captureDiagnosticSnapshot({
      config: {},
      logs: [],
      metrics: {},
    });
    const formatted = formatDiagnosticSnapshot(snapshot);
    expect(formatted).toContain("(none)");
  });
});

describe("diagnosticSnapshotToJson", () => {
  it("produces valid JSON", () => {
    const snapshot = captureDiagnosticSnapshot({
      config: { a: 1 },
      logs: ["x"],
      metrics: { b: 2 },
    });
    const json = diagnosticSnapshotToJson(snapshot);
    const parsed = JSON.parse(json);
    expect(parsed.timestamp).toBe(snapshot.timestamp);
    expect(parsed.config).toEqual({ a: 1 });
    expect(parsed.logs).toEqual(["x"]);
    expect(parsed.metrics).toEqual({ b: 2 });
  });
});
