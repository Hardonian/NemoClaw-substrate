// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { ControlRequestEnvelope } from "./types";

export type PolicyEffect = "allow" | "deny" | "approval_required";
export type PolicyReasonCode =
  | "policy_default_allow"
  | "policy_default_deny"
  | "policy_rule_allow"
  | "policy_rule_deny"
  | "policy_rule_approval_required";

export interface PolicyRule {
  id: string;
  order: number;
  description: string;
  effect: PolicyEffect;
  matches: (context: PolicyEvaluationContext) => boolean;
  reasonCode: PolicyReasonCode;
}

export interface PolicyBundle {
  id: string;
  version: string;
  defaultEffect: Exclude<PolicyEffect, "approval_required">;
  rules: PolicyRule[];
}

export interface PolicyEvaluationContext {
  request: ControlRequestEnvelope;
  nodeId?: string;
  modelId?: string;
  actionClass: "tool" | "shell" | "file_mutation" | "remote_node" | "provider" | "degraded_state_trigger" | "network_sensitive" | "high_risk" | "generic" | "runtime" | string;
}

export interface PolicyEvaluationResult {
  decision: PolicyEffect;
  allowed: boolean;
  requiredApproval: boolean;
  reasonCode: PolicyReasonCode;
  sourceRuleId: string;
  matchedRuleIds: string[];
  matchedRuleDescription?: string;
}

export function evaluatePolicy(bundle: PolicyBundle, context: PolicyEvaluationContext): PolicyEvaluationResult {
  const ordered = [...bundle.rules].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const matched = ordered.filter((rule) => rule.matches(context));
  const winning = matched[0];
  if (winning) {
    return {
      decision: winning.effect,
      allowed: winning.effect !== "deny",
      requiredApproval: winning.effect === "approval_required",
      reasonCode: winning.reasonCode,
      sourceRuleId: winning.id,
      matchedRuleIds: matched.map((rule) => rule.id),
    };
  }

  return {
    decision: bundle.defaultEffect,
    allowed: bundle.defaultEffect === "allow",
    requiredApproval: false,
    reasonCode: bundle.defaultEffect === "allow" ? "policy_default_allow" : "policy_default_deny",
    sourceRuleId: `${bundle.id}:default`,
    matchedRuleIds: [],
  };
}
