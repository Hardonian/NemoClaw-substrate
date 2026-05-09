import React, { useState, useEffect } from "react";
import { Shell } from "./components/layout/shell";
import { OverviewRoute } from "./routes/index";
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

function getHash(): string {
  return window.location.hash.replace("#", "");
}

export function App() {
  const [hash, setHash] = useState(getHash);
  const snapshot = useSnapshot();

  useEffect(() => {
    const onHashChange = () => setHash(getHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = (newHash: string) => {
    window.location.hash = newHash;
    setHash(newHash);
  };

  const renderRoute = () => {
    switch (hash) {
      case "execution-plans":
        return <ExecutionPlansRoute receipts={snapshot.receipts} />;
      case "receipts":
        return <ReceiptsRoute receipts={snapshot.receipts} />;
      case "replay-validation":
        return <ReplayValidationRoute validEnvelope={snapshot.validReplayEnvelope} emptyEnvelope={snapshot.emptyReplayEnvelope} />;
      case "degraded-states":
        return <DegradedStatesRoute states={snapshot.degradedStates} />;
      case "trust-attestation":
        return <TrustAttestationRoute decisions={snapshot.workerTrustDecisions} attestations={snapshot.workerAttestations} identities={snapshot.workerIdentities} />;
      case "routing-decisions":
        return <RoutingDecisionsRoute result={snapshot.routingResult} diagnostics={snapshot.routingDiagnostics} />;
      case "events":
        return <EventsRoute events={snapshot.events} />;
      case "diagnostics":
        return <DiagnosticsRoute lines={snapshot.routingDiagnostics} />;
      case "telemetry":
        return <TelemetryRoute probeSummary={snapshot.probeSummary} />;
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
