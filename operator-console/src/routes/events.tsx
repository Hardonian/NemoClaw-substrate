import React from "react";
import type { OperationalEvent } from "../data/types";
import { DataTable, type ColumnDef } from "../components/primitives/data-table";
import { Timestamp } from "../components/primitives/timestamp";
import { StateLabel } from "../components/primitives/state-label";
import { Card } from "../components/primitives/card";
import { useState } from "react";
import styles from "./route-common.module.css";

export interface EventsRouteProps {
  events: OperationalEvent[];
}

export function EventsRoute({ events }: EventsRouteProps) {
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const categories = [...new Set(events.map((e) => e.category))].sort();
  const filtered = filterCategory === "all" ? events : events.filter((e) => e.category === filterCategory);

  return (
    <div className={styles.routeContainer}>
      <h2 className={styles.pageTitle}>Operational Events</h2>
      <p className={styles.pageSubtitle}>All operational events in sequence order.</p>

      <div className={styles.filterBar}>
        <label htmlFor="category-filter" className={styles.filterLabel}>Filter by category:</label>
        <select
          id="category-filter"
          className={styles.filterSelect}
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="all">All ({events.length})</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat} ({events.filter((e) => e.category === cat).length})
            </option>
          ))}
        </select>
      </div>

      <Card title={`Events (${filtered.length})`} status="info">
        <DataTable
          columns={eventColumns}
          rows={filtered.map((e) => ({
            sequence: e.sequence,
            eventId: e.eventId,
            category: <StateLabel state="healthy" />,
            occurredAt: <Timestamp value={e.occurredAt} />,
            source: e.source,
            requestId: e.provenance.requestId ?? "Unknown",
            receiptId: e.provenance.receiptId ?? "Unknown",
          }))}
          caption="Operational events"
        />
      </Card>
    </div>
  );
}

const eventColumns: ColumnDef[] = [
  { key: "sequence", header: "Seq" },
  { key: "eventId", header: "Event ID" },
  { key: "category", header: "Category" },
  { key: "occurredAt", header: "Time" },
  { key: "source", header: "Source" },
  { key: "requestId", header: "Request ID" },
  { key: "receiptId", header: "Receipt ID" },
];
