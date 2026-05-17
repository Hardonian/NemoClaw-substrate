// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export type { OperatorTopic, OperatorOutput, OperatorRecord } from "./types";
export { formatJson, formatTable } from "./format";
export { resolveProfile } from "./profiles";
export type { OperatorProfile } from "./profiles";
export {
  buildSystemStatus,
  statusFromRecords,
  formatDegradedSummary,
} from "./system-status";
export type { OverallStatus, ComponentStatus, SystemStatusResult } from "./system-status";
export {
  aggregateTroubleshoot,
  filterEventsBySeverity,
  metricsByName,
} from "./troubleshoot";
export type { MetricEntry, EventEntry, TroubleshootResult } from "./troubleshoot";
export {
  getExplainer,
  listExplainers,
  explainCodes,
  explainersBySeverity,
} from "./diagnostic-explainers";
export type { Severity, DiagnosticExplainer } from "./diagnostic-explainers";
export {
  createReplay,
  replayStep,
  replayStepBack,
  replayJumpTo,
  replayRemaining,
  replayFormatStep,
} from "./replay-walkthrough";
export type { SessionEvent, ReplayStep, ReplayState } from "./replay-walkthrough";
export {
  parseProofpack,
  proofpackAllVerified,
  diffProofpack,
  formatProofpack,
} from "./proofpack-inspect";
export type {
  ProofpackMetadata,
  ProofpackSignature,
  ProofpackContentSummary,
  ProofpackInfo,
} from "./proofpack-inspect";
export {
  addDegradedExplanations,
  buildDegradedSummary,
  formatDegradedDetail,
} from "./degraded-state";
export type { DegradedExplanation, DegradedStatusResult } from "./degraded-state";
