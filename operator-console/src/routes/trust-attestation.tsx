import React from "react";
import type { WorkerTrustDecision, WorkerCapabilityAttestation, WorkerIdentity } from "../../data/types";
import { TrustInspector } from "../../components/viewers/trust-inspector";

export interface TrustAttestationRouteProps {
  decisions: WorkerTrustDecision[];
  attestations: WorkerCapabilityAttestation[];
  identities: WorkerIdentity[];
}

export function TrustAttestationRoute({ decisions, attestations, identities }: TrustAttestationRouteProps) {
  return (
    <div>
      <h2 className="page-title">Trust &amp; Attestation</h2>
      <p className="page-subtitle">Worker trust decisions, capability attestations, and identity information.</p>
      <TrustInspector decisions={decisions} attestations={attestations} identities={identities} />
    </div>
  );
}
