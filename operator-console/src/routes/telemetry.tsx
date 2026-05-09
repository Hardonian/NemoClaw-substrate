import React from "react";
import type { LocalProbeSummary } from "../data/types";
import { StateLabel } from "../primitives/state-label";
import { DataTable, type ColumnDef } from "../primitives/data-table";
import { Timestamp } from "../primitives/timestamp";
import { Card } from "../primitives/card";
import { KVTable } from "../primitives/key-value-table";
import styles from "./route-common.module.css";

export interface TelemetryRouteProps {
  probeSummary: LocalProbeSummary;
  telemetryCounts: Record<string, number>;
}

export function TelemetryRoute({ probeSummary, telemetryCounts }: TelemetryRouteProps) {
  return (
    <div className={styles.routeContainer}>
      <h2 className={styles.pageTitle}>Telemetry</h2>
      <p className={styles.pageSubtitle}>Local probe outcomes and telemetry event state.</p>

      <Card title="Telemetry Availability" status={probeSummary.telemetryAvailable ? "success" : "error"}>
        <KVTable entries={[
          { key: "Available", value: probeSummary.telemetryAvailable ? "Yes" : "No" },
          { key: "Captured At", value: <Timestamp value={probeSummary.telemetry.capturedAt} /> },
          { key: "Runtime Health", value: <StateLabel state={probeSummary.telemetry.runtimeHealth.state} /> },
          { key: "Backend Version", value: <StateLabel state={probeSummary.telemetry.backendVersion.state} /> },
          { key: "Model Inventory", value: <StateLabel state={probeSummary.telemetry.modelInventory.state} /> },
          { key: "GPU State", value: <StateLabel state={probeSummary.telemetry.gpus.state} /> },
        ]} />
      </Card>

      <Card title="Probe Outcomes" subtitle={`${probeSummary.outcomes.length} probe(s)`} status="info">
        <DataTable
          columns={probeColumns}
          rows={probeSummary.outcomes.map((o) => ({
            probe: o.probe,
            state: <StateLabel state={o.state} />,
            detail: o.detail,
          }))}
          caption="Local probe outcomes"
        />
      </Card>

      <Card title="Telemetry Event Counts" subtitle={`${Object.keys(telemetryCounts).length} categories`} status="info">
        {Object.keys(telemetryCounts).length === 0 ? (
          <p className={styles.empty}>No telemetry events recorded.</p>
        ) : (
          <KVTable
            entries={Object.entries(telemetryCounts).map(([k, v]) => ({ key: k, value: v }))}
          />
        )}
      </Card>
    </div>
  );
}

const probeColumns: ColumnDef[] = [
  { key: "probe", header: "Probe" },
  { key: "state", header: "State" },
  { key: "detail", header: "Detail" },
];
