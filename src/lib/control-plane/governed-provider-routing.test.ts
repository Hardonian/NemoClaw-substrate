// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { createDeviceRegistry } from "./device-registry";
import type { PolicyBundle } from "./governance";
import { createOperationalMemoryLog } from "./operational-memory";
import { LocalProviderCapabilityAdapter } from "./local-provider-capability-adapter";
import {
  parseGovernedRoutingConfig,
  routeProviderWithGovernance,
  summarizeGovernedRoutingDiagnostics,
} from "./governed-provider-routing";

const allowPolicy: PolicyBundle = { id: "p", version: "1", defaultEffect: "allow", rules: [] };
const denyPolicy: PolicyBundle = { id: "p", version: "1", defaultEffect: "deny", rules: [] };
const approvalPolicy: PolicyBundle = {
  id: "p",
  version: "1",
  defaultEffect: "allow",
  rules: [{ id: "need-approval", order: 1, description: "approval", effect: "approval_required", reasonCode: "policy_rule_approval_required", matches: () => true }],
};

function seededRegistry() {
  const reg = createDeviceRegistry();
  const probe = new LocalProviderCapabilityAdapter().toNodeDescriptor({ provider: "nvidia-nim", model: "nvidia/nemotron-3-super-120b-a12b", capturedAt: "2026-05-09T00:00:00.000Z", source: "test" });
  reg.register(probe.node);
  reg.updateHeartbeat(probe.node.nodeId, "2026-05-09T00:00:00.000Z");
  return reg;
}

describe("governed provider routing", () => {
  it("feature flag parsing defaults to disabled", () => {
    expect(parseGovernedRoutingConfig({} as NodeJS.ProcessEnv).enabled).toBe(false);
    expect(parseGovernedRoutingConfig({ NEMOCLAW_GOVERNED_ROUTING: "1" } as NodeJS.ProcessEnv).enabled).toBe(true);
  });

  it("disabled mode preserves default route", () => {
    const out = routeProviderWithGovernance({ requestId: "r1", nowIso: "2026-05-09T00:00:00.000Z", provider: "openai-api", model: "gpt-5.4", registry: seededRegistry(), policyBundle: allowPolicy, config: { enabled: false, source: "default", allowDegradedState: false } });
    expect(out.provider).toBe("openai-api");
    expect(out.model).toBe("gpt-5.4");
    expect(out.receipt).toBeUndefined();
  });

  it("enabled mode invokes scheduler path and emits receipt/event", () => {
    const memory = createOperationalMemoryLog();
    const out = routeProviderWithGovernance({ requestId: "r2", nowIso: "2026-05-09T00:00:00.000Z", provider: "nvidia-nim", model: "nvidia/nemotron-3-super-120b-a12b", registry: seededRegistry(), policyBundle: allowPolicy, config: { enabled: true, source: "env", allowDegradedState: false }, operationalMemory: memory });
    expect(out.receipt?.schedulingDecision).toBeTruthy();
    expect(out.receipt?.policyDecision?.allowed).toBe(true);
    expect(out.events.length).toBeGreaterThan(0);
  });

  it("policy deny and approval block provider selection", () => {
    expect(() => routeProviderWithGovernance({ requestId: "r3", nowIso: "2026-05-09T00:00:00.000Z", provider: "openai-api", model: "gpt-5.4", registry: seededRegistry(), policyBundle: denyPolicy, config: { enabled: true, source: "env", allowDegradedState: true } })).toThrow(/denied/);
    expect(() => routeProviderWithGovernance({ requestId: "r4", nowIso: "2026-05-09T00:00:00.000Z", provider: "openai-api", model: "gpt-5.4", registry: seededRegistry(), policyBundle: approvalPolicy, config: { enabled: true, source: "env", allowDegradedState: true } })).toThrow(/approval_required/);
  });

  it("no candidate is explicit and degraded state trigger never bypasses deny", () => {
    const empty = createDeviceRegistry();
    expect(() => routeProviderWithGovernance({ requestId: "r5", nowIso: "2026-05-09T00:00:00.000Z", provider: "openai-api", model: "gpt-5.4", registry: empty, policyBundle: allowPolicy, config: { enabled: true, source: "env", allowDegradedState: false } })).toThrow(/no eligible candidate/);
    const denied = () => routeProviderWithGovernance({ requestId: "r6", nowIso: "2026-05-09T00:00:00.000Z", provider: "openai-api", model: "gpt-5.4", registry: empty, policyBundle: denyPolicy, config: { enabled: true, source: "env", allowDegradedState: true } });
    expect(denied).toThrow(/denied/);
  });

  it("diagnostics shows enabled/disabled state", () => {
    expect(summarizeGovernedRoutingDiagnostics({ enabled: false, source: "default", allowDegradedState: false })[0]).toContain("disabled");
    expect(summarizeGovernedRoutingDiagnostics({ enabled: true, source: "env", allowDegradedState: true }, { provider: "nvidia-nim", model: "m", receiptId: "rid" })[0]).toContain("enabled");
  });
});
