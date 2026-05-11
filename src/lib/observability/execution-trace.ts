// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Span {
  name: string;
  durationMs: number;
  annotations: string[];
}

export interface ExecutionTrace {
  traceId: string;
  spans: Span[];
  bottlenecks: string[];
  anomalies: string[];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build an execution trace from a list of spans.
 * Automatically detects bottlenecks and anomalies.
 */
export function buildExecutionTrace(traceId: string, spans: Span[]): ExecutionTrace {
  return {
    traceId,
    spans,
    bottlenecks: detectBottlenecks(spans),
    anomalies: detectAnomalies(spans),
  };
}

/**
 * Add a span to an existing execution trace. Returns a new trace.
 */
export function addSpan(trace: ExecutionTrace, span: Span): ExecutionTrace {
  const updated = {
    ...trace,
    spans: [...trace.spans, span],
  };
  return {
    ...updated,
    bottlenecks: detectBottlenecks(updated.spans),
    anomalies: detectAnomalies(updated.spans),
  };
}

/**
 * Get the total duration of all spans in the trace.
 */
export function getTotalDurationMs(trace: ExecutionTrace): number {
  return trace.spans.reduce((sum, s) => sum + s.durationMs, 0);
}

/**
 * Summarize an execution trace as a human-readable string.
 */
export function summarizeTrace(trace: ExecutionTrace): string {
  const total = getTotalDurationMs(trace);
  const lines: string[] = [];

  lines.push(`Trace ${trace.traceId} (${total}ms total, ${trace.spans.length} spans)`);

  for (const span of trace.spans) {
    const annotationStr =
      span.annotations.length > 0 ? ` [${span.annotations.join(", ")}]` : "";
    lines.push(`  ${span.name}: ${span.durationMs}ms${annotationStr}`);
  }

  if (trace.bottlenecks.length > 0) {
    lines.push("");
    lines.push("Bottlenecks:");
    for (const b of trace.bottlenecks) {
      lines.push(`  ! ${b}`);
    }
  }

  if (trace.anomalies.length > 0) {
    lines.push("");
    lines.push("Anomalies:");
    for (const a of trace.anomalies) {
      lines.push(`  * ${a}`);
    }
  }

  return lines.join("\n");
}

/**
 * Serialize an execution trace to JSON.
 */
export function traceToJson(trace: ExecutionTrace): string {
  return JSON.stringify(trace, null, 2);
}

// ---------------------------------------------------------------------------
// Bottleneck & anomaly detection
// ---------------------------------------------------------------------------

const BOTTLENECK_THRESHOLD_PCT = 0.5;
const ANOMALY_DURATION_MS = 5000;

/**
 * Detect spans that consume more than BOTTLENECK_THRESHOLD_PCT of total time.
 */
export function detectBottlenecks(spans: Span[]): string[] {
  const total = spans.reduce((sum, s) => sum + s.durationMs, 0);
  if (total === 0) return [];

  return spans
    .filter((s) => s.durationMs / total > BOTTLENECK_THRESHOLD_PCT)
    .map((s) => `${s.name} (${Math.round((s.durationMs / total) * 100)}% of total)`);
}

/**
 * Detect spans that exceed ANOMALY_DURATION_MS.
 */
export function detectAnomalies(spans: Span[]): string[] {
  return spans
    .filter((s) => s.durationMs > ANOMALY_DURATION_MS)
    .map((s) => `${s.name} exceeded ${ANOMALY_DURATION_MS}ms (${s.durationMs}ms)`);
}
