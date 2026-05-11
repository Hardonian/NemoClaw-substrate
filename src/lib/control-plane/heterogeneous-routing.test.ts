// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from "vitest";
import { createDeviceRegistry } from "./device-registry";
import { parseHeterogeneousRoutingConfig, routeHeterogeneous, summarizeHeterogeneousDiagnostics } from "./heterogeneous-routing";

const allowPolicy = { id: "allow", version: "1", defaultEffect: "allow", rules: [] } as const;
const denyPolicy = { id: "deny", version: "1", defaultEffect: "deny", rules: [] } as const;
const approvalPolicy = { id: "approval", version: "1", defaultEffect: "deny", rules: [{ id: "needs-approval", order: 1, description: "approval", effect: "approval_required", matches: () => true, reasonCode: "policy_rule_approval_required" }] } as const;

function registryWithRemote(health: "healthy" | "stale" = "healthy") {
  const registry = createDeviceRegistry();
  registry.registerNode({ version: "1", nodeId: "worker-1", role: "remote", transport: "https", endpoint: "https://worker-1", trustClass: "trusted", registeredAt: "2026-05-09T00:00:00.000Z", lastHeartbeatAt: "2026-05-09T00:00:00.000Z", health, metadata: {}, capabilities: { version: "1", capturedAt: "2026-05-09T00:00:00.000Z", source: "test", runtimeBackend: "mock", executionMode: "remote", gpus: [], models: [{ modelId: "gpt-5.4", maxContextTokens: 1000, flags: { streaming: true, tools: false, batch: false, multimodal: false, quantization: false }, inferenceConstraints: [], executionRestrictions: [] }], policyTags: [], reliabilityTags: [], runtimeTags: [], transportRequirements: [] } });
  return registry;
}

describe("heterogeneous routing", () => {
  it("parses flag", () => {
    expect(parseHeterogeneousRoutingConfig({} as NodeJS.ProcessEnv).enabled).toBe(false);
    expect(parseHeterogeneousRoutingConfig({ NEMOCLAW_HETEROGENEOUS_ROUTING: "1" } as NodeJS.ProcessEnv).enabled).toBe(true);
  });

  it("preserves local default when disabled", async () => {
    const out = await routeHeterogeneous({ requestId: "r1", nowIso: "2026-05-09T00:00:00.000Z", provider: "openai-api", model: "gpt-5.4", registry: registryWithRemote(), policyBundle: allowPolicy, governedEnabled: true, allowDegradedStateTrigger: false, routingConfig: { enabled: false, source: "default" }, remoteConfig: { enabled: true, source: "env" } });
    expect(out.provider).toBe("openai-api");
    expect(out.selectedCandidate?.kind).toBe("local_provider");
  });

  it("ignores remote when remote execution disabled", async () => {
    const out = await routeHeterogeneous({ requestId: "r2", nowIso: "2026-05-09T00:00:00.000Z", provider: "openai-api", model: "gpt-5.4", registry: registryWithRemote(), policyBundle: allowPolicy, governedEnabled: true, allowDegradedStateTrigger: false, routingConfig: { enabled: true, source: "env" }, remoteConfig: { enabled: false, source: "default" } });
    expect(out.excludedCandidates.some((c) => c.kind === "remote_worker")).toBe(true);
    expect(out.selectedCandidate?.kind).toBe("local_provider");
  });

  it("blocks policy denied and approval required remote", async () => {
    const denied = await routeHeterogeneous({ requestId: "r3", nowIso: "2026-05-09T00:00:00.000Z", provider: "openai-api", model: "gpt-5.4", registry: registryWithRemote(), policyBundle: denyPolicy, governedEnabled: true, allowDegradedStateTrigger: false, routingConfig: { enabled: true, source: "env" }, remoteConfig: { enabled: true, source: "env" } });
    expect(denied.excludedCandidates.find((c) => c.kind === "remote_worker")?.policyEligibility).toBe("deny");

    const approval = await routeHeterogeneous({ requestId: "r4", nowIso: "2026-05-09T00:00:00.000Z", provider: "openai-api", model: "gpt-5.4", registry: registryWithRemote(), policyBundle: approvalPolicy, governedEnabled: true, allowDegradedStateTrigger: false, routingConfig: { enabled: true, source: "env" }, remoteConfig: { enabled: true, source: "env" } });
    expect(approval.excludedCandidates.find((c) => c.kind === "remote_worker")?.policyEligibility).toBe("approval_required");
  });

  it("selects remote when eligible and explicit degraded state trigger recorded", async () => {
    const transport = { execute: vi.fn(async () => ({ status: 503, body: "{}" })) };
    const out = await routeHeterogeneous({ requestId: "r5", nowIso: "2026-05-09T00:00:00.000Z", provider: "openai-api", model: "gpt-5.4", registry: registryWithRemote(), policyBundle: allowPolicy, governedEnabled: true, allowDegradedStateTrigger: true, routingConfig: { enabled: true, source: "env" }, remoteConfig: { enabled: true, source: "env" }, remoteTransport: transport, approved: true });
    expect(out.selectedCandidate?.kind).toBe("remote_worker");
    expect(out.receipt.degradedStateTriggers.length).toBe(1);
  });

  it("diagnostics include selected/excluded", async () => {
    const out = await routeHeterogeneous({ requestId: "r6", nowIso: "2026-05-09T00:00:00.000Z", provider: "openai-api", model: "gpt-5.4", registry: registryWithRemote("stale"), policyBundle: allowPolicy, governedEnabled: true, allowDegradedStateTrigger: false, routingConfig: { enabled: true, source: "env" }, remoteConfig: { enabled: true, source: "env" } });
    const lines = summarizeHeterogeneousDiagnostics({ routing: { enabled: true, source: "env" }, governedEnabled: true, remote: { enabled: true, source: "env" }, result: out });
    expect(lines.join("\n")).toContain("Excluded candidates");
  });
});
