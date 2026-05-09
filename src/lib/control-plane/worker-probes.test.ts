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
    expect(updated.metadata.telemetrySource).toBe("http:vllm");
    expect(updated.capabilities.gpus).toEqual([]);
    expect(updated.capabilities.runtimeTags).toContain("gpu:unavailable");
  });

  it("emits operational events for probe lifecycle", () => {
    const log = new OperationalMemoryLog();
    emitProbeEvents(log, probe("failed"), "receipt-1");
    const events = log.list();
    expect(events.length).toBeGreaterThanOrEqual(3);
    expect(events.some((e) => e.category === "telemetry_probe_started")).toBe(true);
    expect(events.some((e) => e.category === "telemetry_unavailable")).toBe(true);
    expect(events.some((e) => e.category === "telemetry_probe_failed")).toBe(true);
    expect(events.some((e) => e.category === "telemetry_registry_update_applied")).toBe(true);
  });

  it("treats degraded probes as succeeded lifecycle events", () => {
    const log = new OperationalMemoryLog();
    emitProbeEvents(log, probe("degraded"), "receipt-2");
    const events = log.list();
    expect(events.some((e) => e.category === "telemetry_probe_succeeded")).toBe(true);
    expect(events.some((e) => e.category === "telemetry_probe_failed")).toBe(false);
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


describe("registry telemetry policy", () => {
  it("unavailable telemetry does not erase observed models", () => {
    const reg = new DeviceRegistry();
    const node = baseNode();
    node.capabilities.models = [{ modelId: "m-existing", maxContextTokens: 0, flags: { streaming: false, tools: false, batch: false, multimodal: false, quantization: false }, inferenceConstraints: [], executionRestrictions: [] }];
    reg.registerNode(node);
    const p = probe("degraded");
    p.capability.models = [];
    p.telemetry.modelInventory = { state: "unavailable", reason: "missing" };
    p.telemetry.backendVersion = { state: "unavailable", reason: "missing" };
    p.telemetry.gpus = { state: "unavailable", reason: "missing" };
    const updated = applyProbeToRegistry(reg, node, p);
    expect(updated.capabilities.models[0]?.modelId).toBe("m-existing");
  });

  it("marks stale telemetry and preserves provenance on conflict", () => {
    const reg = new DeviceRegistry();
    const node = baseNode();
    node.metadata.telemetrySource = "local:ollama";
    reg.registerNode(node);
    const p = probe("degraded");
    p.telemetry.runtimeHealth = { state: "stale", reason: "old" };
    const updated = applyProbeToRegistry(reg, node, p);
    expect(updated.health).toBe("stale");
    expect(updated.capabilities.runtimeTags).toContain("telemetry:conflict");
  });

  it("emits skipped/applied/conflict/stale telemetry events with deterministic ordering", () => {
    const log = new OperationalMemoryLog();
    const p = probe("degraded");
    p.telemetry.backendVersion = { state: "unavailable", reason: "missing" };
    p.telemetry.modelInventory = { state: "unavailable", reason: "missing" };
    p.telemetry.gpus = { state: "unavailable", reason: "missing" };
    p.telemetry.runtimeHealth = { state: "stale", reason: "source_conflict" };
    emitProbeEvents(log, p, "receipt-3");
    const categories = log.list().map((e) => e.category);
    expect(categories).toEqual([
      "telemetry_probe_started",
      "telemetry_registry_update_skipped",
      "telemetry_stale",
      "telemetry_conflict_detected",
      "telemetry_unavailable",
      "telemetry_probe_succeeded",
    ]);
    const skipped = log.list().find((e) => e.category === "telemetry_registry_update_skipped");
    expect(skipped?.payload.reasonCode).toBe("retained_previous_observed");
    const conflict = log.list().find((e) => e.category === "telemetry_conflict_detected");
    expect(conflict?.payload.reasonCode).toBe("source_conflict");
  });
});
