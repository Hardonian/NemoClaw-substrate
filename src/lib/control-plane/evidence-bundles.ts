// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";

import { redactFull } from "../security/redact";
import type { ExecutionApproval, ExecutionPlan } from "./execution-plans";
import {
  hashExecutionIntent,
  hashExecutionPolicySnapshot,
  hashExecutionTrustSnapshot,
} from "./execution-plans";
import type { OperationalEvent } from "./operational-memory";
import type { ReplayEnvelope } from "./replay";
import { validateReplayEnvelope } from "./replay";
import { deterministicSerialize } from "./serde";
import type { DegradedState, ExecutionReceipt } from "./types";

export type EvidenceArtifactKind =
  | "execution_plan"
  | "approval_lineage"
  | "receipt"
  | "replay_envelope"
  | "operational_event"
  | "telemetry_evidence"
  | "trust_attestation_evidence"
  | "degraded_state_evidence"
  | "diagnostics_snapshot";

export interface EvidenceArtifact {
  version: "1";
  artifactId: string;
  kind: EvidenceArtifactKind;
  createdAt: string;
  source: string;
  lineage: string[];
  contentHash: string;
  payload: unknown;
}

export interface EvidenceManifestArtifact {
  artifactId: string;
  kind: EvidenceArtifactKind;
  contentHash: string;
  lineageHash: string;
}

export interface EvidenceManifest {
  version: "1";
  bundleId: string;
  exportedAt: string;
  source: string;
  artifactCount: number;
  artifactHashes: EvidenceManifestArtifact[];
  formats: Array<"json" | "ndjson">;
  deterministicOrdering: "kind-createdAt-source-artifactId";
  redaction: "full";
  bundleHash: string;
}

export interface EvidenceBundle {
  version: "1";
  bundleId: string;
  exportedAt: string;
  source: string;
  manifest: EvidenceManifest;
  artifacts: EvidenceArtifact[];
}

export interface EvidenceExportOptions {
  bundleId?: string;
  exportedAt?: string;
  source?: string;
  formats?: Array<"json" | "ndjson">;
  redactSecrets?: boolean;
}

export interface EvidenceBundleInput {
  executionPlans?: ExecutionPlan[];
  approvals?: ExecutionApproval[];
  receipts?: ExecutionReceipt[];
  replayEnvelopes?: ReplayEnvelope[];
  operationalEvents?: OperationalEvent[];
  telemetryEvidence?: unknown[];
  trustEvidence?: unknown[];
  degradedStates?: DegradedState[];
  diagnosticsSnapshots?: unknown[];
}

export interface ReplayEvidencePackage {
  bundle: EvidenceBundle;
  json: string;
  ndjson: string;
}

interface ArtifactDraft {
  kind: EvidenceArtifactKind;
  createdAt: string;
  source: string;
  lineage: string[];
  payload: unknown;
}

const KIND_ORDER: Record<EvidenceArtifactKind, number> = {
  execution_plan: 0,
  approval_lineage: 1,
  receipt: 2,
  replay_envelope: 3,
  operational_event: 4,
  telemetry_evidence: 5,
  trust_attestation_evidence: 6,
  degraded_state_evidence: 7,
  diagnostics_snapshot: 8,
};

const TELEMETRY_EVENT_PREFIXES = ["telemetry_"];
const TRUST_EVENT_KINDS = new Set([
  "worker_identity_observed",
  "capability_claim_recorded",
  "capability_attestation_observed",
  "capability_attestation_conflict",
  "worker_trust_elevated",
  "worker_trust_denied",
  "worker_trust_revoked",
  "worker_attestation_expired",
]);

const SENSITIVE_KEY = /(^|[-_])(?:api[-_]?key|auth|authorization|bearer|credential|password|private[-_]?key|secret|session|signature|token)([-_]|$)/i;

