import React from "react";
import type { ExecutionReceipt } from "../data/types";
import { ReceiptViewer } from "./receipt-viewer";
import styles from "./execution-plan-viewer.module.css";

export interface ExecutionPlanViewerProps {
  receipts: ExecutionReceipt[];
}

export function ExecutionPlanViewer({ receipts }: ExecutionPlanViewerProps) {
  if (receipts.length === 0) {
    return <div className={styles.empty}><p>No execution plans available.</p></div>;
  }
  return (
    <div className={styles.container}>
      <div className={styles.summary}>
        <p className={styles.count}>{receipts.length} execution plan(s)</p>
        <p className={styles.lineage}>Unique request IDs: {new Set(receipts.map((r) => r.requestId)).size}</p>
      </div>
      <div className={styles.list}>
        {receipts.map((receipt) => (
          <ReceiptViewer key={receipt.receiptId} receipt={receipt} />
        ))}
      </div>
    </div>
  );
}
