import React from "react";
import type { DegradedState } from "../data/types";
import { DegradedInspector } from "../components/viewers/degraded-inspector";

export interface DegradedStatesRouteProps {
  states: DegradedState[];
}

export function DegradedStatesRoute({ states }: DegradedStatesRouteProps) {
  return (
    <div>
      <h2 className="pageTitle">Degraded States</h2>
      <p className="pageSubtitle">Inspection of all degraded subsystem states with severity and recovery suggestions.</p>
      <DegradedInspector states={states} />
    </div>
  );
}
