// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { DeviceRegistry } from "./device-registry";
import type { PolicyEvaluationResult } from "./governance";
import type { TaskClassification } from "./task-classification";
import type { ControlDecisionReason, ControlRequestEnvelope, DegradedState, SchedulingCandidate, SchedulingDecision } from "./types";

export interface SchedulingInput {
  request: ControlRequestEnvelope;
  classification: TaskClassification;
  registry: DeviceRegistry;
  policy: PolicyEvaluationResult;
  degradedStates: DegradedState[];
}

export interface FallbackPlanRecord {
  originalCandidate: string;
  fallbackCandidate: string;
  reason: string;
  policyStatus: string;
  degradedStatus: string;
  operatorExplanation: string;
}

export interface SchedulingResult {
  decision: SchedulingDecision;
  excludedByPolicy: string[];
  excludedByHealth: string[];
  fallbackPlan: FallbackPlanRecord[];
}

export function scheduleDeterministically(input: SchedulingInput): SchedulingResult {
  const excludedByPolicy: string[] = [];
  const excludedByHealth: string[] = [];
  const reasons: ControlDecisionReason[] = [];

  if (!input.policy.allowed) {
    reasons.push({ code: input.policy.reasonCode, explanation: "policy denied scheduling", source: input.policy.sourceRuleId });
    return { decision: { rejected: [], reasons }, excludedByPolicy: ["*"], excludedByHealth, fallbackPlan: [] };
  }

  const candidates: SchedulingCandidate[] = [];
  for (const node of input.registry.listNodes()) {
    if (node.health !== "healthy") {
      excludedByHealth.push(node.nodeId);
      continue;
    }
    if (input.classification.remoteExecutionEligible === false && node.role === "remote") {
      excludedByPolicy.push(node.nodeId);
      continue;
    }

    const model = input.request.requestedModel
      ? node.capabilities.models.find((item) => item.modelId === input.request.requestedModel)
      : node.capabilities.models[0];
    if (!model) continue;

    const score = (node.role === "local" ? 100 : 50) + (model.flags.streaming === input.classification.requiresStreaming ? 10 : 0);
    candidates.push({ nodeId: node.nodeId, modelId: model.modelId, score, reasons: [{ code: "candidate_scored", explanation: `deterministic score=${score}`, source: "scheduler" }] });
  }

  candidates.sort((a, b) => b.score - a.score || a.nodeId.localeCompare(b.nodeId) || a.modelId.localeCompare(b.modelId));

  if (!candidates.length) {
    reasons.push({ code: "no_candidate", explanation: "no eligible candidate after policy/health filtering", source: "scheduler" });
    return { decision: { rejected: [], reasons }, excludedByPolicy, excludedByHealth, fallbackPlan: [] };
  }

  const [selected, ...rest] = candidates;
  const fallbackPlan = rest.slice(0, 2).map((fallback) => ({
    originalCandidate: `${selected.nodeId}:${selected.modelId}`,
    fallbackCandidate: `${fallback.nodeId}:${fallback.modelId}`,
    reason: "primary_unavailable_or_declined",
    policyStatus: input.policy.reasonCode,
    degradedStatus: input.degradedStates[0]?.reasonCode ?? "none",
    operatorExplanation: `Fallback is planned only; execution remains explicit and operator-visible for ${fallback.nodeId}.`,
  }));

  reasons.push({ code: "scheduled", explanation: `selected ${selected.nodeId}/${selected.modelId}`, source: "scheduler" });
  return { decision: { selected, rejected: rest, reasons }, excludedByPolicy, excludedByHealth, fallbackPlan };
}
