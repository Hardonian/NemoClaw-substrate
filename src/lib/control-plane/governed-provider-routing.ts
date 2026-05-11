// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { evaluatePolicy, type PolicyBundle } from "./governance";
import { type OperationalEvent, buildEventsFromReceipt, type OperationalMemoryLog } from "./operational-memory";
import { scheduleDeterministically } from "./scheduler";
import { classifyRequest } from "./task-classification";
import type { DeviceRegistry } from "./device-registry";
import type { DegradedState, ExecutionReceipt } from "./types";

export interface GovernedRoutingConfig {
  enabled: boolean;
  source: "env" | "default";
  allowDegradedStateTrigger: boolean;
}

export function parseGovernedRoutingConfig(env: NodeJS.ProcessEnv): GovernedRoutingConfig {
  const enabled = env.NEMOCLAW_GOVERNED_ROUTING === "1";
  const allowDegradedStateTrigger = env.NEMOCLAW_GOVERNED_ROUTING_ALLOW_DEGRADED_STATE_TRIGGER === "1";
  return { enabled, allowDegradedStateTrigger, source: enabled || allowDegradedStateTrigger ? "env" : "default" };
}

export interface ProviderRouteInput {
  requestId: string;
  nowIso: string;
  provider: string;
  model: string;
  registry: DeviceRegistry;
  policyBundle: PolicyBundle;
  config: GovernedRoutingConfig;
  operationalMemory?: OperationalMemoryLog;
}

export function routeProviderWithGovernance(input: ProviderRouteInput): { provider: string; model: string; receipt?: ExecutionReceipt; events: OperationalEvent[] } {
  if (!input.config.enabled) return { provider: input.provider, model: input.model, events: [] };

  const request = {
    version: "1",
    requestId: input.requestId,
    receivedAt: input.nowIso,
    source: "governed-provider-routing",
    actor: "runtime",
    action: "provider:select",
    requestedModel: input.model,
    constraints: [],
    metadata: { provider: input.provider, model: input.model },
  };
  const classification = classifyRequest(request);
  const policy = evaluatePolicy(input.policyBundle, { request, actionClass: "provider" });
  if (!policy.allowed || policy.requiredApproval) {
    const mode = policy.requiredApproval ? "approval_required" : "denied";
    throw new Error(`Governed provider routing ${mode} (${policy.reasonCode})`);
  }

  const scheduling = scheduleDeterministically({ request, classification, registry: input.registry, policy, degradedStates: [] });
  const selected = scheduling.decision.selected;
  const degradedStates: DegradedState[] = [];
  if (!selected) {
    degradedStates.push({ category: "degraded", reason: "no governed candidate", affectedSubsystem: "provider-routing", severity: "warning", reasonCode: "constraint_unsatisfied", explanation: "No eligible governed routing candidate.", sourceComponent: "governed-provider-routing", timestamp: input.nowIso });
    if (!input.config.allowDegradedStateTrigger) throw new Error("Governed provider routing has no eligible candidate (degraded state trigger disabled)");
  }

  const routedProvider = selected ? selected.nodeId.replace(/^provider:/, "").split(":")[0] : input.provider;
  const routedModel = selected?.modelId ?? input.model;
  const degradedStateTriggerUsed = !selected;

  const receipt: ExecutionReceipt = {
    version: "1",
    receiptId: `provider-routing-${input.requestId}`,
    requestId: input.requestId,
    createdAt: input.nowIso,
    phases: [
      { phase: "received", at: input.nowIso, notes: "provider:select" },
      { phase: "policy", at: input.nowIso, notes: policy.reasonCode },
      { phase: "scheduling", at: input.nowIso, notes: selected ? "candidate_selected" : "no_candidate" },
      { phase: "completed", at: input.nowIso, notes: degradedStateTriggerUsed ? "degraded_state_trigger_used" : "governed_selected" },
    ],
    nodeId: selected?.nodeId,
    modelId: routedModel,
    schedulingDecision: scheduling.decision,
    policyDecision: { allowed: policy.allowed, requiredApproval: policy.requiredApproval, reasons: [{ code: policy.reasonCode, explanation: "governed provider-routing policy evaluation", source: policy.sourceRuleId }] },
    degradedEvents: degradedStates,
    degradedStateTriggers: degradedStateTriggerUsed ? [{ at: input.nowIso, reason: "no_eligible_candidate", target: `${input.provider}/${input.model}` }] : [],
    toolInvocations: [],
    timing: { totalMs: 0 },
    provenance: { source: "governed-provider-routing", lineage: [classification.taskKind], replayVersion: "1" },
    operatorOverrides: [],
  };
  const events = input.operationalMemory ? buildEventsFromReceipt(receipt, "governed-provider-routing", input.operationalMemory) : [];
  return { provider: routedProvider, model: routedModel, receipt, events };
}


export function summarizeGovernedRoutingDiagnostics(config: GovernedRoutingConfig, routed?: { provider: string; model: string; receiptId?: string }): string[] {
  return [
    `Governed routing: ${config.enabled ? "enabled" : "disabled"} (${config.source})`,
    `Degraded state trigger: ${config.allowDegradedStateTrigger ? "enabled" : "disabled"}`,
    `Selected provider/model: ${routed ? `${routed.provider}/${routed.model}` : "not selected"}`,
    `Receipt: ${routed?.receiptId ?? "none"}`,
  ];
}
