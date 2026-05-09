import React from "react";
import type { WorkerTrustDecision, WorkerCapabilityAttestation, WorkerIdentity } from "../data/types";
import { TrustInspector } from "../viewers/trust-inspector";

export interface TrustAttestationRouteProps {
  decisions: WorkerTrustDecision[];
  attestations: WorkerCapabilityAttestation[];
  identities: WorkerIdentity[];
}

export function TrustAttestationRoute({ decisions, attestations, identities }: TrustAttestationRouteProps) {
  return (
    <div>
      <h2 className="pageTitle">Trust & Attestation</h2>
      <p className="pageSubtitle">Worker trust decisions, capability attestations, and identity records.</p>
      <TrustInspector decisions={decisions} attestations={attestations} identities={identities} />
    </div>
  );
}
