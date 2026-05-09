// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import {
  createEvidenceBundle,
  type EvidenceBundle,
  exportEvidenceNdjson,
  exportReplayEvidencePackage,
  verifyEvidenceBundle,
} from "./evidence-bundles";
import {
  applyExecutionAuthorization,
  approveExecutionPlan,
  createExecutionPlan,
  createExecutionPolicySnapshot,
  createExecutionTrustSnapshot,
  type ExecutionApproval,
  type ExecutionPlan,
  executionLineageFromPlan,
  validateExecutionAuthorization,
} from "./execution-plans";
import { buildEventsFromReceipt, type OperationalEvent, OperationalMemoryLog } from "./operational-memory";
import { buildReplayEnvelope, type ReplayEnvelope } from "./replay";
import type { DegradedState, ExecutionReceipt } from "./types";

const now = "2026-05-09T12:00:00.000Z";
const later = "2026-05-09T12:00:01.000Z";

function baseDegradedState(): DegradedState {
  return {
    category: "degraded",
    reason: "worker heartbeat stale",
    affectedSubsystem: "worker-registry",
    severity: "warning",
    reasonCode: "heartbeat_stale",
    explanation: "worker heartbeat exceeded freshness window",
    sourceComponent: "test",
    timestamp: now,
  };
}

function basePlan(): { plan: ExecutionPlan; approval: ExecutionApproval } {
  const policy = {
    decision: "approval_required" as const,
    allowed: true,
    requiredApproval: true,
    reasonCode: "policy_rule_approval_required" as const,
    sourceRuleId: "policy:test",
    matchedRuleIds: ["policy:test"],
  };
  const intent = {
    requestId: "request-1",
    actor: "operator",
    action: "worker:execute",
    command: "echo deterministic",
    model: "model-a",
    targetNodeId: "worker-a",
    executionMode: "remote" as const,
    metadata: { purpose: "test" },
  };
  const policySnapshot = createExecutionPolicySnapshot({
    capturedAt: now,
    governedRoutingEnabled: true,
    heterogeneousRoutingEnabled: true,
    remoteExecutionEnabled: true,
    policy,
    fallbackPermitted: false,
    executionMode: "remote",
    workerTrustLevel: "trusted_remote",
    workerAttestationStatus: "operator_approved",
    selectedCandidateClass: "remote_worker",
  });
  const trustSnapshot = createExecutionTrustSnapshot({
    capturedAt: now,
    node: {
      version: "1",
      nodeId: "worker-a",
      role: "remote",
      transport: "https",
      endpoint: "https://worker.example.test",
      trustClass: "trusted",
      registeredAt: now,
      lastHeartbeatAt: now,
      health: "healthy",
      metadata: {},
      capabilities: {
        version: "1",
        capturedAt: now,
        source: "test",
        runtimeBackend: "vllm",
        executionMode: "remote",
        gpus: [],
        models: [],
        policyTags: [],
        reliabilityTags: [],
        runtimeTags: [],
        transportRequirements: [],
      },
      workerTrustLevel: "trusted_remote",
      workerAttestationStatus: "operator_approved",
      workerTrustReasonCodes: ["operator_approved"],
    },
  });
  const plan = createExecutionPlan({ intent, policySnapshot, trustSnapshot, createdAt: now, actor: "operator" });
  return approveExecutionPlan(plan, { actor: "operator", approvedAt: later, reason: "approved for test" });
}

function evidenceFixture(): {
  plan: ExecutionPlan;
  approval: ExecutionApproval;
  receipt: ExecutionReceipt;
  events: OperationalEvent[];
  replayEnvelope: ReplayEnvelope;
} {
  const approved = basePlan();
  const authorization = validateExecutionAuthorization({
    nowIso: later,
    plan: approved.plan,
    approval: approved.approval,
  });
  const plan = applyExecutionAuthorization(approved.plan, authorization);
  const receipt: ExecutionReceipt = {
    version: "1",
    receiptId: "receipt-1",
    requestId: "request-1",
    createdAt: later,
    phases: [
      { phase: "received", at: now },
      { phase: "completed", at: later },
    ],
    nodeId: "worker-a",
    modelId: "model-a",
    policyDecision: {
      allowed: true,
      requiredApproval: true,
      reasons: [{ code: "policy_rule_approval_required", explanation: "approval required", source: "policy:test" }],
    },
    degradedEvents: [baseDegradedState()],
    fallbackAttempts: [],
    toolInvocations: [],
    timing: { totalMs: 1 },
    provenance: {
      source: "test",
      lineage: ["execution-plan", plan.planId],
      replayVersion: "1",
      exportedAt: later,
    },
    executionLineage: executionLineageFromPlan(plan, approved.approval, authorization),
    operatorOverrides: [],
  };
  const log = new OperationalMemoryLog();
  const receiptEvents = buildEventsFromReceipt(receipt, "test", log);
  log.append({
    occurredAt: later,
    category: "telemetry_probe_succeeded",
    source: "test",
    provenance: { requestId: "request-1", receiptId: receipt.receiptId },
    replayRef: { lineage: ["telemetry", receipt.receiptId], replayVersion: "1" },
    payload: { confidence: "high", sourceRuntime: "vllm" },
  });
  log.append({
    occurredAt: later,
    category: "capability_attestation_observed",
    source: "test",
    provenance: { requestId: "request-1", receiptId: receipt.receiptId },
    replayRef: { lineage: ["trust", "worker-a"], replayVersion: "1" },
    payload: { workerId: "worker-a", attestationStatus: "operator_approved" },
  });
  const events = [...receiptEvents, ...log.list().slice(receiptEvents.length)];
  return {
    plan,
    approval: approved.approval,
    receipt,
    events,
    replayEnvelope: buildReplayEnvelope(log.list(), later),
  };
}

