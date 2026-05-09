import React, { useState, useEffect, useCallback } from "react";
import { Shell } from "./components/layout/shell";
import { OverviewRoute } from "./routes";
import { ExecutionPlansRoute } from "./routes/execution-plans";
import { ReceiptsRoute } from "./routes/receipts";
import { ReplayValidationRoute } from "./routes/replay-validation";
import { DegradedStatesRoute } from "./routes/degraded-states";
import { TrustAttestationRoute } from "./routes/trust-attestation";
import { RoutingDecisionsRoute } from "./routes/routing-decisions";
import { EventsRoute } from "./routes/events";
import { DiagnosticsRoute } from "./routes/diagnostics";
import { TelemetryRoute } from "./routes/telemetry";
import { useSnapshot } from "./hooks/use-snapshot";

export function App() {
  const [hash, setHash] = useState(() => window.location.hash.replace("#", ""));
  const snapshot = useSnapshot();

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash.replace("#", ""));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = useCallback((newHash: string) => {
    window.location.hash = newHash;
    setHash(newHash);
  }, []);

  const renderRoute = () => {
    switch (hash) {
      case "execution-plans":
        return <ExecutionPlansRoute receipts={snapshot.receipts} />;
      case "receipts":
        return <ReceiptsRoute receipts={snapshot.receipts} />;
      case "replay-validation":
        return <ReplayValidationRoute valid={snapshot.validReplayEnvelope} empty={snapshot.emptyReplayEnvelope} invalid={snapshot.invalidReplayEnvelope} />;
      case "degraded-states":
        return <DegradedStatesRoute states={snapshot.degradedStates} />;
      case "trust-attestation":
        return <TrustAttestationRoute decisions={snapshot.workerTrustDecisions} attestations={snapshot.workerAttestations} identities={snapshot.workerIdentities} />;
      case "routing-decisions":
        return <RoutingDecisionsRoute result={snapshot.routingResult} />;
      case "events":
        return <EventsRoute events={snapshot.events} />;
      case "diagnostics":
        return <DiagnosticsRoute receipts={snapshot.receipts} nodes={snapshot.nodes} />;
      case "telemetry":
        return <TelemetryRoute probeSummary={snapshot.probeSummary} telemetryCounts={snapshot.telemetryCounts} />;
      default:
        return <OverviewRoute snapshot={snapshot} />;
    }
  };

  return (
    <Shell currentHash={hash} onNavigate={navigate}>
      {renderRoute()}
    </Shell>
  );
}
