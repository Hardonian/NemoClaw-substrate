import React from "react";
import { Card } from "../components/primitives/card";
import { StateLabel } from "../components/primitives/state-label";
import { StatusBadge } from "../components/primitives/status-badge";
import { DataTable, type ColumnDef } from "../components/primitives/data-table";
import { Timeline } from "../components/primitives/timeline";
import type { SnapshotData } from "../hooks/use-snapshot";
import styles from "./overview.module.css";

export interface OverviewProps {
  snapshot: SnapshotData;
}

export function OverviewRoute({ snapshot }: OverviewProps) {
  return (
    <div className={styles.container}>
      <h2 className={styles.pageTitle}>Dashboard Overview</h2>

      <div className={styles.grid}>
        <Card title="Execution Plans" subtitle={`${snapshot.receipts.length} receipt(s)`} status="info">
          <p className={styles.stat}>{snapshot.receipts.length} receipts recorded</p>
          <p className={styles.subtext}>Unique requests: {new Set(snapshot.receipts.map((r) => r.requestId)).size}</p>
        </Card>

        <Card title="Degraded States" subtitle={`${snapshot.degradedStates.length} state(s)`} status="warning">
          <p className={styles.stat}>{snapshot.degradedStates.length} degraded states</p>
          <p className={styles.subtext}>Categories: {new Set(snapshot.degradedStates.map((s) => s.category)).size}</p>
        </Card>

        <Card title="Operational Events" subtitle={`${snapshot.events.length} event(s)`} status="info">
          <p className={styles.stat}>{snapshot.events.length} events</p>
          <p className={styles.subtext}>Categories: {new Set(snapshot.events.map((e) => e.category)).size}</p>
        </Card>

        <Card title="Worker Trust" subtitle={`${snapshot.workerTrustDecisions.length} decision(s)`} status="info">
          <p className={styles.stat}>{snapshot.workerTrustDecisions.length} trust decisions</p>
          <p className={styles.subtext}>Attestations: {snapshot.workerAttestations.length}</p>
        </Card>

        <Card title="Policy Outcomes" status="info">
          <div className={styles.policySummary}>
            {Object.entries(snapshot.policyOutcomes).map(([k, v]) => (
              <span key={k} className={styles.policyItem}>
                {k}: <strong>{v}</strong>
              </span>
            ))}
          </div>
        </Card>

        <Card title="Telemetry" subtitle={`${Object.values(snapshot.telemetryCounts).reduce((a, b) => a + b, 0)} event(s)`} status={Object.keys(snapshot.telemetryCounts).length > 0 ? "success" : "unknown"}>
          <p className={styles.stat}>{Object.keys(snapshot.telemetryCounts).length} telemetry categories</p>
          <p className={styles.subtext}>Stale nodes: {snapshot.staleNodes.length}</p>
        </Card>
      </div>

      <div className={styles.section}>
        <Card title="Recent Degraded States" status="warning">
          {snapshot.degradedStates.length === 0 ? (
            <p className={styles.empty}>No degraded states to display.</p>
          ) : (
            <DataTable
              columns={degradedSummaryColumns}
              rows={snapshot.degradedStates.slice(0, 5).map((s) => ({
                category: <StateLabel state={s.category} />,
                reason: s.reasonCode,
                subsystem: s.affectedSubsystem,
                severity: <StatusBadge status={severityToStatus(s.severity)} label={s.severity} />,
              }))}
              caption="Recent degraded states"
            />
          )}
        </Card>
      </div>

      <div className={styles.section}>
        <Card title="Recent Events" status="info">
          {snapshot.events.length === 0 ? (
            <p className={styles.empty}>No events to display.</p>
          ) : (
            <Timeline
              items={snapshot.events.slice(0, 5).map((e) => ({
                timestamp: e.occurredAt,
                label: e.category,
                detail: e.eventId,
              }))}
            />
          )}
        </Card>
      </div>

      <div className={styles.section}>
        <Card title="Node Registry" status="info">
          {snapshot.nodes.length === 0 ? (
            <p className={styles.empty}>No nodes registered.</p>
          ) : (
            <DataTable
              columns={nodeColumns}
              rows={snapshot.nodes.map((n) => ({
                nodeId: n.nodeId,
                role: n.role,
                health: <StateLabel state={n.health} />,
                trustClass: n.trustClass,
              }))}
              caption="Registered nodes"
            />
          )}
        </Card>
      </div>
    </div>
  );
}

const degradedSummaryColumns: ColumnDef[] = [
  { key: "category", header: "Category" },
  { key: "reason", header: "Reason Code" },
  { key: "subsystem", header: "Subsystem" },
  { key: "severity", header: "Severity" },
];

const nodeColumns: ColumnDef[] = [
  { key: "nodeId", header: "Node ID" },
  { key: "role", header: "Role" },
  { key: "health", header: "Health" },
  { key: "trustClass", header: "Trust Class" },
];

function severityToStatus(severity: string): "info" | "warning" | "error" | "critical" | "success" | "unknown" {
  const map: Record<string, "info" | "warning" | "error" | "critical" | "success" | "unknown"> = {
    info: "info",
    warning: "warning",
    error: "error",
    critical: "critical",
  };
  return map[severity] ?? "unknown";
}
