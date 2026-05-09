import React, { useState, useEffect, useCallback } from "react";
import {
  sampleDegradedStates,
  sampleReceipts,
  sampleEvents,
  sampleWorkerIdentities,
  sampleWorkerTrustDecisions,
  sampleWorkerAttestations,
  sampleNodes,
  sampleRoutingResult,
  samplePolicyCandidates,
  validReplayEnvelope,
  emptyReplayEnvelope,
  sampleProbeSummary,
} from "../data/fixtures";
import {
  summarizePolicyOutcomes,
  summarizeFallbackFrequency,
  summarizeTelemetryEventCounts,
  summarizeDegradedTimeline,
  summarizeStaleNodes,
} from "../data/types";
import { summarizeHeterogeneousDiagnostics } from "../data/types";

export interface SnapshotData {
  degradedStates: typeof sampleDegradedStates;
  receipts: typeof sampleReceipts;
  events: typeof sampleEvents;
  workerIdentities: typeof sampleWorkerIdentities;
  workerTrustDecisions: typeof sampleWorkerTrustDecisions;
  workerAttestations: typeof sampleWorkerAttestations;
  nodes: typeof sampleNodes;
  routingResult: typeof sampleRoutingResult;
  policyCandidates: typeof samplePolicyCandidates;
  validReplayEnvelope: typeof validReplayEnvelope;
  emptyReplayEnvelope: typeof emptyReplayEnvelope;
  policyOutcomes: Record<string, number>;
  fallbackFrequency: Record<string, number>;
  telemetryCounts: Record<string, number>;
  degradedTimeline: string[];
  staleNodes: string[];
  probeSummary: typeof sampleProbeSummary;
  routingDiagnostics: string[];
}

export function useSnapshot(): SnapshotData {
  const [data] = useState<SnapshotData>(() => {
    const policyOutcomes = summarizePolicyOutcomes(sampleEvents);
    const fallbackFrequency = summarizeFallbackFrequency(sampleEvents);
    const telemetryCounts = summarizeTelemetryEventCounts(sampleEvents);
    const degradedTimeline = summarizeDegradedTimeline(sampleEvents);
    const now = new Date().toISOString();
    const staleNodes = summarizeStaleNodes(sampleNodes, now, 60_000);
    const routingDiagnostics = summarizeHeterogeneousDiagnostics({
      routing: { enabled: true, source: "default" },
      governedEnabled: true,
      remote: { enabled: false, source: "default" },
      result: sampleRoutingResult,
    });
    return {
      degradedStates: sampleDegradedStates,
      receipts: sampleReceipts,
      events: sampleEvents,
      workerIdentities: sampleWorkerIdentities,
      workerTrustDecisions: sampleWorkerTrustDecisions,
      workerAttestations: sampleWorkerAttestations,
      nodes: sampleNodes,
      routingResult: sampleRoutingResult,
      policyCandidates: samplePolicyCandidates,
      validReplayEnvelope,
      emptyReplayEnvelope,
      policyOutcomes,
      fallbackFrequency,
      telemetryCounts,
      degradedTimeline,
      staleNodes,
      probeSummary: sampleProbeSummary,
      routingDiagnostics,
    };
  });
  return data;
}
