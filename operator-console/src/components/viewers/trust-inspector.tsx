import React from "react";
import type { WorkerTrustDecision, WorkerCapabilityAttestation, WorkerIdentity } from "../data/types";
import { StateLabel } from "../primitives/state-label";
import { StatusBadge } from "../primitives/status-badge";
import { Timestamp } from "../primitives/timestamp";
import { DataTable, type ColumnDef } from "../primitives/data-table";
import { KVTable } from "../primitives/key-value-table";
import { EmptyState } from "../primitives/empty-state";
import styles from "./trust-inspector.module.css";

export interface TrustInspectorProps {
  decisions: WorkerTrustDecision[];
  attestations: WorkerCapabilityAttestation[];
  identities: WorkerIdentity[];
}

export function TrustInspector({ decisions, attestations, identities }: TrustInspectorProps) {
  return (
    <div className={styles.container}>
      <section className={styles.section} aria-labelledby="trust-heading">
        <h4 id="trust-heading">Worker Trust Decisions ({decisions.length})</h4>
        {decisions.length === 0 ? (
          <EmptyState title="No trust decisions" description="No worker trust decisions have been recorded." />
        ) : (
          <DataTable columns={trustColumns} rows={trustRows(decisions)} caption="Worker trust decisions" />
        )}
      </section>

      <section className={styles.section} aria-labelledby="attestations-heading">
        <h4 id="attestations-heading">Worker Attestations ({attestations.length})</h4>
        {attestations.length === 0 ? (
          <EmptyState title="No attestations" description="No worker capability attestations have been recorded." />
        ) : (
          attestations.map((att) => (
            <div key={att.attestationId} className={styles.attestationCard}>
              <div className={styles.attestationHeader}>
                <code className={styles.workerId}>{att.workerId}</code>
                <StateLabel state={att.status} />
                {att.stale && <StatusBadge status="warning" label="Stale" />}
                {att.conflict && <StatusBadge status="error" label="Conflict" />}
              </div>
              <KVTable entries={[
                { key: "Attestation ID", value: att.attestationId },
                { key: "Source", value: att.source },
                { key: "Last Attested", value: att.lastAttestedAt ? <Timestamp value={att.lastAttestedAt} /> : "Unknown" },
                { key: "Stale", value: att.stale ? "Yes" : "No" },
                { key: "Conflict", value: att.conflict ? "Yes" : "No" },
                { key: "Reason Codes", value: att.reasonCodes.length > 0 ? att.reasonCodes.map((c) => c.replace(/_/g, " ")).join(", ") : "None" },
                { key: "Source Reference", value: att.provenance.sourceRef },
                { key: "Claim IDs", value: att.provenance.claimIds.length > 0 ? att.provenance.claimIds.join(", ") : "None" },
              ]} />
            </div>
          ))
        )}
      </section>

      <section className={styles.section} aria-labelledby="identities-heading">
        <h4 id="identities-heading">Worker Identities ({identities.length})</h4>
        {identities.length === 0 ? (
          <EmptyState title="No worker identities" description="No worker identities have been observed." />
        ) : (
          <DataTable columns={identityColumns} rows={identityRows(identities)} caption="Worker identities" />
        )}
      </section>
    </div>
  );
}

const trustColumns: ColumnDef[] = [
  { key: "workerId", header: "Worker" },
  { key: "trustLevel", header: "Trust Level", render: (v) => <StateLabel state={String(v)} /> },
  { key: "eligibleForRemoteExecution", header: "Remote Exec.", render: (v) => v === true ? "Yes" : "No" },
  { key: "attestationStatus", header: "Attestation", render: (v) => <StateLabel state={String(v)} /> },
  { key: "reasonCodes", header: "Reason Codes", render: (v) => (v as string[]).map((c) => c.replace(/_/g, " ")).join(", ") },
  { key: "decidedAt", header: "Decided At", render: (v) => <Timestamp value={String(v)} /> },
];

const identityColumns: ColumnDef[] = [
  { key: "workerId", header: "Worker ID" },
  { key: "safeLabel", header: "Label" },
  { key: "provider", header: "Provider" },
  { key: "endpoint", header: "Endpoint" },
];

function trustRows(decisions: WorkerTrustDecision[]): Record<string, unknown>[] {
  return decisions.map((d) => ({
    workerId: d.workerId,
    trustLevel: d.trustLevel,
    eligibleForRemoteExecution: d.eligibleForRemoteExecution,
    attestationStatus: d.attestationStatus,
    reasonCodes: d.reasonCodes,
    decidedAt: d.decidedAt,
  }));
}

function identityRows(identities: WorkerIdentity[]): Record<string, unknown>[] {
  return identities.map((i) => ({
    workerId: i.workerId,
    safeLabel: i.safeLabel,
    provider: i.provider ?? "Unknown",
    endpoint: i.endpoint ?? "Unknown",
  }));
}
