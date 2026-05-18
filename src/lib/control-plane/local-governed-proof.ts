// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import fs from "node:fs";
import path from "node:path";
import {
  cleanLocalGovernedProofArtifacts,
  localProofRunDir,
  stableSha256,
} from "./local-governed-proof-artifacts";
import { enqueueExecution, acquireLease } from "./execution-queue-store";
import { applyExecutionTransition, createTransitionEvent, createTransitionReceipt, type ExecutionState } from "./execution-state-machine";
import { verifyLocalGovernedProof, type LocalProofVerificationResult } from "./local-governed-proof-verify";
import { verifyProofpack } from "./proofpack-validator";

export interface RunLocalGovernedProofOptions { rootDir: string; nowIso?: string; seed?: string; profile?: string; }
export interface RunLocalGovernedProofResult { runDir: string; verification: LocalProofVerificationResult; proofpackOk: boolean; }

function writeJson(runDir: string, name: string, value: unknown): void { fs.writeFileSync(path.join(runDir, name), JSON.stringify(value, null, 2)); }

export function runLocalGovernedProof(options: RunLocalGovernedProofOptions): RunLocalGovernedProofResult {
  const nowIso = options.nowIso ?? new Date().toISOString();
  const seed = options.seed ?? "nemoclaw-local-seed";
  const profile = options.profile ?? "local-only";
  const runDir = cleanLocalGovernedProofArtifacts(options.rootDir);
  const operatorDir = path.join(runDir, "operator");
  fs.mkdirSync(operatorDir, { recursive: true });

  const node = { nodeId: "local-node-1", trustStatus: "trusted_local", attestationStatus: "not_required", telemetryState: "unavailable", profileSource: profile, registeredAt: nowIso, seed };
  const intent = { id: "intent-local-safe-echo", action: "safe.local.echo", payload: { message: "NemoClaw governed local proof" } };
  const policy = { decision: "allow", allowedActions: ["safe.local.echo"], reasonCode: "policy_allow_safe_action" };
  const trust = { nodeId: node.nodeId, trustStatus: node.trustStatus, attestationStatus: node.attestationStatus };
  const plan = { id: "plan-local-safe-echo", status: "approved", intentHash: stableSha256(intent), policyHash: stableSha256(policy), trustHash: stableSha256(trust), replayRef: "replay-local-governed-proof" };
  const queue = enqueueExecution(runDir, { id: "queue-local-safe-echo", planId: plan.id, idempotencyKey: stableSha256(plan.id).slice(0,24), status: "queued" });
  const lease = acquireLease(runDir, { id: "lease-local-safe-echo", queueId: queue.id, ownerId: "local-operator", status: "active" });

  const states: ExecutionState[] = ["observed"];
  const transitions = [
    applyExecutionTransition(states.at(-1)!, { to: "planned", reasonCode: "plan_approved", atIso: nowIso, lineageId: plan.id }),
    applyExecutionTransition("planned", { to: "queued", reasonCode: "enqueued", atIso: nowIso, lineageId: queue.id }),
    applyExecutionTransition("queued", { to: "leased", reasonCode: "lease_acquired", atIso: nowIso, lineageId: lease.id }),
    applyExecutionTransition("leased", { to: "executing", reasonCode: "execution_started", atIso: nowIso, lineageId: "exec-local-safe-echo" }),
    applyExecutionTransition("executing", { to: "completed", reasonCode: "execution_completed", atIso: nowIso, lineageId: "exec-local-safe-echo" }),
    applyExecutionTransition("completed", { to: "replay_valid", reasonCode: "replay_validated", atIso: nowIso, lineageId: "exec-local-safe-echo" }),
    applyExecutionTransition("replay_valid", { to: "proofpack_exported", reasonCode: "proofpack_exported", atIso: nowIso, lineageId: "exec-local-safe-echo" }),
  ];

  const events = transitions.map(createTransitionEvent);
  const receipts = transitions.map(createTransitionReceipt);

  const replay = { id: "replay-local-governed-proof", reasonCode: "replay_validated", lineage: [node.nodeId, plan.id, queue.id, lease.id, "exec-local-safe-echo"] };
  const manifest = { node, intent, policy, trust, plan, queue, lease, replay, profile };
  const manifestHash = stableSha256(manifest);

  writeJson(runDir, "manifest.json", { ...manifest, manifestHash });
  writeJson(runDir, "proofpack.json", { manifestHash, replayEnvelope: replay, receiptId: String(receipts.at(-1)?.id ?? "") });
  writeJson(runDir, "replay-envelope.json", replay);
  writeJson(runDir, "diagnostics.json", { runtime: "local", degraded: ["gpu telemetry unavailable"], profile });
  writeJson(runDir, "plan.json", plan);
  writeJson(runDir, "intent.json", intent);
  writeJson(runDir, "node.json", node);
  writeJson(runDir, "probe.json", { outcomes:[{ probe:"gpu-nvidia-smi", state:"unavailable", detail:"command_unavailable"}] });
  fs.writeFileSync(path.join(runDir, "receipts.ndjson"), `${receipts.map((v)=>JSON.stringify(v)).join("\n")}\n`);
  fs.writeFileSync(path.join(runDir, "events.ndjson"), `${events.map((v)=>JSON.stringify(v)).join("\n")}\n`);

  const rows = { status:[{id:"local-proof",state:"ok",detail:`manifestHash=${manifestHash}`}], queue, leases:lease, receipts:receipts.at(-1), replay:[{id:replay.id,state:"validated",detail:replay.reasonCode}], proofpack:[{id:"proofpack",state:"exported",detail:`manifestHash=${manifestHash}`}], events };
  for (const [k,v] of Object.entries(rows)) writeJson(runDir, path.join("operator", `${k}.json`), Array.isArray(v)?v:[v]);

  const verification = verifyLocalGovernedProof(options.rootDir);
  const pp = verifyProofpack(options.rootDir);
  if (!verification.ok || !pp.ok) process.exitCode = 1;
  return { runDir: localProofRunDir(options.rootDir), verification, proofpackOk: pp.ok };
}
