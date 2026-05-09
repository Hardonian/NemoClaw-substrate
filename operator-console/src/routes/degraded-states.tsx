import React from "react";
import type { DegradedState } from "../../data/types";
import { DegradedInspector } from "../../components/viewers/degraded-inspector";

export interface DegradedStatesRouteProps {
  states: DegradedState[];
}

export function DegradedStatesRoute({ states }: DegradedStatesRouteProps) {
  return (
    <div>
      <h2 className="page-title">Degraded States</h2>
      <p className="page-subtitle">Degraded state inspector grouped by category with severity, reason codes, and recovery suggestions.</p>
      <DegradedInspector states={states} />
    </div>
  );
}
