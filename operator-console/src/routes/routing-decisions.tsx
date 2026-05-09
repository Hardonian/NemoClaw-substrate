import React from "react";
import type { HeterogeneousRoutingResult } from "../data/types";
import { StateLabel } from "../components/primitives/state-label";
import { DataTable, type ColumnDef } from "../components/primitives/data-table";
import { Card } from "../components/primitives/card";
import styles from "./route-common.module.css";

export interface RoutingDecisionsRouteProps {
  result: HeterogeneousRoutingResult;
}

export function RoutingDecisionsRoute({ result }: RoutingDecisionsRouteProps) {
  return (
    <div className={styles.routeContainer}>
      <h2 className={styles.pageTitle}>Routing Decisions</h2>
      <p className={styles.pageSubtitle}>Heterogeneous routing candidate evaluation and selection.</p>

      <Card title="Selected Candidate" status="success">
        {result.selectedCandidate ? (
          <DataTable
            columns={candidateColumns}
            rows={[candidateRow(result.selectedCandidate)]}
            caption="Selected routing candidate"
          />
        ) : (
          <p className={styles.empty}>No candidate selected.</p>
        )}
      </Card>

      <Card title="All Candidates" subtitle={`${result.allCandidates.length} candidate(s)`} status="info">
        <DataTable
          columns={candidateColumns}
          rows={result.allCandidates.map(candidateRow)}
          caption="All routing candidates"
        />
      </Card>

      {result.excludedCandidates.length > 0 && (
        <Card title="Excluded Candidates" subtitle={`${result.excludedCandidates.length} excluded`} status="error">
          <DataTable
            columns={candidateColumns}
            rows={result.excludedCandidates.map(candidateRow)}
            caption="Excluded routing candidates"
          />
        </Card>
      )}

      {result.remoteStatus && (
        <Card title="Remote Execution Status">
          <p className={styles.detail}>Status: <StateLabel state={result.remoteStatus === "succeeded" ? "healthy" : "unavailable"} /></p>
        </Card>
      )}
    </div>
  );
}

const candidateColumns: ColumnDef[] = [
  { key: "candidateId", header: "Candidate" },
  { key: "kind", header: "Kind" },
  { key: "status", header: "Status", render: (v) => <StateLabel state={String(v)} /> },
  { key: "policyEligibility", header: "Policy" },
  { key: "score", header: "Score" },
  { key: "telemetryConfidence", header: "Telemetry" },
  { key: "executionMode", header: "Mode" },
];

function candidateRow(candidate: { candidateId: string; kind: string; status: string; policyEligibility: string; score: number; telemetryConfidence: string; executionMode: string }): Record<string, unknown> {
  return {
    candidateId: candidate.candidateId,
    kind: candidate.kind,
    status: candidate.status,
    policyEligibility: candidate.policyEligibility,
    score: candidate.score,
    telemetryConfidence: candidate.telemetryConfidence,
    executionMode: candidate.executionMode,
  };
}
