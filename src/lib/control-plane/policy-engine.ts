// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { PolicyRule, PolicyEffect, PolicyReasonCode, PolicyEvaluationContext } from "./governance";
import { deterministicSerialize } from "./serde";
import { createHash } from "node:crypto";

export type PolicyScope = "global" | "environment" | "runtime" | "worker" | "execution" | "operator" | "emergency";

export const SCOPE_PRECEDENCE: Record<PolicyScope, number> = {
  emergency: 700,
  operator: 600,
  execution: 500,
  worker: 400,
  runtime: 300,
  environment: 200,
  global: 100,
};

export interface PolicyOverride {
  overrideId: string;
  targetRuleId: string;
  scope: PolicyScope;
  effect: PolicyEffect;
  reasonCode: PolicyReasonCode;
  justification: string;
  overriddenBy: string;
  timestamp: string;
}

export interface PolicyPack {
  packId: string;
  version: string;
  scope: PolicyScope;
  rules: PolicyRule[];
  overrides: PolicyOverride[];
  parentPackId?: string;
}

export interface PolicyInheritance {
  activeScopes: PolicyScope[];
  packs: PolicyPack[];
}

export interface PolicyDecisionGraphNode {
  ruleId: string;
  scope: PolicyScope;
  effect: PolicyEffect;
  matches: boolean;
  overriddenBy?: string;
}

export interface PolicyDecisionGraphEdge {
  from: string;
  to: string;
  relationship: "overrides" | "inherits" | "preempts";
}

export interface PolicyDecisionGraph {
  nodes: PolicyDecisionGraphNode[];
  edges: PolicyDecisionGraphEdge[];
}

export interface PolicyEvaluationTrace {
  traceId: string;
  evaluatedAt: string;
  context: PolicyEvaluationContext;
  decisions: PolicyDecisionGraph;
  finalEffect: PolicyEffect;
  finalReasonCode: PolicyReasonCode;
  winningRuleId: string;
  winningScope: PolicyScope;
}

export interface PolicyMutationRecord {
  mutationId: string;
  packId: string;
  timestamp: string;
  operator: string;
  changes: {
    addedRules: PolicyRule[];
    removedRuleIds: string[];
    addedOverrides: PolicyOverride[];
    removedOverrideIds: string[];
  };
  previousDigest: string;
  newDigest: string;
}

// ── Evaluation ─────────────────────────────────────────────────────────────

