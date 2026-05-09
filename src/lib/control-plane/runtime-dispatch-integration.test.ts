// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from "vitest";
import { createDeviceRegistry } from "./device-registry";
import { LocalProviderCapabilityAdapter } from "./local-provider-capability-adapter";
import { createOperationalMemoryLog } from "./operational-memory";
import { dispatchWithHeterogeneousRouting } from "./runtime-dispatch-integration";

const allowPolicy = { version: "1", generatedAt: "2026-05-09T00:00:00.000Z", defaults: { mode: "allow" as const }, rules: [] };
const denyPolicy = { version: "1", generatedAt: "2026-05-09T00:00:00.000Z", defaults: { mode: "deny" as const }, rules: [] };
const approvalPolicy = { version: "1", generatedAt: "2026-05-09T00:00:00.000Z", defaults: { mode: "approval_required" as const }, rules: [] };

function seededRegistry() {
  const registry = createDeviceRegistry();
  registry.registerNode(new LocalProviderCapabilityAdapter().toNodeDescriptor({ provider: "nvidia-nim", model: "nvidia/nemotron-3-super-120b-a12b", capturedAt: "2026-05-09T00:00:00.000Z", source: "test" }).node);
  registry.registerNode({ version: "1", nodeId: "worker-1", role: "remote", transport: "http", endpoint: "https://worker", trustClass: "trusted", registeredAt: "2026-05-09T00:00:00.000Z", lastHeartbeatAt: "2026-05-09T00:00:00.000Z", health: "healthy", metadata: {}, capabilities: { version: "1", capturedAt: "2026-05-09T00:00:00.000Z", source: "test", runtimeBackend: "openai-compatible", executionMode: "remote", gpus: [{ vendor: "nvidia", model: "L40S", vramMb: 48000, count: 1 }], models: [{ modelId: "nvidia/nemotron-3-super-120b-a12b", maxContextTokens: 128000, flags: { streaming: true, tools: true, batch: false, multimodal: false, quantization: true }, inferenceConstraints: [], executionRestrictions: [] }], policyTags: [], reliabilityTags: [], runtimeTags: [], transportRequirements: [] } });
  return registry;
}

describe("runtime dispatch integration", () => {
  it("disabled flags preserve exact result", async () => {
    const local = vi.fn().mockResolvedValue({ text: "local" });
    const out = await dispatchWithHeterogeneousRouting({ requestId: "r1", nowIso: "2026-05-09T00:00:00.000Z", provider: "openai", model: "gpt", policyBundle: allowPolicy, registry: seededRegistry(), config: { hetero: { enabled: false, source: "default" }, governedEnabled: false, allowFallback: false, remote: { enabled: false, source: "default" } }, localDispatch: local });
    expect(out.status).toBe("ok"); expect(out.result).toEqual({ text: "local" });
  });
  it("hetero flag alone preserves local behavior", async () => {
    const local = vi.fn().mockResolvedValue("local-only");
    const out = await dispatchWithHeterogeneousRouting({ requestId: "r2", nowIso: "2026-05-09T00:00:00.000Z", provider: "openai", model: "gpt", policyBundle: allowPolicy, registry: seededRegistry(), config: { hetero: { enabled: true, source: "env" }, governedEnabled: false, allowFallback: false, remote: { enabled: false, source: "default" } }, localDispatch: local });
    expect(out.result).toBe("local-only");
  });
  it("policy deny blocks before dispatch", async () => {
    const local = vi.fn().mockResolvedValue("x");
    const out = await dispatchWithHeterogeneousRouting({ requestId: "r3", nowIso: "2026-05-09T00:00:00.000Z", provider: "openai", model: "gpt", policyBundle: denyPolicy, registry: seededRegistry(), config: { hetero: { enabled: true, source: "env" }, governedEnabled: true, allowFallback: false, remote: { enabled: false, source: "default" } }, localDispatch: local });
    expect(out.status).toBe("blocked"); expect(local).not.toHaveBeenCalled();
  });
  it("approval_required blocks unless approved", async () => {
    const local = vi.fn();
    const blocked = await dispatchWithHeterogeneousRouting({ requestId: "r4", nowIso: "2026-05-09T00:00:00.000Z", provider: "openai", model: "gpt", policyBundle: approvalPolicy, registry: seededRegistry(), config: { hetero: { enabled: true, source: "env" }, governedEnabled: true, allowFallback: false, remote: { enabled: false, source: "default" } }, localDispatch: local });
    expect(blocked.status).toBe("blocked");
  });
  it("diagnostics exposes bridge state", async () => {
    const out = await dispatchWithHeterogeneousRouting({ requestId: "r5", nowIso: "2026-05-09T00:00:00.000Z", provider: "openai", model: "gpt", policyBundle: allowPolicy, registry: seededRegistry(), config: { hetero: { enabled: true, source: "env" }, governedEnabled: true, allowFallback: true, remote: { enabled: true, source: "env" } }, localDispatch: async () => "ok", remoteTransport: { execute: vi.fn().mockResolvedValue({ status: 200, body: JSON.stringify({ status: "ok", output: "ok" }) }) }, operationalMemory: createOperationalMemoryLog() });
    expect(out.diagnostics.join("\n")).toContain("Heterogeneous routing: enabled");
  });
});
