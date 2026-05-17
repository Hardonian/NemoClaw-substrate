// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { OperatorRecord } from "./types";

export type OverallStatus = "healthy" | "degraded" | "critical";

export interface ComponentStatus {
  name: string;
  status: OverallStatus;
  detail?: string;
  degradedReason?: string;
}

export interface SystemStatusResult {
  overall: OverallStatus;
  components: ComponentStatus[];
  timestamp: string;
}

export function buildSystemStatus(
  components: ComponentStatus[],
  now = new Date(),
): SystemStatusResult {
  const overall = computeOverallStatus(components);
  return {
    overall,
    components,
    timestamp: now.toISOString(),
  };
}

function computeOverallStatus(components: ComponentStatus[]): OverallStatus {
  if (components.some((c) => c.status === "critical")) return "critical";
  if (components.some((c) => c.status === "degraded")) return "degraded";
  return "healthy";
}

export function statusFromRecords(
  records: OperatorRecord[],
  now = new Date(),
): SystemStatusResult {
  const components: ComponentStatus[] = records.map((r) => ({
    name: r.id,
    status: r.unavailable
      ? "critical"
      : r.degraded
        ? "degraded"
        : "healthy",
    detail: r.detail,
    degradedReason: r.degraded ? r.detail : undefined,
  }));
  return buildSystemStatus(components, now);
}

export function formatDegradedSummary(result: SystemStatusResult): string {
  const degraded = result.components.filter((c) => c.status !== "healthy");
  if (degraded.length === 0) return "All components healthy";
  return `degraded: ${degraded.length}/${result.components.length} components non-healthy`;
}
