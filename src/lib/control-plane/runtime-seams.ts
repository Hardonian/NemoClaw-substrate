// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { DegradedState, ExecutionPhase, ExecutionReceipt, PolicyDecision } from "./types";
import { buildEventsFromReceipt, type OperationalEvent } from "./operational-memory";
import type { PolicyBundle, PolicyEvaluationResult } from "./governance";
import { evaluatePolicy } from "./governance";

export interface RuntimeActionDescriptor {
  requestId: string;
  action: string;
  actionClass: "tool" | "shell" | "file_mutation" | "remote_node" | "provider" | "fallback" | "network_sensitive" | "high_risk" | "generic" | "runtime";
  executionPhase: ExecutionPhase;
  provider?: string;
  model?: string;
  sandboxName?: string;
  toolName?: string;
  metadata: Record<string, string>;
}

export function buildRuntimeActionDescriptor(input: Partial<RuntimeActionDescriptor> & Pick<RuntimeActionDescriptor, "requestId" | "action">): RuntimeActionDescriptor {
  return {
    requestId: input.requestId,
    action: input.action,
    actionClass: input.actionClass ?? "generic",
    executionPhase: input.executionPhase ?? "execution",
    provider: input.provider,
    model: input.model,
    sandboxName: input.sandboxName,
    toolName: input.toolName,
    metadata: input.metadata ?? {},
  };
}

export function evaluateRuntimePolicy(policy: PolicyBundle, descriptor: RuntimeActionDescriptor): PolicyEvaluationResult {
  return evaluatePolicy(policy, {
    request: {
      version: "1",
      requestId: descriptor.requestId,
      receivedAt: new Date(0).toISOString(),
      source: "runtime-seam",
      actor: "runtime",
      action: descriptor.action,
      requestedModel: descriptor.model,
      constraints: [],
      metadata: descriptor.metadata,
    },
    actionClass: descriptor.actionClass,
  });
}

export function assertRuntimePolicyAllowed(result: PolicyEvaluationResult): { ok: true } {
  if (result.allowed && !result.requiredApproval) return { ok: true };
  const reason = `policy=${result.reasonCode}${result.sourceRuleId ? ` rule=${result.sourceRuleId}` : ""}`;
  if (result.requiredApproval) throw new Error(`Governed action blocked: operator approval required (${reason})`);
  throw new Error(`Governed action denied (${reason})`);
}

export function buildRuntimeReceipt(input: {
  requestId: string;
  action: RuntimeActionDescriptor;
  phase: ExecutionPhase;
  startedAt: string;
  completedAt: string;
  policy?: PolicyEvaluationResult;
  degradedStates?: DegradedState[];
  fallbackReason?: string;
  executionLineage?: ExecutionReceipt["executionLineage"];
}): ExecutionReceipt {
  const policyDecision: PolicyDecision | undefined = input.policy
    ? {
        allowed: input.policy.allowed,
        requiredApproval: input.policy.requiredApproval,
        reasons: [
          {
            code: input.policy.reasonCode,
            explanation: input.policy.matchedRuleDescription || "runtime policy evaluation",
            source: input.policy.sourceRuleId || "policy-default",
          },
        ],
      }
    : undefined;
  return {
    version: "1",
    receiptId: `receipt-${input.requestId}`,
    requestId: input.requestId,
    createdAt: input.startedAt,
    phases: [
      { phase: "received", at: input.startedAt, notes: input.action.action },
      { phase: "policy", at: input.startedAt, notes: policyDecision?.reasons[0]?.code },
      { phase: input.phase, at: input.completedAt },
    ],
    modelId: input.action.model,
    policyDecision,
    degradedEvents: input.degradedStates ?? [],
    fallbackAttempts: input.fallbackReason ? [{ at: input.completedAt, reason: input.fallbackReason }] : [],
    toolInvocations: input.action.toolName
      ? [{ name: input.action.toolName, at: input.completedAt, status: "ok" }]
      : [],
    timing: { totalMs: Math.max(0, Date.parse(input.completedAt) - Date.parse(input.startedAt)) },
    provenance: { source: "runtime-seam", lineage: [input.action.actionClass], replayVersion: "1" },
    executionLineage: input.executionLineage,
    operatorOverrides: [],
  };
}

export function summarizeRuntimeDiagnostics(receipt?: ExecutionReceipt, operationalEvents: OperationalEvent[] = []): string[] {
  if (!receipt) return ["Runtime receipt: none", "Policy: not evaluated", "Degraded state: none", "Scheduler primitives: scaffolded", "Operational events: 0"];
  return [
    `Runtime receipt: ${receipt.receiptId}`,
    `Policy: ${receipt.policyDecision ? (receipt.policyDecision.allowed ? (receipt.policyDecision.requiredApproval ? "approval_required" : "allow") : "deny") : "not evaluated"}`,
    `Degraded state: ${receipt.degradedEvents.length > 0 ? receipt.degradedEvents.map((d) => d.reasonCode).join(",") : "none"}`,
    `Scheduler primitives: ${receipt.schedulingDecision ? "present" : "scaffolded"}`,
    `Operational events: ${operationalEvents.length || buildEventsFromReceipt(receipt).length}`,
    `Execution plan: ${receipt.executionLineage?.executionPlanId ?? "none"}`,
    `Approval state: ${receipt.executionLineage?.executionApprovalId ? "recorded" : "none"}`,
    `Authorization state: ${receipt.executionLineage?.authorizationLineageId ? "recorded" : "none"}`,
  ];
}
