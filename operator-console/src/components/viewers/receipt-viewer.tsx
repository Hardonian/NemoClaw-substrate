import React from "react";
import type { ExecutionReceipt, DegradedState, SchedulingDecision, PolicyDecision } from "../data/types";
import { StateLabel } from "../primitives/state-label";
import { StatusBadge } from "../primitives/status-badge";
import { Timestamp } from "../primitives/timestamp";
import { Timeline } from "../primitives/timeline";
import { KVTable } from "../primitives/key-value-table";
import { DataTable, type ColumnDef } from "../primitives/data-table";
import styles from "./receipt-viewer.module.css";

export interface ReceiptViewerProps {
  receipt: ExecutionReceipt;
}

export function ReceiptViewer({ receipt }: ReceiptViewerProps) {
  const timelineItems = receipt.phases.map((phase) => ({
    timestamp: phase.at,
    label: phase.phase,
    status: phaseStatus(phase.phase),
    detail: phase.notes,
  }));

  const severityStatus = severityToStatus(highestSeverity(receipt.degradedEvents));

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <h3 className={styles.receiptId} id={`receipt-${receipt.receiptId}`}>
            Receipt: {receipt.receiptId}
          </h3>
          {severityStatus && <StatusBadge status={severityStatus} label={severityStatus} />}
        </div>
        <div className={styles.metaRow}>
          <span>Request: <code>{receipt.requestId}</code></span>
          <span>Created: <Timestamp value={receipt.createdAt} /></span>
          {receipt.nodeId && <span>Node: <code>{receipt.nodeId}</code></span>}
          {receipt.modelId && <span>Model: <code>{receipt.modelId}</code></span>}
        </div>
      </div>

      <section className={styles.section} aria-labelledby="phases-heading">
        <h4 id="phases-heading">Execution Phases</h4>
        <Timeline items={timelineItems} />
      </section>

      {receipt.schedulingDecision && (
        <section className={styles.section} aria-labelledby="scheduling-heading">
          <h4 id="scheduling-heading">Scheduling Decision</h4>
          <KVTable entries={schedulingEntries(receipt.schedulingDecision)} />
        </section>
      )}

      {receipt.policyDecision && (
        <section className={styles.section} aria-labelledby="policy-heading">
          <h4 id="policy-heading">Policy Decision</h4>
          <KVTable entries={policyEntries(receipt.policyDecision)} />
        </section>
      )}

      {receipt.degradedEvents.length > 0 && (
        <section className={styles.section} aria-labelledby="degraded-heading">
          <h4 id="degraded-heading">Degraded Events ({receipt.degradedEvents.length})</h4>
          <div className={styles.degradedList}>
            {receipt.degradedEvents.map((d, idx) => (
              <div key={idx} className={styles.degradedItem}>
                <div className={styles.degradedHeader}>
                  <StateLabel state={d.category} />
                  <StatusBadge status={severityToStatus(d.severity)} label={d.severity} />
                  <code className={styles.reasonCode}>{d.reasonCode}</code>
                </div>
                <p className={styles.degradedExplanation}>{d.explanation}</p>
                <div className={styles.degradedMeta}>
                  <span>Subsystem: {d.affectedSubsystem}</span>
                  <span>Source: {d.sourceComponent}</span>
                  <Timestamp value={d.timestamp} />
                </div>
                {d.recoverySuggestion && (
                  <p className={styles.recovery}>Recovery: {d.recoverySuggestion}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {receipt.fallbackAttempts.length > 0 && (
        <section className={styles.section} aria-labelledby="fallback-heading">
          <h4 id="fallback-heading">Fallback Attempts ({receipt.fallbackAttempts.length})</h4>
          <DataTable
            columns={fallbackColumns}
            rows={receipt.fallbackAttempts.map((f) => ({ at: f.at, reason: f.reason, target: f.target ?? "" }))}
            caption="Fallback attempts"
          />
        </section>
      )}

      {receipt.toolInvocations.length > 0 && (
        <section className={styles.section} aria-labelledby="tools-heading">
          <h4 id="tools-heading">Tool Invocations ({receipt.toolInvocations.length})</h4>
          <DataTable
            columns={toolColumns}
            rows={receipt.toolInvocations.map((t) => ({ name: t.name, at: t.at, durationMs: t.durationMs ?? "N/A", status: t.status }))}
            caption="Tool invocations"
          />
        </section>
      )}

      <section className={styles.section} aria-labelledby="timing-heading">
        <h4 id="timing-heading">Timing</h4>
        <KVTable
          entries={[
            { key: "Total", value: formatMs(receipt.timing.totalMs) },
            { key: "Queue", value: formatMs(receipt.timing.queueMs) },
            { key: "Execution", value: formatMs(receipt.timing.executionMs) },
          ]}
        />
      </section>

      <section className={styles.section} aria-labelledby="provenance-heading">
        <h4 id="provenance-heading">Provenance</h4>
        <KVTable
          entries={[
            { key: "Source", value: receipt.provenance.source },
            { key: "Lineage", value: receipt.provenance.lineage.join(" → ") },
            { key: "Replay Version", value: receipt.provenance.replayVersion },
            ...(receipt.provenance.exportedAt ? [{ key: "Exported At", value: <Timestamp value={receipt.provenance.exportedAt} /> }] : []),
          ]}
        />
      </section>

      {receipt.operatorOverrides.length > 0 && (
        <section className={styles.section} aria-labelledby="overrides-heading">
          <h4 id="overrides-heading">Operator Overrides ({receipt.operatorOverrides.length})</h4>
          <div className={styles.overrideList}>
            {receipt.operatorOverrides.map((o, idx) => (
              <div key={idx} className={styles.overrideItem}>
                <span className={styles.overrideActor}>{o.actor}</span>
                <Timestamp value={o.at} />
                <p className={styles.overrideReason}>{o.reason}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

const fallbackColumns: ColumnDef[] = [
  { key: "at", header: "Time", render: (v) => <Timestamp value={String(v)} /> },
  { key: "reason", header: "Reason" },
  { key: "target", header: "Target" },
];

const toolColumns: ColumnDef[] = [
  { key: "name", header: "Tool" },
  { key: "at", header: "Time", render: (v) => <Timestamp value={String(v)} /> },
  { key: "durationMs", header: "Duration (ms)" },
  { key: "status", header: "Status", render: (v) => <StateLabel state={String(v)} /> },
];

function phaseStatus(phase: string): string {
  const map: Record<string, string> = {
    received: "healthy",
    policy: "healthy",
    scheduling: "healthy",
    execution: "constrained",
    completed: "healthy",
    failed: "unavailable",
  };
  return map[phase] ?? "unknown";
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

function highestSeverity(events: DegradedState[]): string {
  const order = ["critical", "error", "warning", "info"];
  for (const level of order) {
    if (events.some((e) => e.severity === level)) return level;
  }
  return "info";
}

function formatMs(ms: number | undefined): string {
  if (ms === undefined) return "Unavailable";
  return `${ms} ms`;
}

function schedulingEntries(decision: SchedulingDecision): Array<{ key: string; value: React.ReactNode }> {
  const entries: Array<{ key: string; value: React.ReactNode }> = [];
  if (decision.selected) {
    entries.push({ key: "Selected", value: `${decision.selected.nodeId} : ${decision.selected.modelId} (score: ${decision.selected.score})` });
    if (decision.selected.reasons.length > 0) {
      entries.push({ key: "Reason", value: decision.selected.reasons.map((r) => r.code).join(", ") });
    }
  } else {
    entries.push({ key: "Selected", value: "None" });
  }
  if (decision.rejected.length > 0) {
    entries.push({ key: "Rejected", value: `${decision.rejected.length} candidate(s)` });
  }
  entries.push({ key: "Decision Reasons", value: decision.reasons.map((r) => r.code).join(", ") });
  return entries;
}

function policyEntries(decision: PolicyDecision): Array<{ key: string; value: React.ReactNode }> {
  return [
    { key: "Allowed", value: decision.allowed ? "Yes" : "No" },
    { key: "Approval Required", value: decision.requiredApproval ? "Yes" : "No" },
    { key: "Reasons", value: decision.reasons.map((r) => r.code).join(", ") },
  ];
}
