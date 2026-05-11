// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SystemInfo {
  platform: string;
  arch: string;
  nodeVersion: string;
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
}

export interface DiagnosticSnapshot {
  timestamp: string;
  config: Record<string, unknown>;
  logs: string[];
  metrics: Record<string, number>;
  systemInfo: SystemInfo;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Capture a point-in-time diagnostic snapshot.
 * Pure function — collects data from provided inputs and the current process.
 */
export function captureDiagnosticSnapshot(options: {
  config: Record<string, unknown>;
  logs: string[];
  metrics: Record<string, number>;
}): DiagnosticSnapshot {
  return {
    timestamp: new Date().toISOString(),
    config: options.config,
    logs: options.logs,
    metrics: options.metrics,
    systemInfo: gatherSystemInfo(),
  };
}

/**
 * Gather system-level information into a structured object.
 */
export function gatherSystemInfo(): SystemInfo {
  return {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    uptime: Math.round(process.uptime()),
    memoryUsage: process.memoryUsage(),
  };
}

/**
 * Format a diagnostic snapshot as a human-readable string.
 */
export function formatDiagnosticSnapshot(snapshot: DiagnosticSnapshot): string {
  const lines: string[] = [];
  lines.push(`Diagnostic Snapshot — ${snapshot.timestamp}`);
  lines.push("─".repeat(60));

  lines.push("System:");
  lines.push(`  Platform:    ${snapshot.systemInfo.platform}`);
  lines.push(`  Arch:        ${snapshot.systemInfo.arch}`);
  lines.push(`  Node:        ${snapshot.systemInfo.nodeVersion}`);
  lines.push(`  Uptime:      ${snapshot.systemInfo.uptime}s`);
  lines.push(
    `  Heap Used:   ${Math.round(snapshot.systemInfo.memoryUsage.heapUsed / 1024 / 1024)} MB`,
  );

  lines.push("Metrics:");
  for (const [key, value] of Object.entries(snapshot.metrics)) {
    lines.push(`  ${key}: ${value}`);
  }

  lines.push(`Config keys: ${Object.keys(snapshot.config).join(", ") || "(none)"}`);

  if (snapshot.logs.length > 0) {
    lines.push(`Logs (${snapshot.logs.length}):`);
    const maxShow = 10;
    for (const log of snapshot.logs.slice(0, maxShow)) {
      lines.push(`  ${log}`);
    }
    if (snapshot.logs.length > maxShow) {
      lines.push(`  ... and ${snapshot.logs.length - maxShow} more`);
    }
  }

  return lines.join("\n");
}

/**
 * Serialize a diagnostic snapshot to JSON for machine ingestion.
 */
export function diagnosticSnapshotToJson(snapshot: DiagnosticSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}
