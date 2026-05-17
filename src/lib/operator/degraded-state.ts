// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { ComponentStatus, SystemStatusResult } from "./system-status";

export interface DegradedExplanation {
  component: string;
  explanation: string;
  severity: "warning" | "error";
}

export interface DegradedStatusResult extends SystemStatusResult {
  explanations: DegradedExplanation[];
}

export function addDegradedExplanations(
  result: SystemStatusResult,
): DegradedStatusResult {
  const explanations: DegradedExplanation[] = result.components
    .filter((c) => c.status !== "healthy")
    .map((c) => ({
      component: c.name,
      explanation: buildExplanation(c),
      severity: c.status === "critical" ? "error" : "warning",
    }));

  return {
    ...result,
    explanations,
  };
}

function buildExplanation(component: ComponentStatus): string {
  if (component.degradedReason) {
    return component.degradedReason;
  }

  switch (component.status) {
    case "critical":
      return `${component.name} is unavailable`;
    case "degraded":
      return `${component.name} is operating in degraded mode`;
    default:
      return `${component.name} status unknown`;
  }
}

export function buildDegradedSummary(
  components: ComponentStatus[],
): string {
  const total = components.length;
  const unhealthy = components.filter((c) => c.status !== "healthy").length;
  if (unhealthy === 0) return "All components healthy";

  const unreachable = components.filter(
    (c) => c.status === "critical" && !c.degradedReason,
  ).length;
  const degraded = components.filter(
    (c) => c.status === "degraded",
  ).length;

  const parts: string[] = [];
  if (unreachable > 0) parts.push(`${unreachable} node(s) unreachable`);
  if (degraded > 0) parts.push(`${degraded} component(s) degraded`);

  return `degraded: ${unhealthy}/${total} components non-healthy (${parts.join(", ")})`;
}

export function formatDegradedDetail(result: DegradedStatusResult): string {
  const lines: string[] = [];
  lines.push(`Overall: ${result.overall}`);
  lines.push(buildDegradedSummary(result.components));
  lines.push("");
  for (const exp of result.explanations) {
    lines.push(`  [${exp.severity}] ${exp.component}: ${exp.explanation}`);
  }
  return lines.join("\n");
}
