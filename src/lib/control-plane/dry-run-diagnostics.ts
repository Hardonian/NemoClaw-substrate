// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { NodeDescriptor } from "./types";
import type { SchedulerDryRunResult } from "./scheduler-dry-run-bridge";

export function summarizeDryRunDiagnostics(nodes: NodeDescriptor[], result?: SchedulerDryRunResult): string[] {
  if (!nodes.length && !result) return ["Registered nodes: 0", "Capability snapshots: none", "Scheduler dry-run: not invoked"];

  const lines = [`Registered nodes: ${nodes.length}`];
  for (const node of nodes) {
    const probeStatus = String(node.metadata["probeStatus"] ?? "unprobed");
    const runtime = String(node.metadata["probeRuntime"] ?? node.capabilities.runtimeBackend);
    const telemetryAt = String(node.metadata["telemetryCapturedAt"] ?? node.capabilities.capturedAt);
    const gpuState = node.capabilities.gpus.length > 0 ? "known" : "unknown";
    lines.push(`- ${node.nodeId} health=${node.health} probe=${probeStatus} runtime=${runtime} models=${node.capabilities.models.length} gpu_state=${gpuState} telemetry_at=${telemetryAt}`);
  }
  if (!result) return lines;
  lines.push(`Policy result: ${result.policyResult}`);
  lines.push(`Selected candidate: ${result.selectedCandidate ?? "none"}`);
  lines.push(`Excluded candidates: ${result.excludedCandidates.length ? result.excludedCandidates.join(",") : "none"}`);
  lines.push(`Degraded states: ${result.degradedStates.length ? result.degradedStates.map((d) => d.reasonCode).join(",") : "none"}`);
  lines.push(`Receipt: ${result.receipt.receiptId}`);
  lines.push(`Operational events: ${result.events.length}`);
  return lines;
}
