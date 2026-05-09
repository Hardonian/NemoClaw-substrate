import React from "react";
import type { ReplayEnvelope } from "../../data/types";
import { ReplayViewer } from "../../components/viewers/replay-viewer";

export interface ReplayValidationRouteProps {
  validEnvelope: ReplayEnvelope;
  emptyEnvelope: ReplayEnvelope;
}

export function ReplayValidationRoute({ validEnvelope, emptyEnvelope }: ReplayValidationRouteProps) {
  return (
    <div>
      <h2 className="page-title">Replay Validation</h2>
      <p className="page-subtitle">Replay envelope validation viewer showing integrity verification results.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <ReplayViewer envelope={validEnvelope} />
        <ReplayViewer envelope={emptyEnvelope} />
      </div>
    </div>
  );
}
