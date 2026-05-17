// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { type PolicyBundle, evaluatePolicy } from "./governance";
import { buildEventsFromReceipt, type OperationalEvent, type OperationalMemoryLog } from "./operational-memory";
import { scheduleDeterministically } from "./scheduler";
import { classifyRequest } from "./task-classification";
import type { ControlRequestEnvelope, DegradedState, ExecutionReceipt } from "./types";
import type { DeviceRegistry } from "./device-registry";

export interface SchedulerDryRunResult {
  requestId: string;
  selectedCandidate?: string;
  excludedCandidates: string[];
  policyResult: string;
  degradedStates: DegradedState[];
  receipt: ExecutionReceipt;
  events: OperationalEvent[];
  noExecution: true;
}

export function runSchedulerDryRun(input: {
  request: ControlRequestEnvelope;
  registry: DeviceRegistry;
  policyBundle: PolicyBundle;
  nowIso: string;
  operationalMemory?: OperationalMemoryLog;
}): SchedulerDryRunResult {
  const classification = classifyRequest(input.request);
  const policy = evaluatePolicy(input.policyBundle, { request: input.request, actionClass: classification.riskLevel === 'high' ? 'high_risk' : 'generic' });
  const scheduling = scheduleDeterministically({
    request: input.request,
    classification,
    registry: input.registry,
    policy,
    degradedStates: [],
  });

  const degradedStates: DegradedState[] = [];
  if (!scheduling.decision.selected) {
    degradedStates.push({
      category: "degraded",
      reason: "no scheduling candidate",
      affectedSubsystem: "scheduler-dry-run",
      severity: "warning",
      reasonCode: "constraint_unsatisfied",
      explanation: "Dry-run found no eligible provider/node candidate.",
      sourceComponent: "scheduler-dry-run-bridge",
      timestamp: input.nowIso,
    });
  }

  const receipt: ExecutionReceipt = {
    version: "1",
    receiptId: `dry-run-${input.request.requestId}`,
    requestId: input.request.requestId,
    createdAt: input.nowIso,
    phases: [
      { phase: "received", at: input.request.receivedAt, notes: input.request.action },
      { phase: "policy", at: input.nowIso, notes: policy.reasonCode },
      { phase: "scheduling", at: input.nowIso, notes: scheduling.decision.selected ? "candidate_selected" : "no_candidate" },
      { phase: "completed", at: input.nowIso, notes: "dry_run_no_execution" },
    ],
    nodeId: scheduling.decision.selected?.nodeId,
    modelId: scheduling.decision.selected?.modelId,
    schedulingDecision: scheduling.decision,
    policyDecision: {
      allowed: policy.allowed,
      requiredApproval: policy.requiredApproval,
      reasons: [{ code: policy.reasonCode, explanation: "dry-run policy evaluation", source: policy.sourceRuleId }],
    },
    degradedEvents: degradedStates,
    fallbackAttempts: [],
    toolInvocations: [],
    timing: { totalMs: 0, queueMs: 0, executionMs: 0 },
    provenance: { source: "scheduler-dry-run-bridge", lineage: [classification.taskKind], replayVersion: "1" },
    operatorOverrides: [],
  };

  const events = input.operationalMemory ? buildEventsFromReceipt(receipt, "scheduler-dry-run-bridge", input.operationalMemory) : [];

  return {
    requestId: input.request.requestId,
    selectedCandidate: scheduling.decision.selected ? `${scheduling.decision.selected.nodeId}:${scheduling.decision.selected.modelId}` : undefined,
    excludedCandidates: [...scheduling.excludedByHealth, ...scheduling.excludedByPolicy],
    policyResult: policy.decision,
    degradedStates,
    receipt,
    events,
    noExecution: true,
  };
}
