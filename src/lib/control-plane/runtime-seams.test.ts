// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import type { PolicyBundle } from "./governance";
import {
  assertRuntimePolicyAllowed,
  buildRuntimeActionDescriptor,
  buildRuntimeReceipt,
  evaluateRuntimePolicy,
  summarizeRuntimeDiagnostics,
} from "./runtime-seams";

const policy: PolicyBundle = {
  id: "runtime",
  version: "1",
  defaultEffect: "allow",
  rules: [
    { id: "deny-governed", order: 1, description: "deny governed test", effect: "deny", reasonCode: "policy_rule_deny", matches: (ctx) => ctx.request.action === "governed:test:deny" },
    { id: "approval-governed", order: 2, description: "approval governed test", effect: "approval_required", reasonCode: "policy_rule_approval_required", matches: (ctx) => ctx.request.action === "governed:test:approval" },
  ],
};

describe("runtime seams", () => {
  it("builds action descriptors", () => {
    const d = buildRuntimeActionDescriptor({ requestId: "r1", action: "sandbox:exec", sandboxName: "alpha", toolName: "shell" });
    expect(d.actionClass).toBe("generic");
    expect(d.sandboxName).toBe("alpha");
  });

  it("allows pass-through when policy allows", () => {
    const result = evaluateRuntimePolicy(policy, buildRuntimeActionDescriptor({ requestId: "r1", action: "safe" }));
    expect(result.allowed).toBe(true);
    expect(() => assertRuntimePolicyAllowed(result)).not.toThrow();
  });

  it("blocks deny on governed test action", () => {
    const result = evaluateRuntimePolicy(policy, buildRuntimeActionDescriptor({ requestId: "r1", action: "governed:test:deny" }));
    expect(() => assertRuntimePolicyAllowed(result)).toThrow(/denied/);
  });

  it("blocks approval-required on governed test action", () => {
    const result = evaluateRuntimePolicy(policy, buildRuntimeActionDescriptor({ requestId: "r1", action: "governed:test:approval" }));
    expect(() => assertRuntimePolicyAllowed(result)).toThrow(/approval required/);
  });

  it("builds provider/tool-like receipt with policy rationale", () => {
    const policyResult = evaluateRuntimePolicy(policy, buildRuntimeActionDescriptor({ requestId: "r2", action: "safe" }));
    const receipt = buildRuntimeReceipt({
      requestId: "r2",
      action: buildRuntimeActionDescriptor({ requestId: "r2", action: "provider:invoke", provider: "nim", model: "m", toolName: "chat" }),
      phase: "completed",
      startedAt: "2026-05-09T00:00:00.000Z",
      completedAt: "2026-05-09T00:00:01.000Z",
      policy: policyResult,
    });
    expect(receipt.toolInvocations[0]?.name).toBe("chat");
    expect(receipt.policyDecision?.reasons[0]?.code).toBe("policy_default_allow");
  });

  it("handles diagnostics summary for empty state", () => {
    expect(summarizeRuntimeDiagnostics()).toContain("Runtime receipt: none");
  });
});
