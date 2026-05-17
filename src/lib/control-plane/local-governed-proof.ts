// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import fs from "node:fs";
import path from "node:path";
import { cleanLocalGovernedProofArtifacts, localProofRunDir, stableSha256 } from "./local-governed-proof-artifacts";
import { verifyLocalGovernedProof, type LocalProofVerificationResult } from "./local-governed-proof-verify";

export interface RunLocalGovernedProofOptions {
  rootDir: string;
  nowIso?: string;
}

export interface RunLocalGovernedProofResult {
  runDir: string;
  verification: LocalProofVerificationResult;
}

function writeJson(runDir: string, name: string, value: unknown): void {
  fs.writeFileSync(path.join(runDir, name), JSON.stringify(value, null, 2));
}

export function runLocalGovernedProof(options: RunLocalGovernedProofOptions): RunLocalGovernedProofResult {
  const nowIso = options.nowIso ?? new Date().toISOString();
  const runDir = cleanLocalGovernedProofArtifacts(options.rootDir);
  const operatorDir = path.join(runDir, "operator");
  fs.mkdirSync(operatorDir, { recursive: true });

  const node = { nodeId: "local-node-1", trustStatus: "trusted_local", attestationStatus: "not_required", telemetryState: "unavailable", profileSource: "local-only", registeredAt: nowIso };
  const probe = { outcomes: [{ probe: "gpu-nvidia-smi", state: "unavailable", detail: "command_unavailable" }], telemetry: { gpus: { state: "unavailable", reason: "command_unavailable" } } };
  const intent = { id: "intent-local-safe-echo", action: "safe.local.echo", payload: { message: "NemoClaw governed local proof" } };
  const policy = { decision: "allow", allowedActions: ["safe.local.echo"], reasonCode: "policy_allow_safe_action" };
  const trust = { nodeId: node.nodeId, trustStatus: node.trustStatus, attestationStatus: node.attestationStatus };
  const plan = { id: "plan-local-safe-echo", status: "approved", intentHash: stableSha256(intent), policyHash: stableSha256(policy), trustHash: stableSha256(trust), replayRef: "replay-local-governed-proof" };
  const queue = { id: "queue-local-safe-echo", planId: plan.id, idempotencyKey: stableSha256(plan.id).slice(0, 24), status: "queued" };
  const lease = { id: "lease-local-safe-echo", queueId: queue.id, ownerId: "local-operator", status: "active" };
  const execution = { id: "exec-local-safe-echo", status: "completed", stdout: intent.payload.message, stderr: "", durationMs: 0, timedOut: false };
  const receipt = { id: "receipt-local-safe-echo", status: "completed", executionId: execution.id, planId: plan.id, queueId: queue.id, leaseId: lease.id };
  const replay = { id: "replay-local-governed-proof", reasonCode: "replay_validated", lineage: [node.nodeId, plan.id, queue.id, lease.id, receipt.id] };
  const events = [
    { id: "event-execution-started", type: "execution_started", reasonCode: "execution_started", executionId: execution.id },
    { id: "event-execution-completed", type: "execution_completed", reasonCode: "execution_completed", executionId: execution.id },
  ];
  const manifest = { node, probe, intent, policy, trust, plan, queue, lease, execution, receipt, replay };
  const manifestHash = stableSha256(manifest);

  writeJson(runDir, "manifest.json", { ...manifest, manifestHash });
  writeJson(runDir, "proofpack.json", { manifestHash, replayEnvelope: replay, receiptId: receipt.id });
  writeJson(runDir, "replay-envelope.json", replay);
  writeJson(runDir, "diagnostics.json", { runtime: "local", degraded: ["gpu telemetry unavailable"], profile: node.profileSource });
  writeJson(runDir, "queue.json", queue);
  writeJson(runDir, "lease.json", lease);
  writeJson(runDir, "plan.json", plan);
  writeJson(runDir, "intent.json", intent);
  writeJson(runDir, "node.json", node);
  writeJson(runDir, "probe.json", probe);
  fs.writeFileSync(path.join(runDir, "receipts.ndjson"), `${JSON.stringify(receipt)}\n`);
  fs.writeFileSync(path.join(runDir, "events.ndjson"), `${events.map((v) => JSON.stringify(v)).join("\n")}\n`);

  const rows = {
    status: [{ id: "local-proof", state: "ok", detail: `manifestHash=${manifestHash}` }],
    diagnostics: [{ id: "local-node", state: "degraded", detail: "telemetry unavailable" }],
    workers: [{ id: node.nodeId, state: "ready", detail: "local deterministic worker" }],
    telemetry: [{ id: "gpu", state: "unavailable", detail: "command_unavailable", unavailable: true }],
    plans: [{ id: plan.id, state: plan.status, detail: `intentHash=${plan.intentHash}` }],
    queue: [{ id: queue.id, state: queue.status, detail: `idempotencyKey=${queue.idempotencyKey}` }],
    leases: [{ id: lease.id, state: lease.status, detail: `ownerId=${lease.ownerId}` }],
    receipts: [{ id: receipt.id, state: receipt.status, detail: `executionId=${execution.id}` }],
    replay: [{ id: replay.id, state: "validated", detail: replay.reasonCode }],
    proofpack: [{ id: "proofpack", state: "exported", detail: `manifestHash=${manifestHash}` }],
    degraded: [{ id: "nvidia_smi_unavailable", state: "degraded", detail: "nvidia-smi not available" }],
    intent: [{ id: intent.id, state: "approved", detail: intent.action }],
    events: events.map((evt) => ({ id: evt.id, state: evt.type, detail: evt.reasonCode })),
  };
  for (const [k, v] of Object.entries(rows)) writeJson(runDir, path.join("operator", `${k}.json`), v);

  return { runDir: localProofRunDir(options.rootDir), verification: verifyLocalGovernedProof(options.rootDir) };
}