function sha256(value: unknown): string {
  return `sha256-${createHash("sha256").update(deterministicSerialize(value) ?? "undefined").digest("base64url")}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function sanitizeEvidence(value: unknown, redactSecrets: boolean): unknown {
  if (!redactSecrets) return value;
  if (Array.isArray(value)) return value.map((item) => sanitizeEvidence(item, redactSecrets));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY.test(key) ? "<REDACTED>" : sanitizeEvidence(nested, redactSecrets);
    }
    return out;
  }
  if (typeof value === "string") return redactFull(value);
  return value;
}

function uniqueSorted(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value?.trim())))].sort();
}

function evidenceTime(value: unknown, fallback: string): string {
  const record = asRecord(value);
  return String(
    record?.["createdAt"] ??
      record?.["occurredAt"] ??
      record?.["capturedAt"] ??
      record?.["timestamp"] ??
      record?.["exportedAt"] ??
      record?.["decidedAt"] ??
      fallback,
  );
}

function evidenceSource(value: unknown, fallback: string): string {
  const record = asRecord(value);
  return String(record?.["source"] ?? record?.["sourceComponent"] ?? record?.["authorizationSource"] ?? fallback);
}

function lineageFromGeneric(value: unknown): string[] {
  const record = asRecord(value);
  const lineage = record?.["lineage"];
  if (Array.isArray(lineage)) return uniqueSorted(lineage.map((item) => String(item)));
  return uniqueSorted([
    String(record?.["snapshotId"] ?? ""),
    String(record?.["diagnosticsId"] ?? ""),
    String(record?.["workerId"] ?? ""),
    String(record?.["attestationId"] ?? ""),
    String(record?.["claimId"] ?? ""),
    String(record?.["receiptId"] ?? ""),
    String(record?.["requestId"] ?? ""),
    String(record?.["sourceRef"] ?? ""),
  ]);
}

function lineageFromReceipt(receipt: ExecutionReceipt): string[] {
  return uniqueSorted([
    ...receipt.provenance.lineage,
    receipt.executionLineage?.executionPlanId,
    receipt.executionLineage?.executionApprovalId,
    receipt.executionLineage?.authorizationLineageId,
    receipt.executionLineage?.replayReferenceId,
  ]);
}

function lineageFromEvent(event: OperationalEvent): string[] {
  return uniqueSorted(event.replayRef?.lineage ?? []);
}

function lineageFromDegraded(state: DegradedState): string[] {
  return uniqueSorted([state.sourceComponent, state.affectedSubsystem, state.reasonCode, state.timestamp]);
}

function addDraft(drafts: ArtifactDraft[], draft: ArtifactDraft): void {
  drafts.push({
    ...draft,
    lineage: uniqueSorted(draft.lineage),
  });
}

function draftArtifacts(input: EvidenceBundleInput, options: Required<EvidenceExportOptions>): ArtifactDraft[] {
  const drafts: ArtifactDraft[] = [];
  for (const plan of input.executionPlans ?? []) {
    addDraft(drafts, {
      kind: "execution_plan",
      createdAt: plan.createdAt,
      source: "execution-plans",
      lineage: [plan.planId, ...plan.replayReference.lineage, plan.replayReference.replayReferenceId],
      payload: plan,
    });
    for (const approval of plan.approvals) {
      addDraft(drafts, {
        kind: "approval_lineage",
        createdAt: approval.decidedAt,
        source: "execution-plans",
        lineage: [approval.planId, approval.approvalId, approval.intentHash, approval.policySnapshotHash, approval.trustSnapshotHash],
        payload: approval,
      });
    }
  }
  for (const approval of input.approvals ?? []) {
    addDraft(drafts, {
      kind: "approval_lineage",
      createdAt: approval.decidedAt,
      source: "execution-plans",
      lineage: [approval.planId, approval.approvalId, approval.intentHash, approval.policySnapshotHash, approval.trustSnapshotHash],
      payload: approval,
    });
  }
  for (const receipt of input.receipts ?? []) {
    addDraft(drafts, {
      kind: "receipt",
      createdAt: receipt.createdAt,
      source: receipt.provenance.source,
      lineage: lineageFromReceipt(receipt),
      payload: receipt,
    });
    for (const degraded of receipt.degradedEvents) {
      addDraft(drafts, {
        kind: "degraded_state_evidence",
        createdAt: degraded.timestamp,
        source: degraded.sourceComponent,
        lineage: [...lineageFromReceipt(receipt), ...lineageFromDegraded(degraded)],
        payload: degraded,
      });
    }
  }
  for (const envelope of input.replayEnvelopes ?? []) {
    addDraft(drafts, {
      kind: "replay_envelope",
      createdAt: envelope.exportedAt,
      source: "replay",
      lineage: uniqueSorted([envelope.digest, ...envelope.events.flatMap((event) => event.replayRef?.lineage ?? [])]),
      payload: envelope,
    });
  }
  for (const event of input.operationalEvents ?? []) {
    addDraft(drafts, {
      kind: "operational_event",
      createdAt: event.occurredAt,
      source: event.source,
      lineage: lineageFromEvent(event),
      payload: event,
    });
    if (TELEMETRY_EVENT_PREFIXES.some((prefix) => event.category.startsWith(prefix))) {
      addDraft(drafts, {
        kind: "telemetry_evidence",
        createdAt: event.occurredAt,
        source: event.source,
        lineage: lineageFromEvent(event),
        payload: event,
      });
    }
    if (TRUST_EVENT_KINDS.has(event.category)) {
      addDraft(drafts, {
        kind: "trust_attestation_evidence",
        createdAt: event.occurredAt,
        source: event.source,
        lineage: lineageFromEvent(event),
        payload: event,
      });
    }
    if (event.category === "degraded_state") {
      const degraded = (event.payload as { degraded?: DegradedState }).degraded;
      addDraft(drafts, {
        kind: "degraded_state_evidence",
        createdAt: event.occurredAt,
        source: event.source,
        lineage: lineageFromEvent(event),
        payload: degraded ?? event,
      });
    }
  }
  for (const telemetry of input.telemetryEvidence ?? []) {
    addDraft(drafts, {
      kind: "telemetry_evidence",
      createdAt: evidenceTime(telemetry, options.exportedAt),
      source: evidenceSource(telemetry, options.source),
      lineage: lineageFromGeneric(telemetry),
      payload: telemetry,
    });
  }
  for (const trust of input.trustEvidence ?? []) {
    addDraft(drafts, {
      kind: "trust_attestation_evidence",
      createdAt: evidenceTime(trust, options.exportedAt),
      source: evidenceSource(trust, options.source),
      lineage: lineageFromGeneric(trust),
      payload: trust,
    });
  }
  for (const degraded of input.degradedStates ?? []) {
    addDraft(drafts, {
      kind: "degraded_state_evidence",
      createdAt: degraded.timestamp,
      source: degraded.sourceComponent,
      lineage: lineageFromDegraded(degraded),
      payload: degraded,
    });
  }
  for (const diagnostics of input.diagnosticsSnapshots ?? []) {
    addDraft(drafts, {
      kind: "diagnostics_snapshot",
      createdAt: evidenceTime(diagnostics, options.exportedAt),
      source: evidenceSource(diagnostics, options.source),
      lineage: lineageFromGeneric(diagnostics),
      payload: diagnostics,
    });
  }
  return drafts;
}

function sortArtifacts(artifacts: EvidenceArtifact[]): EvidenceArtifact[] {
  return [...artifacts].sort(
    (a, b) =>
      (KIND_ORDER[a.kind] ?? 999) - (KIND_ORDER[b.kind] ?? 999) ||
      a.createdAt.localeCompare(b.createdAt) ||
      a.source.localeCompare(b.source) ||
      a.artifactId.localeCompare(b.artifactId),
  );
}

function manifestSeed(bundle: Omit<EvidenceManifest, "bundleHash">): unknown {
  return {
    artifactCount: bundle.artifactCount,
    artifactHashes: bundle.artifactHashes,
    bundleId: bundle.bundleId,
    deterministicOrdering: bundle.deterministicOrdering,
    exportedAt: bundle.exportedAt,
    formats: bundle.formats,
    redaction: bundle.redaction,
    source: bundle.source,
    version: bundle.version,
  };
}

function createManifest(input: {
  bundleId: string;
  exportedAt: string;
  source: string;
  formats: Array<"json" | "ndjson">;
  artifacts: EvidenceArtifact[];
}): EvidenceManifest {
  const withoutHash: Omit<EvidenceManifest, "bundleHash"> = {
    version: "1",
    bundleId: input.bundleId,
    exportedAt: input.exportedAt,
    source: input.source,
    artifactCount: input.artifacts.length,
    artifactHashes: input.artifacts.map((artifact) => ({
      artifactId: artifact.artifactId,
      kind: artifact.kind,
      contentHash: artifact.contentHash,
      lineageHash: sha256(artifact.lineage),
    })),
    formats: input.formats,
    deterministicOrdering: "kind-createdAt-source-artifactId",
    redaction: "full",
  };
  return { ...withoutHash, bundleHash: sha256(manifestSeed(withoutHash)) };
}

function materializeArtifact(draft: ArtifactDraft, redactSecrets: boolean): EvidenceArtifact {
  const payload = sanitizeEvidence(draft.payload, redactSecrets);
  const contentHash = sha256(payload);
  return {
    version: "1",
    artifactId: `${draft.kind}-${contentHash.slice("sha256-".length, "sha256-".length + 24)}`,
    kind: draft.kind,
    createdAt: draft.createdAt,
    source: draft.source,
    lineage: draft.lineage,
    contentHash,
    payload,
  };
}

export function createEvidenceBundle(input: EvidenceBundleInput, options: EvidenceExportOptions = {}): EvidenceBundle {
  const resolved: Required<EvidenceExportOptions> = {
    bundleId: options.bundleId ?? "",
    exportedAt: options.exportedAt ?? new Date().toISOString(),
    source: options.source ?? "nemoclaw-control-plane",
    formats: options.formats ?? ["json", "ndjson"],
    redactSecrets: options.redactSecrets ?? true,
  };
  const drafts = draftArtifacts(input, resolved);
  const deduped = new Map<string, EvidenceArtifact>();
  for (const artifact of drafts.map((draft) => materializeArtifact(draft, resolved.redactSecrets))) {
    deduped.set(`${artifact.kind}:${artifact.artifactId}`, artifact);
  }
  const artifacts = sortArtifacts([...deduped.values()]);
  const bundleSeed = {
    artifactHashes: artifacts.map((artifact) => ({ kind: artifact.kind, contentHash: artifact.contentHash })),
    exportedAt: resolved.exportedAt,
    source: resolved.source,
  };
  const bundleId = resolved.bundleId || `evidence-${sha256(bundleSeed).slice("sha256-".length, "sha256-".length + 24)}`;
  const manifest = createManifest({
    bundleId,
    exportedAt: resolved.exportedAt,
    source: resolved.source,
    formats: [...resolved.formats].sort(),
    artifacts,
  });
  return { version: "1", bundleId, exportedAt: resolved.exportedAt, source: resolved.source, manifest, artifacts };
}

export function exportEvidenceNdjson(bundle: EvidenceBundle): string {
  const lines = [
    { type: "manifest", manifest: bundle.manifest },
    ...sortArtifacts(bundle.artifacts).map((artifact) => ({ type: "artifact", artifact })),
  ];
  return `${lines.map((line) => deterministicSerialize(line)).join("\n")}\n`;
}

export function exportReplayEvidencePackage(input: EvidenceBundleInput, options: EvidenceExportOptions = {}): ReplayEvidencePackage {
  const bundle = createEvidenceBundle(input, options);
  return {
    bundle,
    json: deterministicSerialize(bundle),
    ndjson: exportEvidenceNdjson(bundle),
  };
}

export function verifyEvidenceBundle(candidate: unknown): { ok: boolean; reasons: string[] } {
  const reasons = new Set<string>();
  const bundle = asRecord(candidate);
  if (!bundle) return { ok: false, reasons: ["malformed_bundle"] };
  if (bundle["version"] !== "1") reasons.add("unsupported_bundle_version");
  const artifacts = Array.isArray(bundle["artifacts"]) ? (bundle["artifacts"] as EvidenceArtifact[]) : null;
  const manifest = asRecord(bundle["manifest"]) as EvidenceManifest | null;
  if (!artifacts || !manifest) return { ok: false, reasons: ["malformed_bundle"] };
  const sorted = sortArtifacts(artifacts);
  if (deterministicSerialize(sorted.map((artifact) => artifact.artifactId)) !== deterministicSerialize(artifacts.map((artifact) => artifact.artifactId))) {
    reasons.add("artifact_order_mismatch");
  }
  for (const artifact of artifacts) {
    if (!artifact || artifact.version !== "1" || !artifact.kind || !artifact.artifactId || !artifact.contentHash) {
      reasons.add("malformed_artifact");
      continue;
    }
    if (!Object.hasOwn(KIND_ORDER, artifact.kind)) reasons.add("unknown_artifact_kind");
    if (!Array.isArray(artifact.lineage) || artifact.lineage.length === 0) reasons.add("missing_lineage");
    if (sha256(artifact.payload) !== artifact.contentHash) reasons.add("artifact_hash_mismatch");
    if (artifact.kind === "execution_plan") {
      const plan = artifact.payload as ExecutionPlan;
      if (!asRecord(plan) || !plan.intent || !plan.policySnapshot || !plan.trustSnapshot) {
        reasons.add("malformed_artifact");
        continue;
      }
      if (!plan.replayReference?.lineage?.length) reasons.add("missing_lineage");
      try {
        if (hashExecutionIntent(plan.intent) !== plan.intentHash) reasons.add("execution_intent_mismatch");
        if (hashExecutionPolicySnapshot(plan.policySnapshot) !== plan.policySnapshotHash) reasons.add("policy_snapshot_mismatch");
        if (hashExecutionTrustSnapshot(plan.trustSnapshot) !== plan.trustSnapshotHash) reasons.add("trust_snapshot_mismatch");
      } catch {
        reasons.add("malformed_artifact");
      }
    }
    if (artifact.kind === "approval_lineage") {
      const approval = artifact.payload as ExecutionApproval;
      if (!approval.planId || !approval.approvalId || !approval.intentHash || !approval.policySnapshotHash || !approval.trustSnapshotHash) {
        reasons.add("missing_approval_lineage");
      }
    }
    if (artifact.kind === "receipt") {
      const receipt = artifact.payload as ExecutionReceipt;
      if (!receipt.provenance?.lineage?.length) reasons.add("missing_lineage");
      const lineage = receipt.executionLineage;
      if (lineage) {
        if (!lineage.executionPlanId) reasons.add("missing_execution_plan_lineage");
        if (!lineage.executionIntentHash) reasons.add("execution_intent_mismatch");
        if (!lineage.executionPolicySnapshotHash) reasons.add("policy_snapshot_mismatch");
        if (!lineage.executionTrustSnapshotHash) reasons.add("trust_snapshot_mismatch");
        if (!lineage.replayReferenceId) reasons.add("missing_replay_lineage");
      }
    }
    if (artifact.kind === "replay_envelope") {
      for (const reason of validateReplayEnvelope(artifact.payload as ReplayEnvelope).reasons) reasons.add(reason);
    }
  }
  const expectedManifest = createManifest({
    bundleId: String(bundle["bundleId"] ?? ""),
    exportedAt: String(bundle["exportedAt"] ?? ""),
    source: String(bundle["source"] ?? ""),
    formats: manifest.formats,
    artifacts,
  });
  if (manifest.artifactCount !== artifacts.length) reasons.add("artifact_count_mismatch");
  if (deterministicSerialize(manifest.artifactHashes) !== deterministicSerialize(expectedManifest.artifactHashes)) {
    reasons.add("manifest_artifact_hash_mismatch");
  }
  if (manifest.bundleHash !== expectedManifest.bundleHash) reasons.add("bundle_hash_mismatch");
  return { ok: reasons.size === 0, reasons: [...reasons].sort() };
}
