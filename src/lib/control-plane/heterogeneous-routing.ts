// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { DeviceRegistry } from "./device-registry";
import type { ExecutionApproval, ExecutionPlan } from "./execution-plans";
import { executionLineageFromPlan } from "./execution-plans";
import { evaluatePolicy, type PolicyBundle } from "./governance";
import type { OperationalEvent, OperationalMemoryLog } from "./operational-memory";
import { buildEventsFromReceipt } from "./operational-memory";
import { runRemoteExecution, type RemoteExecutionConfig, type RemoteExecutionTransport } from "./remote-execution";
import type { DegradedState, ExecutionReceipt } from "./types";

export interface HeterogeneousRoutingConfig {
  enabled: boolean;
  source: "env" | "default";
}

export function parseHeterogeneousRoutingConfig(env: NodeJS.ProcessEnv): HeterogeneousRoutingConfig {
  const enabled = env.NEMOCLAW_HETEROGENEOUS_ROUTING === "1";
  return { enabled, source: enabled ? "env" : "default" };
}

type CandidateKind = "local_provider" | "remote_worker";
type CandidateStatus = "eligible" | "excluded";
export interface HeterogeneousCandidate {
  candidateId: string;
  kind: CandidateKind;
  identity: string;
  capabilitySnapshotRef: string;
  policyEligibility: "allow" | "deny" | "approval_required";
  degradedStates: string[];
  telemetryConfidence: "high" | "medium" | "low";
  executionMode: "local" | "remote";
  reasonCodes: string[];
  score: number;
  status: CandidateStatus;
}

export interface HeterogeneousRoutingResult {
  provider: string;
  model: string;
  selectedCandidate?: HeterogeneousCandidate;
  excludedCandidates: HeterogeneousCandidate[];
  allCandidates: HeterogeneousCandidate[];
  receipt: ExecutionReceipt;
  events: OperationalEvent[];
  remoteStatus?: string;
}

export async function routeHeterogeneous(input: {
  requestId: string; nowIso: string; provider: string; model: string; registry: DeviceRegistry; policyBundle: PolicyBundle;
  governedEnabled: boolean; allowDegradedState: boolean; routingConfig: HeterogeneousRoutingConfig; remoteConfig: RemoteExecutionConfig;
  remoteTransport?: RemoteExecutionTransport; approved?: boolean; operationalMemory?: OperationalMemoryLog; executionPlan?: ExecutionPlan; executionApproval?: ExecutionApproval; executionPlanRequired?: boolean;
}): Promise<HeterogeneousRoutingResult> {
  const degradedStateTriggerProvider = { provider: input.provider, model: input.model };
  const local = {
    candidateId: `local:${input.provider}:${input.model}`,
    kind: "local_provider" as const,
    identity: `${input.provider}/${input.model}`,
    capabilitySnapshotRef: "provider-request",
    policyEligibility: "allow" as const,
    degradedStates: [], telemetryConfidence: "high" as const, executionMode: "local" as const,
    reasonCodes: ["local_default"], score: 100, status: "eligible" as const,
  };

  const policyEval = evaluatePolicy(input.policyBundle, { request: { version: "1", requestId: input.requestId, receivedAt: input.nowIso, source: "heterogeneous-routing", actor: "runtime", action: "worker:execute", requestedModel: input.model, constraints: [], metadata: { provider: input.provider } }, actionClass: "runtime" });
  const excluded: HeterogeneousCandidate[] = [];
  const all: HeterogeneousCandidate[] = [local];
  const remoteNodes = input.registry.listNodes().filter((n) => n.role === "remote");
  for (const node of remoteNodes) {
    const denied = !input.remoteConfig.enabled || !input.routingConfig.enabled || !input.governedEnabled || node.health !== "healthy" || !policyEval.allowed || (policyEval.requiredApproval && !input.approved);
    const remote: HeterogeneousCandidate = {
      candidateId: `remote:${node.nodeId}:${input.model}`,
      kind: "remote_worker",
      identity: node.nodeId,
      capabilitySnapshotRef: `${node.nodeId}@${node.capabilities.capturedAt}`,
      policyEligibility: policyEval.requiredApproval ? "approval_required" : (policyEval.allowed ? "allow" : "deny"),
      degradedStates: node.health === "healthy" ? [] : [node.health],
      telemetryConfidence: node.health === "healthy" ? "high" : "low",
      executionMode: "remote",
      reasonCodes: denied ? ["excluded", ...(node.workerTrustReasonCodes ?? [])] : ["eligible", ...(node.workerTrustReasonCodes ?? [])],
      score: 120,
      status: denied ? "excluded" : "eligible",
    };
    all.push(remote);
    if (denied) excluded.push(remote);
  }

  const eligible = all.filter((c) => c.status === "eligible" && (c.kind === "local_provider" || input.routingConfig.enabled));
  const selected = eligible.sort((a,b) => b.score - a.score || a.candidateId.localeCompare(b.candidateId))[0];

  const degradedEvents: DegradedState[] = [];
  const degradedStateTriggers: ExecutionReceipt["degradedStateTriggers"] = [];
  if (!selected) {
    degradedEvents.push({ category: "degraded", reason: "no eligible candidate", affectedSubsystem: "heterogeneous-routing", severity: "warning", reasonCode: "constraint_unsatisfied", explanation: "No local or remote candidate remained after policy and health filtering.", sourceComponent: "heterogeneous-routing", timestamp: input.nowIso });
  }

  let provider = degradedStateTriggerProvider.provider;
  let model = degradedStateTriggerProvider.model;
  let remoteStatus: string | undefined;
  if (selected?.kind === "remote_worker") {
    if (!input.remoteTransport) throw new Error("remote transport required");
    const remote = await runRemoteExecution({ request: { requestId: input.requestId, nowIso: input.nowIso, action: "worker:execute", command: `run:${input.model}`, nodeId: selected.identity, approved: input.approved, executionPlanRequired: input.executionPlanRequired }, config: input.remoteConfig, transport: input.remoteTransport, policyBundle: input.policyBundle, registry: input.registry, operationalMemory: input.operationalMemory, executionPlan: input.executionPlan, executionApproval: input.executionApproval });
    remoteStatus = remote.status;
    if (remote.status !== "succeeded") {
      degradedStateTriggers.push({ at: input.nowIso, reason: `remote_${remote.status}`, target: `${degradedStateTriggerProvider.provider}/${degradedStateTriggerProvider.model}` });
      if (input.allowDegradedState && policyEval.allowed) {
        provider = degradedStateTriggerProvider.provider;
        model = degradedStateTriggerProvider.model;
      }
    }
  }

  const receipt: ExecutionReceipt = {
    version: "1",
    receiptId: `heterogeneous-routing-${input.requestId}`,
    requestId: input.requestId,
    createdAt: input.nowIso,
    phases: [
      { phase: "received", at: input.nowIso, notes: "heterogeneous_route" },
      { phase: "policy", at: input.nowIso, notes: policyEval.reasonCode },
      { phase: "scheduling", at: input.nowIso, notes: selected ? selected.candidateId : "no_candidate" },
      { phase: "completed", at: input.nowIso, notes: selected?.kind ?? "none" },
    ],
    nodeId: selected?.kind === "remote_worker" ? selected.identity : undefined,
    modelId: model,
    degradedEvents,
    degradedStateTriggers,
    toolInvocations: [],
    timing: { totalMs: 0 },
    provenance: { source: "heterogeneous-routing", lineage: ["provider", "remote"], replayVersion: "1" },
    executionLineage: input.executionPlan ? executionLineageFromPlan(input.executionPlan, input.executionApproval, input.executionPlan.authorization?.result) : undefined,
    operatorOverrides: [],
  };
  const events = input.operationalMemory ? buildEventsFromReceipt(receipt, "heterogeneous-routing", input.operationalMemory) : [];
  return { provider, model, selectedCandidate: selected, excludedCandidates: excluded, allCandidates: all, receipt, events, remoteStatus };
}

