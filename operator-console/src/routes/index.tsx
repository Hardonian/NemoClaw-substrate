import React from "react";
import type { SnapshotData } from "../../hooks/use-snapshot";
import { Card } from "../../components/primitives/card";
import { KVTable } from "../../components/primitives/key-value-table";
import { StateLabel } from "../../components/primitives/state-label";
import { StatusBadge } from "../../components/primitives/status-badge";
import { Timestamp } from "../../components/primitives/timestamp";
import { DataTable, type ColumnDef } from "../../components/primitives/data-table";
import styles from "./index.module.css";

export interface OverviewRouteProps {
  snapshot: SnapshotData;
}

export function OverviewRoute({ snapshot }: OverviewRouteProps) {
  const { degradedStates, receipts, events, workerTrustDecisions, nodes, policyOutcomes, telemetryCounts, staleNodes } = snapshot;

  const categoryCounts = countCategories(events);

  return (
    <div className={styles.container}>
      <h2 className={styles.pageTitle}>Overview</h2>
      <p className={styles.pageSubtitle}>Snapshot of all subsystem states. Data is deterministic and non-live.</p>

      <div className={styles.grid}>
        <Card title="Execution Receipts" subtitle={`${receipts.length} total`}>
          <KVTable
            entries={[
              { key: "Total", value: receipts.length },
              { key: "With Degraded Events", value: receipts.filter((r) => r.degradedEvents.length > 0).length },
              { key: "With Overrides", value: receipts.filter((r) => r.operatorOverrides.length > 0).length },
            ]}
          />
        </Card>

        <Card title="Degraded States" subtitle={`${degradedStates.length} total`}>
          <KVTable
            entries={countByCategory(degradedStates).map(([k, v]) => ({ key: k, value: v }))}
          />
        </Card>

        <Card title="Operational Events" subtitle={`${events.length} total`}>
          <KVTable
            entries={Object.entries(categoryCounts).map(([k, v]) => ({ key: k, value: v }))}
          />
        </Card>

        <Card title="Worker Trust" subtitle={`${workerTrustDecisions.length} decisions`}>
          {workerTrustDecisions.length === 0 ? (
            <p className={styles.empty}>No trust decisions.</p>
          ) : (
            <KVTable
              entries={workerTrustDecisions.map((d) => ({ key: d.workerId, value: <StateLabel state={d.trustLevel} /> }))}
            />
          )}
        </Card>

        <Card title="Policy Outcomes" status="info">
          <KVTable
            entries={Object.entries(policyOutcomes).map(([k, v]) => ({ key: k, value: v }))}
          />
        </Card>

        <Card title="Telemetry" status="info">
          <KVTable
            entries={Object.entries(telemetryCounts).map(([k, v]) => ({ key: k, value: v }))}
          />
        </Card>

        <Card title="Node Health" subtitle={`${nodes.length} nodes`}>
          <DataTable
            columns={nodeColumns}
            rows={nodes.map((n) => ({ nodeId: n.nodeId, role: n.role, health: <StateLabel state={n.health} />, heartbeat: <Timestamp value={n.lastHeartbeatAt} /> }))}
            caption="Registered nodes"
          />
        </Card>

        <Card title="Stale Nodes" status={staleNodes.length > 0 ? "error" : "success"} subtitle={staleNodes.length === 0 ? "None detected" : `${staleNodes.length} stale`}>
          {staleNodes.length === 0 ? (
            <p className={styles.empty}>All nodes are healthy.</p>
          ) : (
            <ul className={styles.list}>{staleNodes.map((s, idx) => (<li key={idx} className={styles.listItem}>{s}</li>))}</ul>
          )}
        </Card>
      </div>
    </div>
  );
}

const nodeColumns: ColumnDef[] = [
  { key: "nodeId", header: "Node" },
  { key: "role", header: "Role" },
  { key: "health", header: "Health" },
  { key: "heartbeat", header: "Last Heartbeat" },
];

function countCategories(events: Array<{ category: string }>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const e of events) { counts[e.category] = (counts[e.category] ?? 0) + 1; }
  return counts;
}

function countByCategory(states: Array<{ category: string }>): Array<[string, number]> {
  const counts: Record<string, number> = {};
  for (const s of states) { counts[s.category] = (counts[s.category] ?? 0) + 1; }
  return Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
}
