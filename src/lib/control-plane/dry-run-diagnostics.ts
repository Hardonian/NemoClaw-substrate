// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { NodeDescriptor } from "./types";
import type { SchedulerDryRunResult } from "./scheduler-dry-run-bridge";

export function summarizeDryRunDiagnostics(nodes: NodeDescriptor[], result?: SchedulerDryRunResult): string[] {
  if (!nodes.length && !result) return ["Registered nodes: 0", "Capability snapshots: none", "Scheduler dry-run: not invoked"];

  const lines = [`Registered nodes: ${nodes.length}`];
  for (const node of nodes) {
    lines.push(`- ${node.nodeId} health=${node.health} models=${node.capabilities.models.length} gpus=${node.capabilities.gpus.length || "unknown"}`);
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
