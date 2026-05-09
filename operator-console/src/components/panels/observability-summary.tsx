import React from "react";
import { DataTable, type ColumnDef } from "../primitives/data-table";
import { KVTable } from "../primitives/key-value-table";
import { Card } from "../primitives/card";
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
            <p className={styles.empty}>No policy outcomes recorded.</p>
          ) : (
            <KVTable
              title="Counts"
              entries={Object.entries(policyOutcomes).map(([k, v]) => ({ key: k, value: v }))}
            />
          )}
        </Card>

        <Card title="Fallback Frequency" status="warning">
          {Object.keys(fallbackFrequency).length === 0 ? (
            <p className={styles.empty}>No fallback events recorded.</p>
          ) : (
            <KVTable
              title="By Reason"
              entries={Object.entries(fallbackFrequency).map(([k, v]) => ({ key: k, value: v }))}
            />
          )}
        </Card>

        <Card title="Telemetry Events" status="info">
          {Object.keys(telemetryCounts).length === 0 ? (
            <p className={styles.empty}>No telemetry events recorded.</p>
          ) : (
            <KVTable
              title="By Category"
              entries={Object.entries(telemetryCounts).map(([k, v]) => ({ key: k, value: v }))}
            />
          )}
        </Card>
      </div>

      <Card title="Degraded Timeline" subtitle={`${degradedTimeline.length} event(s)`} status="warning">
        {degradedTimeline.length === 0 ? (
          <p className={styles.empty}>No degraded timeline events.</p>
        ) : (
          <ul className={styles.list}>
            {degradedTimeline.map((entry, idx) => (
              <li key={idx} className={styles.listItem}>{entry}</li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Stale Nodes" subtitle={`${staleNodes.length} node(s)`} status={staleNodes.length > 0 ? "error" : "success"}>
        {staleNodes.length === 0 ? (
          <p className={styles.empty}>No stale nodes detected.</p>
        ) : (
          <ul className={styles.list}>
            {staleNodes.map((entry, idx) => (
              <li key={idx} className={styles.listItem}>{entry}</li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
