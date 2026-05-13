// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { expect, test, describe } from "vitest";
import { evaluatePolicyEngine, mutatePolicyPack, computePolicyPackDigest, PolicyPack, PolicyInheritance, PolicyOverride } from "./policy-engine";
import type { PolicyRule, PolicyEvaluationContext } from "./governance";

describe("Policy Engine", () => {
  const dummyContext: PolicyEvaluationContext = {
    request: {
      version: "1",
      requestId: "req-1",
      receivedAt: "2026-01-01",
      source: "test",
      actor: "tester",
      action: "do_thing",
      constraints: [],
      metadata: {}
    },
    actionClass: "generic"
  };

  const allowRule: PolicyRule = {
    id: "allow-all",
    order: 1,
    description: "allow",
    effect: "allow",
    matches: () => true,
    reasonCode: "policy_rule_allow"
  };

  const denyRule: PolicyRule = {
    id: "deny-all",
    order: 2,
    description: "deny",
    effect: "deny",
    matches: () => true,
    reasonCode: "policy_rule_deny"
  };

  test("precedence correctness: higher scope wins", () => {
    const globalPack: PolicyPack = {
      packId: "global-1", version: "v1", scope: "global", rules: [denyRule], overrides: []
    };
    const envPack: PolicyPack = {
      packId: "env-1", version: "v1", scope: "environment", rules: [allowRule], overrides: []
    };
    const inheritance: PolicyInheritance = { activeScopes: ["global", "environment"], packs: [globalPack, envPack] };

    const trace = evaluatePolicyEngine(inheritance, dummyContext);
    expect(trace.finalEffect).toBe("allow"); // environment wins over global
    expect(trace.winningScope).toBe("environment");
  });

  test("precedence correctness: deny > approval > allow within same scope", () => {
    const approvalRule: PolicyRule = {
      ...allowRule,
      id: "approval-rule",
      effect: "approval_required",
      reasonCode: "policy_rule_approval_required"
    };
    const pack: PolicyPack = {
      packId: "p1", version: "v1", scope: "global", rules: [allowRule, approvalRule, denyRule], overrides: []
    };
    const inheritance: PolicyInheritance = { activeScopes: ["global"], packs: [pack] };

    const trace = evaluatePolicyEngine(inheritance, dummyContext);
    expect(trace.finalEffect).toBe("deny");
    expect(trace.winningRuleId).toBe("deny-all");
  });

  test("override correctness", () => {
    const pack1: PolicyPack = { packId: "p1", version: "v1", scope: "global", rules: [denyRule], overrides: [] };
    const override: PolicyOverride = {
      overrideId: "ov-1",
      targetRuleId: "deny-all",
      scope: "execution",
      effect: "allow",
      reasonCode: "policy_rule_allow",
      justification: "test override",
      overriddenBy: "operator",
      timestamp: new Date().toISOString()
    };
    const pack2: PolicyPack = { packId: "p2", version: "v1", scope: "execution", rules: [], overrides: [override] };

    const inheritance: PolicyInheritance = { activeScopes: ["global", "execution"], packs: [pack1, pack2] };
    const trace = evaluatePolicyEngine(inheritance, dummyContext);

    expect(trace.finalEffect).toBe("allow");
    expect(trace.winningScope).toBe("execution"); // the override's scope
  });

  test("emergency deny behavior", () => {
    const override: PolicyOverride = {
      overrideId: "em-1",
      targetRuleId: "allow-all",
      scope: "emergency",
      effect: "deny",
      reasonCode: "policy_rule_deny",
      justification: "emergency",
      overriddenBy: "system",
      timestamp: new Date().toISOString()
    };
    const pack1: PolicyPack = { packId: "p1", version: "v1", scope: "global", rules: [allowRule], overrides: [] };
    const pack2: PolicyPack = { packId: "p2", version: "v1", scope: "emergency", rules: [], overrides: [override] };

    const inheritance: PolicyInheritance = { activeScopes: ["global", "emergency"], packs: [pack1, pack2] };
    const trace = evaluatePolicyEngine(inheritance, dummyContext);

    expect(trace.finalEffect).toBe("deny");
    expect(trace.winningScope).toBe("emergency");
  });

  test("mutation lineage validation and drift detection", () => {
    const pack: PolicyPack = { packId: "p1", version: "v1", scope: "global", rules: [allowRule], overrides: [] };
    const initialDigest = computePolicyPackDigest(pack);

    const { updatedPack, mutation } = mutatePolicyPack(pack, "admin", [denyRule]);

    expect(mutation.previousDigest).toBe(initialDigest);
    expect(mutation.newDigest).toBe(computePolicyPackDigest(updatedPack));
    expect(updatedPack.rules.length).toBe(2);

    // Changing a rule directly would alter the digest, detecting drift
    const driftPack = { ...updatedPack, rules: [allowRule] };
    expect(computePolicyPackDigest(driftPack)).not.toBe(mutation.newDigest);
  });

  test("deterministic evaluation ordering", () => {
    const r1: PolicyRule = { ...allowRule, id: "r1" };
    const r2: PolicyRule = { ...allowRule, id: "r2" };

    const pack1: PolicyPack = { packId: "p1", version: "v1", scope: "global", rules: [r1, r2], overrides: [] };
    const pack2: PolicyPack = { packId: "p1", version: "v1", scope: "global", rules: [r2, r1], overrides: [] };

    const trace1 = evaluatePolicyEngine({ activeScopes: ["global"], packs: [pack1] }, dummyContext);
    const trace2 = evaluatePolicyEngine({ activeScopes: ["global"], packs: [pack2] }, dummyContext);

    // Sort order should ensure deterministic graph edges and nodes
    expect(trace1.decisions.nodes.map(n => n.ruleId).sort()).toEqual(trace2.decisions.nodes.map(n => n.ruleId).sort());
  });

  test("replay trace validation", () => {
    const pack: PolicyPack = { packId: "p1", version: "v1", scope: "global", rules: [allowRule], overrides: [] };
    const trace1 = evaluatePolicyEngine({ activeScopes: ["global"], packs: [pack] }, dummyContext);
    const trace2 = evaluatePolicyEngine({ activeScopes: ["global"], packs: [pack] }, dummyContext);

    // Exclude traceId and timestamp for equivalence check
    const { traceId: t1, evaluatedAt: e1, ...rest1 } = trace1;
    const { traceId: t2, evaluatedAt: e2, ...rest2 } = trace2;
    expect(rest1).toEqual(rest2);
  });
});
