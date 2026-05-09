// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { deterministicSerialize } from "./serde";
import type { DeviceRegistry } from "./device-registry";
import type { OperationalMemoryLog } from "./operational-memory";
import type { CapabilitySnapshot, DegradedState, NodeDescriptor } from "./types";

export type WorkerProbeStatus = "succeeded" | "degraded" | "failed" | "not_supported";
export type WorkerProbeTransport = "local" | "http" | "ssh";
export type WorkerProbeRuntime = "ollama" | "vllm" | "llama.cpp" | "nim" | "unknown";

export interface ProbeTelemetryField<T> { state: "observed" | "unavailable" | "stale" | "inferred"; value?: T; reason?: string; observedAt?: string; }
export interface ProbeTelemetrySnapshot {
  capturedAt: string;
  runtimeHealth: ProbeTelemetryField<"healthy" | "degraded" | "unavailable">;
  backendVersion: ProbeTelemetryField<string>;
  modelInventory: ProbeTelemetryField<string[]>;
  gpus: ProbeTelemetryField<Array<{ vendor: string; model: string; vramMb?: number; uuid?: string }>>;
  runtimeMetrics: Record<string, ProbeTelemetryField<number>>;
}

export interface ProbeCapabilitySnapshot { runtimeBackend: string; executionMode: "local" | "remote"; models: string[]; }
export interface WorkerProbeRequest {
  requestId: string; nodeId: string; runtime: WorkerProbeRuntime; transport: WorkerProbeTransport; endpoint: string; nowIso: string;
}
export interface WorkerProbeError { code: "transport_unreachable" | "probe_not_supported" | "unknown_error"; message: string; retryable: boolean; }
export interface WorkerProbeResult {
  request: WorkerProbeRequest;
  status: WorkerProbeStatus;
  capability: ProbeCapabilitySnapshot;
  telemetry: ProbeTelemetrySnapshot;
  degradedStates: DegradedState[];
  error?: WorkerProbeError;
}

export function serializeProbeResult(input: WorkerProbeResult): string { return deterministicSerialize(input); }

export function applyProbeToRegistry(registry: DeviceRegistry, node: NodeDescriptor, probe: WorkerProbeResult): NodeDescriptor {
  const next: NodeDescriptor = {
    ...node,
    lastHeartbeatAt: probe.request.nowIso,
    health: probe.status === "failed" ? "unreachable" : probe.degradedStates.some((d) => d.category === "stale") ? "stale" : "healthy",
    metadata: { ...node.metadata, probeStatus: probe.status, probeRuntime: probe.request.runtime, probeTransport: probe.request.transport, telemetryCapturedAt: probe.telemetry.capturedAt },
    capabilities: {
      ...node.capabilities,
      capturedAt: probe.telemetry.capturedAt,
      runtimeBackend: probe.capability.runtimeBackend,
      executionMode: probe.capability.executionMode,
      models: probe.capability.models.map((modelId) => ({
        modelId, maxContextTokens: 0, flags: { streaming: false, tools: false, batch: false, multimodal: false, quantization: false }, inferenceConstraints: [], executionRestrictions: [],
      })),
      gpus: probe.telemetry.gpus.state === "observed" && probe.telemetry.gpus.value
        ? probe.telemetry.gpus.value.map((gpu) => ({ vendor: gpu.vendor, model: gpu.model, vramMb: gpu.vramMb ?? 0, count: 1 }))
        : [],
      runtimeTags: [...new Set([...(node.capabilities.runtimeTags ?? []), `telemetry:${probe.telemetry.runtimeHealth.state}`, `gpu:${probe.telemetry.gpus.state}`])].sort(),
    } as CapabilitySnapshot,
  };
  registry.registerNode(next);
  return next;
}

export function emitProbeEvents(log: OperationalMemoryLog, probe: WorkerProbeResult, receiptId: string): void {
  const replayRef = { lineage: ["worker-probes", probe.request.nodeId], replayVersion: "1" };
  log.append({ occurredAt: probe.request.nowIso, category: "runtime_action", source: "worker-probes", provenance: { requestId: probe.request.requestId, receiptId }, replayRef, payload: { phase: "probe_started", nodeId: probe.request.nodeId } });
  if (probe.telemetry.gpus.state === "unavailable") {
    log.append({ occurredAt: probe.request.nowIso, category: "degraded_state", source: "worker-probes", provenance: { requestId: probe.request.requestId, receiptId }, replayRef, payload: { degraded: { reasonCode: "capability_missing", reason: "gpu_unavailable" } } });
  }
  const phase = probe.status === "succeeded" ? "probe_succeeded" : probe.status === "degraded" ? "probe_degraded" : "probe_failed";
  log.append({ occurredAt: probe.request.nowIso, category: "runtime_action", source: "worker-probes", provenance: { requestId: probe.request.requestId, receiptId }, replayRef, payload: { phase, status: probe.status, degradedReasons: probe.degradedStates.map((d) => d.reasonCode) } });
}
