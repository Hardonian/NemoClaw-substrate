import React from "react";
import type { ExecutionReceipt } from "../data/types";
import { ReceiptViewer } from "../viewers/receipt-viewer";
import styles from "./route-common.module.css";

export interface ReceiptsRouteProps {
  receipts: ExecutionReceipt[];
}

export function ReceiptsRoute({ receipts }: ReceiptsRouteProps) {
  return (
    <div className={styles.routeContainer}>
      <h2 className={styles.pageTitle}>Receipts</h2>
      <p className={styles.pageSubtitle}>Detailed view of all execution receipts.</p>
      {receipts.length === 0 ? (
        <p className={styles.empty}>No receipts available.</p>
      ) : (
        <div className={styles.list}>
          {receipts.map((receipt) => (
            <ReceiptViewer key={receipt.receiptId} receipt={receipt} />
          ))}
        </div>
      )}
    </div>
  );
}
