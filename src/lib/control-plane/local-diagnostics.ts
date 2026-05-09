// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { DeviceRegistry } from "./device-registry";
import type { SchedulerDryRunResult } from "./scheduler-dry-run-bridge";
import type { GovernedRoutingConfig } from "./governed-provider-routing";
import type { LocalProbeSummary } from "./local-runtime-probes";

export function summarizeLocalDiagnostics(input: {
  probeSummary: LocalProbeSummary;
  registry: DeviceRegistry;
  governedRouting: GovernedRoutingConfig;
  dryRun?: SchedulerDryRunResult;
}): string[] {
  const lines = [
    `Local probes: ${input.probeSummary.outcomes.length}`,
    `Probe degraded states: ${input.probeSummary.degradedStates.length ? input.probeSummary.degradedStates.map((d) => d.reasonCode).join(",") : "none"}`,
    `Registered nodes: ${input.registry.list().length}`,
    `Telemetry availability: ${input.probeSummary.telemetryAvailable ? "available" : "unavailable"}`,
    `Governed routing: ${input.governedRouting.enabled ? "enabled" : "disabled"} (${input.governedRouting.source})`,
    `Dry-run result: ${input.dryRun ? input.dryRun.policyResult : "none"}`,
  ];
  return lines;
}