function packageInput(fixture = evidenceFixture()) {
  return {
    executionPlans: [fixture.plan],
    approvals: [fixture.approval],
    receipts: [fixture.receipt],
    replayEnvelopes: [fixture.replayEnvelope],
    operationalEvents: fixture.events,
    trustEvidence: [{ attestationId: "attestation-1", workerId: "worker-a", capturedAt: now, lineage: ["trust", "worker-a"] }],
    diagnosticsSnapshots: [{ snapshotId: "diag-1", capturedAt: now, source: "test", lineage: ["diagnostics", "request-1"], status: "ok" }],
  };
}

describe("evidence bundle exports", () => {
  it("produces a deterministic bundle hash for stable evidence", () => {
    const fixture = evidenceFixture();
    const options = { bundleId: "bundle-1", exportedAt: later, source: "test" };
    const first = createEvidenceBundle(packageInput(fixture), options);
    const second = createEvidenceBundle(
      {
        ...packageInput(fixture),
        operationalEvents: [...fixture.events].reverse(),
      },
      options,
    );
    expect(first.manifest.bundleHash).toBe(second.manifest.bundleHash);
    expect(verifyEvidenceBundle(first)).toEqual({ ok: true, reasons: [] });
  });

  it("keeps NDJSON export ordering stable across input permutations", () => {
    const fixture = evidenceFixture();
    const options = { bundleId: "bundle-order", exportedAt: later, source: "test" };
    const first = createEvidenceBundle(packageInput(fixture), options);
    const second = createEvidenceBundle(
      {
        ...packageInput(fixture),
        approvals: [fixture.approval],
        operationalEvents: [...fixture.events].reverse(),
      },
      options,
    );
    expect(exportEvidenceNdjson(first)).toBe(exportEvidenceNdjson(second));
  });

  it("fails validation when receipt lineage is missing", () => {
    const fixture = evidenceFixture();
    const receipt = { ...fixture.receipt, provenance: { ...fixture.receipt.provenance, lineage: [] } };
    const bundle = createEvidenceBundle({ ...packageInput(fixture), receipts: [receipt] }, { bundleId: "bundle-missing-lineage", exportedAt: later, source: "test" });
    expect(verifyEvidenceBundle(bundle).reasons).toContain("missing_lineage");
  });

  it("exports a replay evidence package with all audit artifact kinds", () => {
    const fixture = evidenceFixture();
    const out = exportReplayEvidencePackage(packageInput(fixture), { bundleId: "bundle-replay", exportedAt: later, source: "test" });
    expect(verifyEvidenceBundle(out.bundle)).toEqual({ ok: true, reasons: [] });
    expect(JSON.parse(out.json).manifest.bundleHash).toBe(out.bundle.manifest.bundleHash);
    expect(out.ndjson.trim().split("\n")).toHaveLength(out.bundle.artifacts.length + 1);
    expect(new Set(out.bundle.artifacts.map((artifact) => artifact.kind))).toEqual(
      new Set([
        "execution_plan",
        "approval_lineage",
        "receipt",
        "replay_envelope",
        "operational_event",
        "telemetry_evidence",
        "trust_attestation_evidence",
        "degraded_state_evidence",
        "diagnostics_snapshot",
      ]),
    );
  });

  it("redacts secrets before hashing or exporting evidence", () => {
    const fixture = evidenceFixture();
    const eventWithSecret: OperationalEvent = {
      eventId: "manual-secret-event",
      sequence: 99,
      occurredAt: later,
      category: "diagnostics_snapshot",
      source: "test",
      provenance: { requestId: "request-1" },
      replayRef: { lineage: ["diagnostics", "request-1"], replayVersion: "1" },
      payload: {
        apiKey: "NVIDIA_API_KEY=abc123-super-secret",
        nested: { authorization: "Bearer abc123-super-secret" },
      },
    };
    const bundle = createEvidenceBundle(
      {
        ...packageInput(fixture),
        operationalEvents: [...fixture.events, eventWithSecret],
      },
      { bundleId: "bundle-redacted", exportedAt: later, source: "test" },
    );
    const exported = exportEvidenceNdjson(bundle);
    expect(exported).not.toContain("abc123-super-secret");
    expect(exported).toContain("<REDACTED>");
  });

  it("rejects malformed or tampered bundles", () => {
    expect(verifyEvidenceBundle({ nope: true })).toEqual({ ok: false, reasons: ["malformed_bundle"] });
    const bundle = createEvidenceBundle(packageInput(), { bundleId: "bundle-tampered", exportedAt: later, source: "test" });
    const tampered = JSON.parse(JSON.stringify(bundle)) as EvidenceBundle;
    tampered.artifacts[0].payload = { tampered: true };
    expect(verifyEvidenceBundle(tampered).reasons).toContain("artifact_hash_mismatch");
  });
});
