// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export {
  generateCorrelationId,
  runWithCorrelation,
  getCorrelationContext,
  getCurrentCorrelationId,
  attachCorrelation,
  createChildContext,
} from "./correlation-id";
export type { CorrelationContext, LogEntry } from "./correlation-id";

export {
  createTimeline,
  startPhase,
  endPhase,
  failPhase,
  computeTotalDuration,
  getPhaseDurationMs,
  timelineSummary,
} from "./lifecycle-timeline";
export type { TimelinePhase, LifecycleTimeline } from "./lifecycle-timeline";

export { renderTimeline, renderPhaseCompact, renderPhaseTable } from "./trace-renderer";

export {
  captureDiagnosticSnapshot,
  gatherSystemInfo,
  formatDiagnosticSnapshot,
  diagnosticSnapshotToJson,
} from "./diagnostic-snapshot";
export type { SystemInfo, DiagnosticSnapshot } from "./diagnostic-snapshot";

export {
  createOperatorReport,
  reportToJson,
  reportToHtml,
  addReportSection,
} from "./operator-report";
export type { ReportSection, OperatorReport } from "./operator-report";

export {
  buildExecutionTrace,
  addSpan,
  getTotalDurationMs,
  summarizeTrace,
  traceToJson,
  detectBottlenecks,
  detectAnomalies,
} from "./execution-trace";
export type { Span, ExecutionTrace } from "./execution-trace";