export function summarizeHeterogeneousDiagnostics(input: { routing: HeterogeneousRoutingConfig; governedEnabled: boolean; remote: RemoteExecutionConfig; result?: HeterogeneousRoutingResult }): string[] {
  const noCandidateReason = input.result?.selectedCandidate ? "none" : input.result?.receipt.degradedEvents.map((event) => event.reasonCode).join(",") || "no_selected_candidate";
  const degradedStateTriggerState = input.result ? (input.result.receipt.degradedStateTriggers.length > 0 ? input.result.receipt.degradedStateTriggers.map((attempt) => attempt.reason).join(",") : "none") : "none";

  return [
    `Heterogeneous routing: ${input.routing.enabled ? "enabled" : "disabled"} (${input.routing.source})`,
    `Governed routing: ${input.governedEnabled ? "enabled" : "disabled"}`,
    `Remote execution: ${input.remote.enabled ? "enabled" : "disabled"} (${input.remote.source})`,
    `Selected candidate: ${input.result?.selectedCandidate?.candidateId ?? "none"}`,
    `Excluded candidates: ${input.result?.excludedCandidates.map((c) => c.candidateId).join(",") || "none"}`,
    `No-candidate reason: ${noCandidateReason}`,
    `Degraded state trigger: ${degradedStateTriggerState}`,
    `Worker trust level: ${input.result?.selectedCandidate?.kind === "remote_worker" ? input.result.selectedCandidate.status : "none"}`,
    `Worker attestation status: ${input.result?.selectedCandidate?.kind === "remote_worker" ? (input.result.selectedCandidate.reasonCodes.join("|") || "none") : "none"}`,
    `Trust denial reason: ${input.result?.excludedCandidates.find((c) => c.kind === "remote_worker")?.reasonCodes.join("|") || "none"}`,
    `Execution plan: ${input.result?.receipt.executionLineage?.executionPlanId ?? "none"}`,
    `Approval state: ${input.result?.receipt.executionLineage?.executionApprovalId ? "recorded" : "none"}`,
    `Authorization state: ${input.result?.receipt.executionLineage?.authorizationLineageId ? "recorded" : "none"}`,
    `Intent hash: ${input.result?.receipt.executionLineage?.executionIntentHash ?? "none"}`,
    `Policy snapshot hash: ${input.result?.receipt.executionLineage?.executionPolicySnapshotHash ?? "none"}`,
    `Trust snapshot hash: ${input.result?.receipt.executionLineage?.executionTrustSnapshotHash ?? "none"}`,
    `Replay reference: ${input.result?.receipt.executionLineage?.replayReferenceId ?? "none"}`,
    `Receipt: ${input.result?.receipt.receiptId ?? "none"}`,
  ];
}
