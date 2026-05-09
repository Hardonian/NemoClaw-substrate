import React from "react";
import type { ExecutionReceipt } from "../data/types";
import { ExecutionPlanViewer } from "../components/viewers/execution-plan-viewer";

export interface ExecutionPlansRouteProps {
  receipts: ExecutionReceipt[];
}

export function ExecutionPlansRoute({ receipts }: ExecutionPlansRouteProps) {
  return (
    <div>
      <h2 className="pageTitle">Execution Plans</h2>
      <p className="pageSubtitle">Execution plan lineage across all receipts.</p>
      <ExecutionPlanViewer receipts={receipts} />
    </div>
  );
}
