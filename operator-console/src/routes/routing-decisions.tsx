import React from "react";
import type { HeterogeneousRoutingResult } from "../../data/types";
import { StateLabel } from "../../components/primitives/state-label";
import { StatusBadge } from "../../components/primitives/status-badge";
import { DataTable, type ColumnDef } from "../../components/primitives/data-table";
import { KVTable } from "../../components/primitives/key-value-table";
import { DiagnosticsSummaryPanel } from "../../components/panels/diagnostics-summary";
import styles from "./routing-decisions.module.css";

export interface RoutingDecisionsRouteProps {
  result: HeterogeneousRoutingResult;
  diagnostics: string[];
}

export function RoutingDecisionsRoute({ result, diagnostics }: RoutingDecisionsRouteProps) {
  return (
    <div>
      <h2 className="page-title">Routing Decisions</h2>
      <p className="page-subtitle">Heterogeneous routing decision viewer showing candidate evaluation, selection, and exclusion.</p>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Selected Candidate</h3>
        {result.selectedCandidate ? (
          <KVTable entries={[
            { key: "Candidate", value: result.selectedCandidate.candidateId },
            { key: "Kind", value: result.selectedCandidate.kind },
            { key: "Score", value: result.selectedCandidate.score },
            { key: "Policy Eligibility", value: result.selectedCandidate.policyEligibility },
            { key: "Status", value: <StateLabel state={result.selectedCandidate.status} /> },
            { key: "Telemetry Confidence", value: result.selectedCandidate.telemetryConfidence },
          ]} />
        ) : (
          <p className={styles.empty}>No candidate selected.</p>
        )}
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Excluded Candidates ({result.excludedCandidates.length})</h3>
        {result.excludedCandidates.length === 0 ? (
          <p className={styles.empty}>No candidates excluded.</p>
        ) : (
          <DataTable
            columns={excludedColumns}
            rows={result.excludedCandidates.map((c) => ({ candidateId: c.candidateId, kind: c.kind, policyEligibility: c.policyEligibility, score: c.score, telemetryConfidence: c.telemetryConfidence }))}
            caption="Excluded candidates"
          />
        )}
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Diagnostics</h3>
        <DiagnosticsSummaryPanel lines={diagnostics} title="Routing Diagnostics" />
      </div>
    </div>
  );
}

const excludedColumns: ColumnDef[] = [
  { key: "candidateId", header: "Candidate" },
  { key: "kind", header: "Kind" },
  { key: "policyEligibility", header: "Policy" },
  { key: "score", header: "Score" },
  { key: "telemetryConfidence", header: "Telemetry" },
];
