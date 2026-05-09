import React from "react";
import { DataTable, type ColumnDef } from "../primitives/data-table";
import { KVTable } from "../primitives/key-value-table";
import { Card } from "../primitives/card";
import { EmptyState } from "../primitives/empty-state";
import styles from "./observability-summary.module.css";

export interface ObservabilitySummaryProps {
  policyOutcomes: Record<string, number>;
  fallbackFrequency: Record<string, number>;
  telemetryCounts: Record<string, number>;
  degradedTimeline: string[];
  staleNodes: string[];
}

export function ObservabilitySummaryPanel({
  policyOutcomes,
  fallbackFrequency,
  telemetryCounts,
  degradedTimeline,
  staleNodes,
}: ObservabilitySummaryProps) {
  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        <Card title="Policy Outcomes" status="info">
          {Object.keys(policyOutcomes).length === 0 ? (
            <EmptyState title="No policy outcomes" description="No policy outcomes recorded." />
          ) : (
            <KVTable title="Counts" entries={Object.entries(policyOutcomes).map(([k, v]) => ({ key: k, value: v }))} />
          )}
        </Card>
        <Card title="Fallback Frequency" status="warning">
          {Object.keys(fallbackFrequency).length === 0 ? (
            <EmptyState title="No fallbacks" description="No fallback events recorded." />
          ) : (
            <KVTable title="By Reason" entries={Object.entries(fallbackFrequency).map(([k, v]) => ({ key: k, value: v }))} />
          )}
        </Card>
        <Card title="Telemetry Events" status="info">
          {Object.keys(telemetryCounts).length === 0 ? (
            <EmptyState title="No telemetry" description="No telemetry events recorded." />
          ) : (
            <KVTable title="By Category" entries={Object.entries(telemetryCounts).map(([k, v]) => ({ key: k, value: v }))} />
          )}
        </Card>
      </div>
      <Card title="Degraded Timeline" subtitle={`${degradedTimeline.length} event(s)`} status="warning">
        {degradedTimeline.length === 0 ? (
          <EmptyState title="No degraded events" description="No degraded timeline events." />
        ) : (
          <ul className={styles.list}>{degradedTimeline.map((entry, idx) => (<li key={idx} className={styles.listItem}>{entry}</li>))}</ul>
        )}
      </Card>
      <Card title="Stale Nodes" subtitle={`${staleNodes.length} node(s)`} status={staleNodes.length > 0 ? "error" : "success"}>
        {staleNodes.length === 0 ? (
          <EmptyState title="No stale nodes" description="No stale nodes detected." />
        ) : (
          <ul className={styles.list}>{staleNodes.map((entry, idx) => (<li key={idx} className={styles.listItem}>{entry}</li>))}</ul>
        )}
      </Card>
    </div>
  );
}

const policyColumns: ColumnDef[] = [
  { key: "outcome", header: "Outcome" },
  { key: "count", header: "Count" },
];

const fallbackColumns: ColumnDef[] = [
  { key: "reason", header: "Reason" },
  { key: "count", header: "Count" },
];