export function evaluatePolicyEngine(inheritance: PolicyInheritance, context: PolicyEvaluationContext): PolicyEvaluationTrace {
  const nodes: PolicyDecisionGraphNode[] = [];
  const edges: PolicyDecisionGraphEdge[] = [];

  // 1. Flatten all rules and overrides
  const allRules: Array<{ rule: PolicyRule; scope: PolicyScope; overriddenBy?: PolicyOverride }> = [];
  const allOverrides = inheritance.packs.flatMap(p => p.overrides);

  for (const pack of inheritance.packs) {
    for (const rule of pack.rules) {
      // Find highest precedence override for this rule
      const ruleOverrides = allOverrides.filter(o => o.targetRuleId === rule.id);
      ruleOverrides.sort((a, b) => SCOPE_PRECEDENCE[b.scope] - SCOPE_PRECEDENCE[a.scope]);
      const activeOverride = ruleOverrides[0];

      allRules.push({
        rule,
        scope: pack.scope,
        overriddenBy: activeOverride
      });

      if (activeOverride) {
        edges.push({
          from: activeOverride.overrideId,
          to: rule.id,
          relationship: "overrides"
        });
      }
    }
  }

  // 2. Evaluate all rules
  const matchedRules: Array<{ ruleId: string; scope: PolicyScope; effect: PolicyEffect; reasonCode: PolicyReasonCode; isOverride: boolean }> = [];

  for (const item of allRules) {
    let matches = false;
    try {
      matches = item.rule.matches(context);
    } catch {
      // Fail closed on evaluation errors
      matches = true;
      item.rule = { ...item.rule, effect: "deny", reasonCode: "policy_rule_deny" };
    }

    const effectiveEffect = item.overriddenBy ? item.overriddenBy.effect : item.rule.effect;
    const effectiveReason = item.overriddenBy ? item.overriddenBy.reasonCode : item.rule.reasonCode;

    nodes.push({
      ruleId: item.rule.id,
      scope: item.scope,
      effect: effectiveEffect,
      matches,
      overriddenBy: item.overriddenBy?.overrideId
    });

    if (matches) {
      matchedRules.push({
        ruleId: item.rule.id,
        scope: item.overriddenBy ? item.overriddenBy.scope : item.scope,
        effect: effectiveEffect,
        reasonCode: effectiveReason,
        isOverride: !!item.overriddenBy
      });
    }
  }

  // 3. Determine winner
  // Precedence:
  // 1. Highest Scope
  // 2. Deny > Approval > Allow
  // 3. Emergency deny is highest implicitly because emergency scope is highest.

  matchedRules.sort((a, b) => {
    // Scope precedence
    const scopeDiff = SCOPE_PRECEDENCE[b.scope] - SCOPE_PRECEDENCE[a.scope];
    if (scopeDiff !== 0) return scopeDiff;

    // Effect precedence: deny (3) > approval_required (2) > allow (1)
    const effectWeight = (e: PolicyEffect) => (e === "deny" ? 3 : e === "approval_required" ? 2 : 1);
    return effectWeight(b.effect) - effectWeight(a.effect);
  });

  const winner = matchedRules[0];

  const finalEffect = winner ? winner.effect : "deny";
  const finalReasonCode = winner ? winner.reasonCode : "policy_default_deny";
  const winningRuleId = winner ? winner.ruleId : "default_deny";
  const winningScope = winner ? winner.scope : "global";

  // Add preempts edges
  if (winner) {
    for (const match of matchedRules) {
      if (match.ruleId !== winner.ruleId) {
        edges.push({
          from: winner.ruleId,
          to: match.ruleId,
          relationship: "preempts"
        });
      }
    }
  }

  const trace: PolicyEvaluationTrace = {
    traceId: `trace-${createHash("sha256").update(deterministicSerialize({ context, finalEffect, winningRuleId, winningScope })).digest("base64url").slice(0, 16)}`,
    evaluatedAt: new Date().toISOString(),
    context,
    decisions: { nodes, edges },
    finalEffect,
    finalReasonCode,
    winningRuleId,
    winningScope
  };

  return trace;
}

// ── Mutation Audit ─────────────────────────────────────────────────────────

export function computePolicyPackDigest(pack: Omit<PolicyPack, "version">): string {
  // Deterministic serialization ignoring transient fields if any
  return Buffer.from(deterministicSerialize({
    packId: pack.packId,
    scope: pack.scope,
    rules: pack.rules.map(r => ({ id: r.id, order: r.order, effect: r.effect, reasonCode: r.reasonCode })),
    overrides: pack.overrides,
    parentPackId: pack.parentPackId
  })).toString("base64url");
}

export function mutatePolicyPack(
  pack: PolicyPack,
  operator: string,
  addedRules: PolicyRule[] = [],
  removedRuleIds: string[] = [],
  addedOverrides: PolicyOverride[] = [],
  removedOverrideIds: string[] = []
): { updatedPack: PolicyPack; mutation: PolicyMutationRecord } {
  const previousDigest = computePolicyPackDigest(pack);

  const updatedRules = pack.rules
    .filter(r => !removedRuleIds.includes(r.id))
    .concat(addedRules);

  const updatedOverrides = pack.overrides
    .filter(o => !removedOverrideIds.includes(o.overrideId))
    .concat(addedOverrides);

  const updatedPack: PolicyPack = {
    ...pack,
    version: `v-${Date.now()}`,
    rules: updatedRules,
    overrides: updatedOverrides
  };

  const newDigest = computePolicyPackDigest(updatedPack);

  const mutation: PolicyMutationRecord = {
    mutationId: `mut-${createHash("sha256").update(deterministicSerialize({ packId: pack.packId, operator, previousDigest, newDigest, addedRuleCount: addedRules.length, removedRuleCount: removedRuleIds.length, addedOverrideCount: addedOverrides.length, removedOverrideCount: removedOverrideIds.length })).digest("base64url").slice(0, 16)}`,
    packId: pack.packId,
    timestamp: new Date().toISOString(),
    operator,
    changes: {
      addedRules,
      removedRuleIds,
      addedOverrides,
      removedOverrideIds
    },
    previousDigest,
    newDigest
  };

  return { updatedPack, mutation };
}
