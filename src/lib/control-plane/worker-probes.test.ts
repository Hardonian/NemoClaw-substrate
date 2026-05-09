// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { DeviceRegistry } from "./device-registry";
import { OperationalMemoryLog } from "./operational-memory";
import { summarizeDryRunDiagnostics } from "./dry-run-diagnostics";
import { applyProbeToRegistry, emitProbeEvents, serializeProbeResult, type WorkerProbeResult } from "./worker-probes";
import type { NodeDescriptor } from "./types";

function baseNode(): NodeDescriptor { return { version: "1", nodeId: "node-1", role: "remote", transport: "http", endpoint: "http://worker", trustClass: "trusted", registeredAt: "2026-05-09T00:00:00.000Z", lastHeartbeatAt: "2026-05-09T00:00:00.000Z", health: "unknown", metadata: {}, capabilities: { version: "1", capturedAt: "2026-05-09T00:00:00.000Z", source: "test", runtimeBackend: "unknown", executionMode: "remote", gpus: [], models: [], policyTags: [], reliabilityTags: [], runtimeTags: [], transportRequirements: [] } }; }

function probe(status: WorkerProbeResult["status"] = "degraded"): WorkerProbeResult { return { request: { requestId: "r1", nodeId: "node-1", runtime: "vllm", transport: "http", endpoint: "http://worker", nowIso: "2026-05-09T01:00:00.000Z" }, status, capability: { runtimeBackend: "vllm", executionMode: "remote", models: ["m1"] }, telemetry: { capturedAt: "2026-05-09T01:00:00.000Z", runtimeHealth: { state: "observed", value: "degraded", observedAt: "2026-05-09T01:00:00.000Z" }, backendVersion: { state: "unavailable", reason: "endpoint missing" }, modelInventory: { state: "observed", value: ["m1"] }, gpus: { state: "unavailable", reason: "provider omitted GPU metadata" }, runtimeMetrics: { queueDepth: { state: "stale", reason: "no polling loop" } } }, degradedStates: [{ category: "degraded", reason: "telemetry partial", affectedSubsystem: "probe", severity: "warning", reasonCode: "capability_missing", explanation: "GPU telemetry unavailable", sourceComponent: "worker-probes", timestamp: "2026-05-09T01:00:00.000Z" }] }; }

describe("worker probes", () => {
  it("serializes probe result deterministically", () => {
    expect(serializeProbeResult(probe())).toEqual(serializeProbeResult(probe()));
  });

  it("applies probe result to registry with explicit telemetry state", () => {
    const reg = new DeviceRegistry();
    const node = baseNode();
    reg.registerNode(node);
    const updated = applyProbeToRegistry(reg, node, probe());
    expect(updated.metadata.probeStatus).toBe("degraded");
    expect(updated.capabilities.gpus).toEqual([]);
    expect(updated.capabilities.runtimeTags).toContain("gpu:unavailable");
  });

  it("emits operational events for probe lifecycle", () => {
    const log = new OperationalMemoryLog();
    emitProbeEvents(log, probe("failed"), "receipt-1");
    const events = log.list();
    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events.some((e) => e.category === "degraded_state")).toBe(true);
  });

  it("surfaces probe diagnostics including unknown gpu state", () => {
    const reg = new DeviceRegistry();
    const updated = applyProbeToRegistry(reg, baseNode(), probe("degraded"));
    const lines = summarizeDryRunDiagnostics([updated]);
    expect(lines.some((l) => l.includes("probe=degraded"))).toBe(true);
    expect(lines.some((l) => l.includes("gpu_state=unknown"))).toBe(true);
  });

  it("keeps governed routing state untouched by probing", () => {
    const updated = applyProbeToRegistry(new DeviceRegistry(), baseNode(), probe("succeeded"));
    expect(updated.metadata.governedRoutingEnabled).toBeUndefined();
  });
});
