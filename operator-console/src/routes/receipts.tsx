import React from "react";
import type { ExecutionReceipt } from "../../data/types";
import { ReceiptViewer } from "../../components/viewers/receipt-viewer";

export interface ReceiptsRouteProps {
  receipts: ExecutionReceipt[];
}

export function ReceiptsRoute({ receipts }: ReceiptsRouteProps) {
  return (
    <div>
      <h2 className="page-title">Receipts</h2>
      <p className="page-subtitle">Individual receipt viewer showing detailed execution records.</p>
      {receipts.map((receipt) => (
        <div key={receipt.receiptId} style={{ marginBottom: "1.5rem" }}>
          <ReceiptViewer receipt={receipt} />
        </div>
      ))}
    </div>
  );
}
