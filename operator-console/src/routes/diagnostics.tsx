import React from "react";
import { DiagnosticsSummaryPanel } from "../../components/panels/diagnostics-summary";

export interface DiagnosticsRouteProps {
  lines: string[];
}

export function DiagnosticsRoute({ lines }: DiagnosticsRouteProps) {
  return (
    <div>
      <h2 className="page-title">Diagnostics</h2>
      <p className="page-subtitle">Diagnostics summary panel showing system and routing diagnostic output.</p>
      <DiagnosticsSummaryPanel lines={lines} title="System Diagnostics" />
    </div>
  );
}
