import React from "react";
import type { OperationalEvent } from "../../data/types";
import { StatusBadge } from "../../components/primitives/status-badge";
import { Timestamp } from "../../components/primitives/timestamp";
import { DataTable, type ColumnDef } from "../../components/primitives/data-table";
import { EmptyState } from "../../components/primitives/empty-state";

export interface EventsRouteProps {
  events: OperationalEvent[];
}

export function EventsRoute({ events }: EventsRouteProps) {
  return (
    <div>
      <h2 className="page-title">Events</h2>
      <p className="page-subtitle">Operational event viewer showing the complete event log.</p>
      {events.length === 0 ? (
        <EmptyState title="No events" description="No operational events have been recorded." />
      ) : (
        <DataTable columns={eventColumns} rows={events.map((e) => ({ sequence: e.sequence, eventId: e.eventId, category: <StatusBadge status={categoryToStatus(e.category)} label={e.category} />, occurredAt: <Timestamp value={e.occurredAt} />, source: e.source, requestId: e.provenance.requestId ?? "N/A" }))} caption="Operational events" />
      )}
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
];

function categoryToStatus(category: string): "info" | "warning" | "error" | "critical" | "success" | "unknown" {
  if (category.startsWith("telemetry")) return "info";
  if (category === "degraded_state") return "warning";
  if (category === "fallback") return "warning";
  if (category === "operator_override") return "error";
  return "info";
}
