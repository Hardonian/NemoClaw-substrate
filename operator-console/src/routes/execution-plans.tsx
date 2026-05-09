import React from "react";
import type { ExecutionReceipt } from "../../data/types";
import { ExecutionPlanViewer } from "../../components/viewers/execution-plan-viewer";

export interface ExecutionPlansRouteProps {
  receipts: ExecutionReceipt[];
}

export function ExecutionPlansRoute({ receipts }: ExecutionPlansRouteProps) {
  return (
    <div>
      <h2 className="page-title">Execution Plans</h2>
      <p className="page-subtitle">Execution plan lineage viewer showing all receipts with their phases, decisions, and provenance.</p>
      <ExecutionPlanViewer receipts={receipts} />
    </div>
  );
}
