import React from "react";
import type { ReplayEnvelope } from "../data/types";
import { validateReplayEnvelope } from "../data/types";
import { StatusBadge } from "../primitives/status-badge";
import { Timestamp } from "../primitives/timestamp";
import { DataTable, type ColumnDef } from "../primitives/data-table";
import { EmptyState } from "../primitives/empty-state";
import styles from "./replay-viewer.module.css";

export interface ReplayViewerProps {
  envelope: ReplayEnvelope;
}

export function ReplayViewer({ envelope }: ReplayViewerProps) {
  const validation = validateReplayEnvelope(envelope);
  const hasErrors = !validation.ok;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <h3 className={styles.title}>Replay Envelope</h3>
          <StatusBadge status={hasErrors ? "error" : "success"} label={hasErrors ? "Validation Failed" : "Valid"} />
        </div>
        <p className={styles.subtitle}>
          Version {envelope.version} — Exported <Timestamp value={envelope.exportedAt} /> — {envelope.eventCount} event(s)
        </p>
      </div>

      {hasErrors && (
        <section className={styles.validationErrors} role="alert" aria-label="Validation errors">
          <h4>Validation Failures</h4>
          <ul className={styles.errorList}>
            {validation.reasons.map((reason, idx) => (
              <li key={idx} className={styles.errorItem}>{reason}</li>
            ))}
          </ul>
        </section>
      )}

      <section className={styles.section} aria-labelledby="digest-heading">
        <h4 id="digest-heading">Digest</h4>
        <pre className={styles.digest}><code>{envelope.digest}</code></pre>
      </section>

      <section className={styles.section} aria-labelledby="events-heading">
        <h4 id="events-heading">Events {envelope.events.length > 0 && <span className={styles.eventCount}>({envelope.events.length})</span>}</h4>
        {envelope.events.length === 0 ? (
          <EmptyState title="No events" description="This envelope contains no operational events." />
        ) : (
          <DataTable columns={eventColumns} rows={envelope.events.map((e) => ({ sequence: e.sequence, eventId: e.eventId, category: e.category, occurredAt: e.occurredAt, source: e.source }))} caption="Events in replay envelope" />
        )}
      </section>
    </div>
  );
}

const eventColumns: ColumnDef[] = [
  { key: "sequence", header: "Seq" },
  { key: "eventId", header: "Event ID" },
  { key: "category", header: "Category" },
  { key: "occurredAt", header: "Time", render: (v) => <Timestamp value={String(v)} /> },
  { key: "source", header: "Source" },
];
