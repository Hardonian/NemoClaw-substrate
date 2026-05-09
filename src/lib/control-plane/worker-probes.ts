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

export interface RegistryTelemetryPolicyResult { applied: boolean; reasonCode: string; stale: boolean; conflicts: string[]; source: string; }

export function applyProbeToRegistry(registry: DeviceRegistry, node: NodeDescriptor, probe: WorkerProbeResult): NodeDescriptor {
  const stale = probe.telemetry.runtimeHealth.state === "stale";
  const existingSource = String(node.metadata["telemetrySource"] ?? "unknown");
  const nextSource = `${probe.request.transport}:${probe.request.runtime}`;
  const conflicts = existingSource !== "unknown" && existingSource !== nextSource ? [existingSource] : [];
  const telemetryUnavailable = probe.telemetry.backendVersion.state === "unavailable" && probe.telemetry.modelInventory.state === "unavailable" && probe.telemetry.gpus.state === "unavailable";
  const preserveModels = telemetryUnavailable ? node.capabilities.models : probe.capability.models.map((modelId) => ({
        modelId, maxContextTokens: 0, flags: { streaming: false, tools: false, batch: false, multimodal: false, quantization: false }, inferenceConstraints: [], executionRestrictions: [],
      }));
  const next: NodeDescriptor = {
    ...node,
    lastHeartbeatAt: probe.request.nowIso,
    health: probe.status === "failed" ? "unreachable" : stale ? "stale" : "healthy",
    metadata: { ...node.metadata, probeStatus: probe.status, probeRuntime: probe.request.runtime, probeTransport: probe.request.transport, telemetryCapturedAt: probe.telemetry.capturedAt, telemetrySource: nextSource, telemetryConfidence: probe.telemetry.runtimeHealth.state, telemetryUpdatePolicy: telemetryUnavailable ? "retained_previous_observed" : "applied_observed" },
    capabilities: {
      ...node.capabilities,
      capturedAt: probe.telemetry.capturedAt,
      runtimeBackend: probe.capability.runtimeBackend,
      executionMode: probe.capability.executionMode,
      models: preserveModels,
      gpus: probe.telemetry.gpus.state === "observed" && probe.telemetry.gpus.value
        ? probe.telemetry.gpus.value.map((gpu) => ({ vendor: gpu.vendor, model: gpu.model, vramMb: gpu.vramMb ?? 0, count: 1 }))
        : [],
      runtimeTags: [...new Set([...(node.capabilities.runtimeTags ?? []), `telemetry:${probe.telemetry.runtimeHealth.state}`, `gpu:${probe.telemetry.gpus.state}`, `telemetry-source:${nextSource}`, ...(stale ? ["telemetry:stale"] : []), ...(conflicts.length ? ["telemetry:conflict"] : [])])].sort(),
    } as CapabilitySnapshot,
  };
  registry.registerNode(next);
  return next;
}

export function emitProbeEvents(log: OperationalMemoryLog, probe: WorkerProbeResult, receiptId: string): void {
  const replayRef = { lineage: ["worker-probes", probe.request.nodeId], replayVersion: "1" };
  const base = { occurredAt: probe.request.nowIso, source: "worker-probes", provenance: { requestId: probe.request.requestId, receiptId }, replayRef };
  log.append({ ...base, category: "telemetry_probe_started", payload: { nodeId: probe.request.nodeId, runtime: probe.request.runtime, transport: probe.request.transport, confidence: probe.telemetry.runtimeHealth.state } });
  if (probe.telemetry.runtimeHealth.state === "stale") {
    log.append({ ...base, category: "telemetry_stale", payload: { reasonCode: probe.telemetry.runtimeHealth.reason ?? "stale", confidence: "low", sourceRuntime: probe.request.runtime } });
  }
  if (probe.telemetry.gpus.state === "unavailable") {
    log.append({ ...base, category: "telemetry_unavailable", payload: { reasonCode: probe.telemetry.gpus.reason === "command_unavailable" ? "nvidia_smi_unavailable" : "capability_missing", subsystem: "gpu", confidence: "low", sourceRuntime: probe.request.runtime } });
  }
  const phase = probe.status === "failed" ? "telemetry_probe_failed" : "telemetry_probe_succeeded";
  log.append({ ...base, category: phase, payload: { status: probe.status, degradedReasons: probe.degradedStates.map((d) => d.reasonCode), confidence: probe.telemetry.runtimeHealth.state, sourceRuntime: probe.request.runtime } });
}
