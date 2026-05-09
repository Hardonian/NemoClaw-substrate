import React from "react";
import type { DegradedState } from "../../data/types";
import { StateLabel } from "../primitives/state-label";
import { StatusBadge } from "../primitives/status-badge";
import { Timestamp } from "../primitives/timestamp";
import { EmptyState } from "../primitives/empty-state";
import { DataTable, type ColumnDef } from "../primitives/data-table";
import styles from "./degraded-inspector.module.css";

export interface DegradedInspectorProps {
  states: DegradedState[];
}

export function DegradedInspector({ states }: DegradedInspectorProps) {
  if (states.length === 0) {
    return <EmptyState title="No degraded states" description="All subsystems are operating normally." />;
  }

  const grouped = groupByCategory(states);

  return (
    <div className={styles.container}>
      <div className={styles.summary}>
        <span className={styles.count}>{states.length} degraded state(s)</span>
        <span className={styles.categories}>{Object.keys(grouped).length} category(ies)</span>
      </div>

      {Object.entries(grouped).map(([category, items]) => (
        <section key={category} className={styles.group} aria-labelledby={`category-${category}`}>
          <div className={styles.groupHeader}>
            <StateLabel state={category} />
            <span className={styles.groupCount}>{items.length}</span>
          </div>
          <div className={styles.groupContent}>
            <DataTable
              columns={degradedColumns}
              rows={items.map((d) => ({
                reasonCode: d.reasonCode,
                explanation: d.explanation,
                subsystem: d.affectedSubsystem,
                source: d.sourceComponent,
                severity: d.severity,
                timestamp: d.timestamp,
                recovery: d.recoverySuggestion ?? "None",
              }))}
              caption={`Degraded states: ${category}`}
            />
          </div>
        </section>
      ))}
    </div>
  );
}

const degradedColumns: ColumnDef[] = [
  { key: "reasonCode", header: "Reason Code" },
  { key: "explanation", header: "Explanation" },
  { key: "subsystem", header: "Subsystem" },
  { key: "severity", header: "Severity", render: (v) => <StatusBadge status={severityToStatus(String(v))} label={String(v)} /> },
  { key: "source", header: "Source" },
  { key: "timestamp", header: "Timestamp", render: (v) => <Timestamp value={String(v)} /> },
  { key: "recovery", header: "Recovery Suggestion" },
];

function groupByCategory(states: DegradedState[]): Record<string, DegradedState[]> {
  const groups: Record<string, DegradedState[]> = {};
  for (const s of states) {
    if (!groups[s.category]) groups[s.category] = [];
    groups[s.category].push(s);
  }
  return Object.fromEntries(Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)));
}

function severityToStatus(severity: string): "info" | "warning" | "error" | "critical" | "success" | "unknown" {
  const map: Record<string, "info" | "warning" | "error" | "critical" | "success" | "unknown"> = {
    info: "info",
    warning: "warning",
    error: "error",
    critical: "critical",
  };
  return map[severity] ?? "unknown";
}
