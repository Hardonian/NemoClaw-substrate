import React from "react";
import type { ExecutionReceipt } from "../data/types";
import { Timestamp } from "../primitives/timestamp";
import { DataTable, type ColumnDef } from "../primitives/data-table";
import { EmptyState } from "../primitives/empty-state";
import styles from "./approval-lineage.module.css";

export interface ApprovalLineageProps {
  receipts: ExecutionReceipt[];
}

export function ApprovalLineagePanel({ receipts }: ApprovalLineageProps) {
  const overrides: Array<{ requestId: string; receiptId: string; actor: string; at: string; reason: string }> = [];
  for (const r of receipts) {
    for (const o of r.operatorOverrides) {
      overrides.push({ requestId: r.requestId, receiptId: r.receiptId, actor: o.actor, at: o.at, reason: o.reason });
    }
  }

  if (overrides.length === 0) {
    return <EmptyState title="No operator overrides" description="No approval overrides have been recorded across any receipts." />;
  }

  return (
    <div className={styles.container}>
      <p className={styles.count}>{overrides.length} override(s) found</p>
      <DataTable columns={overrideColumns} rows={overrides} caption="Operator approval overrides" />
    </div>
  );
}

const overrideColumns: ColumnDef[] = [
  { key: "actor", header: "Actor" },
  { key: "requestId", header: "Request ID" },
  { key: "receiptId", header: "Receipt ID" },
  { key: "at", header: "Time", render: (v) => <Timestamp value={String(v)} /> },
  { key: "reason", header: "Reason" },
];
