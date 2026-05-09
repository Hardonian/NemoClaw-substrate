import React from "react";
import {
  sampleDegradedStates,
  sampleReceipts,
  sampleEvents,
  sampleWorkerIdentities,
  sampleWorkerTrustDecisions,
  sampleWorkerAttestations,
  sampleNodes,
  sampleRoutingResult,
  sampleDryRunResult,
  sampleProbeSummary,
  validReplayEnvelope,
  emptyReplayEnvelope,
  invalidReplayEnvelope,
} from "../data/fixtures";
import {
  summarizePolicyOutcomes,
  summarizeDegradedTimeline,
  summarizeFallbackFrequency,
  summarizeTelemetryEventCounts,
  summarizeStaleNodes,
} from "../data/types";

export interface SnapshotData {
  degradedStates: typeof sampleDegradedStates;
  receipts: typeof sampleReceipts;
  events: typeof sampleEvents;
  workerIdentities: typeof sampleWorkerIdentities;
  workerTrustDecisions: typeof sampleWorkerTrustDecisions;
  workerAttestations: typeof sampleWorkerAttestations;
  nodes: typeof sampleNodes;
  routingResult: typeof sampleRoutingResult;
  dryRunResult: typeof sampleDryRunResult;
  probeSummary: typeof sampleProbeSummary;
  validReplayEnvelope: typeof validReplayEnvelope;
  emptyReplayEnvelope: typeof emptyReplayEnvelope;
  invalidReplayEnvelope: typeof invalidReplayEnvelope;
  policyOutcomes: Record<string, number>;
  degradedTimeline: string[];
  fallbackFrequency: Record<string, number>;
  telemetryCounts: Record<string, number>;
  staleNodes: string[];
}

export function useSnapshot(): SnapshotData {
  const policyOutcomes = React.useMemo(() => summarizePolicyOutcomes(sampleEvents), []);
  const degradedTimeline = React.useMemo(() => summarizeDegradedTimeline(sampleEvents), []);
  const fallbackFrequency = React.useMemo(() => summarizeFallbackFrequency(sampleEvents), []);
  const telemetryCounts = React.useMemo(() => summarizeTelemetryEventCounts(sampleEvents), []);
  const staleNodes = React.useMemo(() => summarizeStaleNodes(sampleNodes, "2026-05-09T00:01:00.000Z", 60_000), []);

  return {
    degradedStates: sampleDegradedStates,
    receipts: sampleReceipts,
    events: sampleEvents,
    workerIdentities: sampleWorkerIdentities,
    workerTrustDecisions: sampleWorkerTrustDecisions,
    workerAttestations: sampleWorkerAttestations,
    nodes: sampleNodes,
    routingResult: sampleRoutingResult,
    dryRunResult: sampleDryRunResult,
    probeSummary: sampleProbeSummary,
    validReplayEnvelope,
    emptyReplayEnvelope,
    invalidReplayEnvelope,
    policyOutcomes,
    degradedTimeline,
    fallbackFrequency,
    telemetryCounts,
    staleNodes,
  };
}
