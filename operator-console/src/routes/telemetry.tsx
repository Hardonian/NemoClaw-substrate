import React from "react";
import type { LocalProbeSummary } from "../../data/types";
import { StateLabel } from "../../components/primitives/state-label";
import { StatusBadge } from "../../components/primitives/status-badge";
import { Timestamp } from "../../components/primitives/timestamp";
import { DataTable, type ColumnDef } from "../../components/primitives/data-table";
import { KVTable } from "../../components/primitives/key-value-table";
import { Card } from "../../components/primitives/card";
import styles from "./telemetry.module.css";

export interface TelemetryRouteProps {
  probeSummary: LocalProbeSummary;
}

export function TelemetryRoute({ probeSummary }: TelemetryRouteProps) {
  const { outcomes, telemetryAvailable, telemetry } = probeSummary;

  return (
    <div>
      <h2 className="page-title">Telemetry</h2>
      <p className="page-subtitle">Telemetry state panel showing probe outcomes and local runtime telemetry.</p>

      <div className={styles.grid}>
        <Card title="Telemetry Availability" status={telemetryAvailable ? "success" : "warning"}>
          <KVTable
            entries={[
              { key: "Available", value: telemetryAvailable ? "Yes" : "No" },
              { key: "Captured At", value: <Timestamp value={telemetry.capturedAt} /> },
              { key: "Runtime Health", value: <StateLabel state={telemetry.runtimeHealth.state} /> },
              { key: "Backend Version", value: telemetry.backendVersion.state === "observed" ? telemetry.backendVersion.value : telemetry.backendVersion.state },
              { key: "Model Inventory", value: telemetry.modelInventory.state === "observed" ? `${telemetry.modelInventory.value?.length ?? 0} model(s)` : telemetry.modelInventory.state },
              { key: "GPU State", value: <StateLabel state={telemetry.gpus.state} /> },
            ]}
          />
        </Card>

        <Card title="Probe Outcomes" subtitle={`${outcomes.length} probe(s)`}>
          {outcomes.length === 0 ? (
            <p className={styles.empty}>No probe outcomes.</p>
          ) : (
            <DataTable
              columns={probeColumns}
              rows={outcomes.map((o) => ({ probe: o.probe, state: <StateLabel state={o.state} />, detail: o.detail }))}
              caption="Probe outcomes"
            />
          )}
        </Card>
      </div>
    </div>
  );
}

const probeColumns: ColumnDef[] = [
  { key: "probe", header: "Probe" },
  { key: "state", header: "State" },
  { key: "detail", header: "Detail" },
];
