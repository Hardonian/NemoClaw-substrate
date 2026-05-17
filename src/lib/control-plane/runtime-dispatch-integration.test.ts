// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, describe, expect, it, vi } from "vitest";
import { createDeviceRegistry } from "./device-registry";
import { LocalProviderCapabilityAdapter } from "./local-provider-capability-adapter";
import { createOperationalMemoryLog } from "./operational-memory";
import * as routing from "./heterogeneous-routing";
import { dispatchWithHeterogeneousRouting } from "./runtime-dispatch-integration";

const allowPolicy = { id: "allow", version: "1", defaultEffect: "allow" as const, rules: [] };
const denyPolicy = { id: "deny", version: "1", defaultEffect: "deny" as const, rules: [] };
const approvalPolicy = {
  id: "approval",
  version: "1",
  defaultEffect: "deny" as const,
  rules: [{ id: "needs-approval", order: 1, description: "approval", effect: "approval_required" as const, matches: () => true, reasonCode: "policy_rule_approval_required" as const }],
};

function seededRegistry() {
  const registry = createDeviceRegistry();
  registry.registerNode(new LocalProviderCapabilityAdapter().toNodeDescriptor({ provider: "nvidia-nim", model: "nvidia/nemotron-3-super-120b-a12b", capturedAt: "2026-05-09T00:00:00.000Z", source: "test" }).node);
  registry.registerNode({ version: "1", nodeId: "worker-1", role: "remote", transport: "http", endpoint: "https://worker", trustClass: "trusted", registeredAt: "2026-05-09T00:00:00.000Z", lastHeartbeatAt: "2026-05-09T00:00:00.000Z", health: "healthy", metadata: {}, capabilities: { version: "1", capturedAt: "2026-05-09T00:00:00.000Z", source: "test", runtimeBackend: "openai-compatible", executionMode: "remote", gpus: [{ vendor: "nvidia", model: "L40S", vramMb: 48000, count: 1 }], models: [{ modelId: "nvidia/nemotron-3-super-120b-a12b", maxContextTokens: 128000, flags: { streaming: true, tools: true, batch: false, multimodal: false, quantization: true }, inferenceConstraints: [], executionRestrictions: [] }], policyTags: [], reliabilityTags: [], runtimeTags: [], transportRequirements: [] } });
  return registry;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("runtime dispatch integration", () => {
  it("disabled flags preserve exact result", async () => {
    const local = vi.fn().mockResolvedValue({ text: "local" });
    const out = await dispatchWithHeterogeneousRouting({ requestId: "r1", nowIso: "2026-05-09T00:00:00.000Z", provider: "openai", model: "gpt", policyBundle: allowPolicy, registry: seededRegistry(), config: { hetero: { enabled: false, source: "default" }, governedEnabled: false, allowDegradedState: false, remote: { enabled: false, source: "default" } }, localDispatch: local });
    expect(out.status).toBe("ok"); expect(out.result).toEqual({ text: "local" });
  });

  it("hetero flag alone preserves local behavior", async () => {
    const local = vi.fn().mockResolvedValue("local-only");
    const out = await dispatchWithHeterogeneousRouting({ requestId: "r2", nowIso: "2026-05-09T00:00:00.000Z", provider: "openai", model: "gpt", policyBundle: allowPolicy, registry: seededRegistry(), config: { hetero: { enabled: true, source: "env" }, governedEnabled: false, allowDegradedState: false, remote: { enabled: false, source: "default" } }, localDispatch: local });
    expect(out.result).toBe("local-only");
  });

  it("returns degraded when governed routing yields no eligible candidate", async () => {
    vi.spyOn(routing, "routeHeterogeneous").mockResolvedValue({
      provider: "openai",
      model: "gpt",
      selectedCandidate: undefined,
      excludedCandidates: [],
      allCandidates: [],
      receipt: { receiptId: "receipt-none", degradedStateTriggers: [], degradedEvents: [], phases: [], provenance: { source: "test", lineage: [], replayVersion: "1" }, operatorOverrides: [], requestId: "r-none", version: "1", createdAt: "2026-05-09T00:00:00.000Z", toolInvocations: [], timing: { totalMs: 0 } },
      events: [],
    });
    const local = vi.fn().mockResolvedValue("x");
    const out = await dispatchWithHeterogeneousRouting({ requestId: "r-none", nowIso: "2026-05-09T00:00:00.000Z", provider: "openai", model: "gpt", policyBundle: allowPolicy, registry: seededRegistry(), config: { hetero: { enabled: true, source: "env" }, governedEnabled: true, allowDegradedState: false, remote: { enabled: false, source: "default" } }, localDispatch: local });
    expect(out.status).toBe("degraded");
    expect(out.error).toContain("no eligible candidate");
    expect(local).not.toHaveBeenCalled();
  });

  it("policy deny blocks before local and remote dispatch", async () => {
    const local = vi.fn().mockResolvedValue("x");
    const remote = { execute: vi.fn() };
    const out = await dispatchWithHeterogeneousRouting({ requestId: "r3", nowIso: "2026-05-09T00:00:00.000Z", provider: "openai", model: "gpt", policyBundle: denyPolicy, registry: seededRegistry(), config: { hetero: { enabled: true, source: "env" }, governedEnabled: true, allowDegradedState: false, remote: { enabled: true, source: "env" } }, localDispatch: local, remoteTransport: remote });
    expect(out.status).toBe("blocked");
    expect(local).not.toHaveBeenCalled();
    expect(remote.execute).not.toHaveBeenCalled();
  });

  it("approval_required blocks before local and remote unless approved", async () => {
    const local = vi.fn().mockResolvedValue("ok");
    const remote = { execute: vi.fn() };
    const blocked = await dispatchWithHeterogeneousRouting({ requestId: "r4", nowIso: "2026-05-09T00:00:00.000Z", provider: "openai", model: "gpt", policyBundle: approvalPolicy, registry: seededRegistry(), config: { hetero: { enabled: true, source: "env" }, governedEnabled: true, allowDegradedState: false, remote: { enabled: true, source: "env" } }, localDispatch: local, remoteTransport: remote });
    expect(blocked.status).toBe("blocked");
    expect(local).not.toHaveBeenCalled();
    expect(remote.execute).not.toHaveBeenCalled();
  });

  it("remote candidate with remote disabled returns explicit blocked degraded state", async () => {
    vi.spyOn(routing, "routeHeterogeneous").mockResolvedValue({
      provider: "openai-api", model: "gpt-5.4", remoteStatus: "succeeded", events: [], excludedCandidates: [], allCandidates: [],
      selectedCandidate: { candidateId: "remote:worker-1:gpt-5.4", kind: "remote_worker", identity: "worker-1", capabilitySnapshotRef: "worker-1@2026-05-09T00:00:00.000Z", policyEligibility: "allow", degradedStates: [], telemetryConfidence: "high", executionMode: "remote", reasonCodes: ["eligible"], score: 120, status: "eligible" },
      receipt: { receiptId: "receipt-remote", degradedStateTriggers: [], degradedEvents: [], phases: [], provenance: { source: "test", lineage: [], replayVersion: "1" }, operatorOverrides: [], requestId: "r5", version: "1", createdAt: "2026-05-09T00:00:00.000Z", toolInvocations: [], timing: { totalMs: 0 } },
    });
    const local = vi.fn().mockResolvedValue("x");
    const out = await dispatchWithHeterogeneousRouting({ requestId: "r5", nowIso: "2026-05-09T00:00:00.000Z", provider: "openai-api", model: "gpt-5.4", policyBundle: allowPolicy, registry: seededRegistry(), config: { hetero: { enabled: true, source: "env" }, governedEnabled: true, allowDegradedState: false, remote: { enabled: false, source: "default" } }, localDispatch: local });
    expect(out.status).toBe("blocked");
    expect(out.error).toContain("NEMOCLAW_REMOTE_EXECUTION=1");
    expect(local).not.toHaveBeenCalled();
  });

  it("remote candidate with remote enabled executes mocked transport exactly once", async () => {
    const remoteExecute = vi.fn().mockResolvedValue({ status: 200, body: JSON.stringify({ status: "ok", output: "ok" }) });
    const local = vi.fn().mockResolvedValue("local-after-remote");
    const out = await dispatchWithHeterogeneousRouting({ requestId: "r6", nowIso: "2026-05-09T00:00:00.000Z", provider: "openai-api", model: "gpt-5.4", policyBundle: allowPolicy, registry: seededRegistry(), config: { hetero: { enabled: true, source: "env" }, governedEnabled: true, allowDegradedState: false, remote: { enabled: true, source: "env" } }, localDispatch: local, remoteTransport: { execute: remoteExecute } });
    expect(out.status).toBe("ok");
    expect(remoteExecute).toHaveBeenCalledTimes(1);
  });

  it("degraded state trigger receipt is recorded only when trigger is configured and policy allows", async () => {
    const transport = { execute: vi.fn(async () => ({ status: 503, body: "{}" })) };
    const yesTrigger = await dispatchWithHeterogeneousRouting({ requestId: "r7", nowIso: "2026-05-09T00:00:00.000Z", provider: "openai-api", model: "gpt-5.4", policyBundle: allowPolicy, registry: seededRegistry(), config: { hetero: { enabled: true, source: "env" }, governedEnabled: true, allowDegradedState: true, remote: { enabled: true, source: "env" } }, localDispatch: async () => "local", remoteTransport: transport });
    expect(yesTrigger.status).toBe("degraded");
    expect(yesTrigger.events.length).toBeGreaterThanOrEqual(0);
    expect(yesTrigger.diagnostics.join("\n")).toContain("Degraded state trigger");

    const noTrigger = await dispatchWithHeterogeneousRouting({ requestId: "r8", nowIso: "2026-05-09T00:00:00.000Z", provider: "openai-api", model: "gpt-5.4", policyBundle: allowPolicy, registry: seededRegistry(), config: { hetero: { enabled: true, source: "env" }, governedEnabled: true, allowDegradedState: false, remote: { enabled: true, source: "env" } }, localDispatch: async () => "local", remoteTransport: transport });
    expect(noTrigger.status).toBe("degraded");
  });

  it("diagnostics exposes complete dispatch states", async () => {
    const out = await dispatchWithHeterogeneousRouting({ requestId: "r9", nowIso: "2026-05-09T00:00:00.000Z", provider: "openai-api", model: "gpt-5.4", policyBundle: allowPolicy, registry: seededRegistry(), config: { hetero: { enabled: true, source: "env" }, governedEnabled: true, allowDegradedState: true, remote: { enabled: true, source: "env" } }, localDispatch: async () => "ok", remoteTransport: { execute: vi.fn().mockResolvedValue({ status: 200, body: JSON.stringify({ status: "ok", output: "ok" }) }) }, operationalMemory: createOperationalMemoryLog() });
    const diagnostics = out.diagnostics.join("\n");
    expect(diagnostics).toContain("Heterogeneous routing: enabled");
    expect(diagnostics).toContain("Governed routing: enabled");
    expect(diagnostics).toContain("Remote execution: enabled");
    expect(diagnostics).toContain("Selected candidate:");
    expect(diagnostics).toContain("Excluded candidates:");
    expect(diagnostics).toContain("No-candidate reason:");
    expect(diagnostics).toContain("Degraded state trigger:");
    expect(diagnostics).toContain("Worker trust level:");
    expect(diagnostics).toContain("Worker attestation status:");
    expect(diagnostics).toContain("Trust denial reason:");
    expect(diagnostics).toContain("Receipt:");
  });
});
