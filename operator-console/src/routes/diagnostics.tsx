import React from "react";
import type { ExecutionReceipt, NodeDescriptor } from "../data/types";
import { DiagnosticsSummaryPanel } from "../panels/diagnostics-summary";
import { Card } from "../primitives/card";
import styles from "./route-common.module.css";

export interface DiagnosticsRouteProps {
  receipts: ExecutionReceipt[];
  nodes: NodeDescriptor[];
}

export function DiagnosticsRoute({ receipts, nodes }: DiagnosticsRouteProps) {
  const sampleDiagLines = [
    `Local probes: 4`,
    `Probe degraded states: none`,
    `Registered nodes: ${nodes.length}`,
    `Telemetry availability: available`,
    `GPU telemetry: observed`,
    `Runtime metadata: version=observed, models=observed`,
    `Telemetry source: local`,
    `Parser confidence: observed`,
    `Model inventory count: 1`,
    `GPU metadata: known`,
    `Registry update: applied (reason=observed_local_probe)`,
    `Observed at: 2026-05-09T00:00:00.000Z`,
    `Governed routing: enabled (env)`,
    `Dry-run result: allow`,
  ];

  return (
    <div className={styles.routeContainer}>
      <h2 className={styles.pageTitle}>Diagnostics</h2>
      <p className={styles.pageSubtitle}>System diagnostics summary and local probe output.</p>

      <Card title="Local Diagnostics Summary" status="info">
        <DiagnosticsSummaryPanel lines={sampleDiagLines} title="Local Diagnostics" />
      </Card>

      <Card title="Receipt Count" subtitle={`${receipts.length} receipt(s)`} status="info">
        <p className={styles.detail}>Total receipts in snapshot: {receipts.length}</p>
      </Card>

      <Card title="Node Registry" subtitle={`${nodes.length} node(s)`} status={nodes.some((n) => n.health !== "healthy") ? "warning" : "success"}>
        <p className={styles.detail}>Healthy: {nodes.filter((n) => n.health === "healthy").length}</p>
        <p className={styles.detail}>Stale: {nodes.filter((n) => n.health === "stale").length}</p>
        <p className={styles.detail}>Unreachable: {nodes.filter((n) => n.health === "unreachable").length}</p>
        <p className={styles.detail}>Unknown: {nodes.filter((n) => n.health === "unknown").length}</p>
      </Card>
    </div>
  );
}
