// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { DeviceRegistry } from "./device-registry";
import { type PolicyBundle } from "./governance";
import { LocalProviderCapabilityAdapter } from "./local-provider-capability-adapter";
import { OperationalMemoryLog } from "./operational-memory";
import { summarizeDryRunDiagnostics } from "./dry-run-diagnostics";
import { runSchedulerDryRun } from "./scheduler-dry-run-bridge";

const allowAll: PolicyBundle = { id: "default", version: "1", defaultEffect: "allow", rules: [] };

describe("worker adapter + dry run bridge", () => {
  it("emits deterministic worker descriptor", () => {
    const adapter = new LocalProviderCapabilityAdapter();
    const out = adapter.toNodeDescriptor({ provider: "ollama", model: "llama3", source: "test", capturedAt: "2026-05-09T00:00:00.000Z" });
    expect(out.descriptor.adapterId).toBe("local-provider-capability-adapter");
    expect(out.descriptor.supportsLiveExecution).toBe(false);
  });

  it("marks unknown hardware explicitly", () => {
    const adapter = new LocalProviderCapabilityAdapter();
    const out = adapter.toNodeDescriptor({ provider: "vllm", source: "test", capturedAt: "2026-05-09T00:00:00.000Z" });
    expect(out.capabilitySnapshot.gpus).toEqual([]);
    expect(out.degradedStates.some((d) => d.reasonCode === "capability_missing")).toBe(true);
  });

  it("dry-run produces receipt and does not execute", () => {
    const registry = new DeviceRegistry();
    const adapter = new LocalProviderCapabilityAdapter();
    registry.registerNode(adapter.toNodeDescriptor({ provider: "ollama", model: "llama3", source: "test", capturedAt: "2026-05-09T00:00:00.000Z" }).node);
    const out = runSchedulerDryRun({
      request: { version: "1", requestId: "r1", receivedAt: "2026-05-09T00:00:00.000Z", source: "test", actor: "user", action: "chat", requestedModel: "llama3", constraints: [], metadata: {} },
      registry,
      policyBundle: allowAll,
      nowIso: "2026-05-09T00:00:01.000Z",
      operationalMemory: new OperationalMemoryLog(),
    });
    expect(out.noExecution).toBe(true);
    expect(out.receipt.receiptId).toBe("dry-run-r1");
    expect(out.events.length).toBeGreaterThan(0);
  });

  it("diagnostics handles empty and populated states", () => {
    expect(summarizeDryRunDiagnostics([])).toContain("Registered nodes: 0");
    const registry = new DeviceRegistry();
    const node = new LocalProviderCapabilityAdapter().toNodeDescriptor({ provider: "ollama", model: "m", source: "test", capturedAt: "2026-05-09T00:00:00.000Z" }).node;
    registry.registerNode(node);
    expect(summarizeDryRunDiagnostics(registry.listNodes())[0]).toBe("Registered nodes: 1");
  });

  it("policy denial is reflected", () => {
    const denyAll: PolicyBundle = { id: "deny", version: "1", defaultEffect: "deny", rules: [] };
    const out = runSchedulerDryRun({
      request: { version: "1", requestId: "r2", receivedAt: "2026-05-09T00:00:00.000Z", source: "test", actor: "user", action: "chat", constraints: [], metadata: {} },
      registry: new DeviceRegistry(),
      policyBundle: denyAll,
      nowIso: "2026-05-09T00:00:01.000Z",
    });
    expect(out.policyResult).toBe("deny");
    expect(out.selectedCandidate).toBeUndefined();
  });
});
