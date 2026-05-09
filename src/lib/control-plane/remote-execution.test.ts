// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from "vitest";
import { createDeviceRegistry } from "./device-registry";
import type { PolicyBundle } from "./governance";
import { OperationalMemoryLog } from "./operational-memory";
import { parseRemoteExecutionConfig, runRemoteExecution, summarizeRemoteExecutionDiagnostics } from "./remote-execution";

const allowPolicy: PolicyBundle = { version: "1", bundleId: "b1", defaultEffect: "allow", rules: [] };
const denyPolicy: PolicyBundle = { version: "1", bundleId: "b2", defaultEffect: "deny", rules: [] };
const approvalPolicy: PolicyBundle = { version: "1", bundleId: "b3", defaultEffect: "deny", rules: [{ id: "a", order: 1, description: "a", effect: "approval_required", reasonCode: "policy_rule_approval_required", matches: () => true }] };

describe("remote execution", () => {
  it("parses feature flag disabled by default", () => {
    expect(parseRemoteExecutionConfig({})).toEqual({ enabled: false, source: "default" });
    expect(parseRemoteExecutionConfig({ NEMOCLAW_REMOTE_EXECUTION: "1" })).toEqual({ enabled: true, source: "env" });
  });

  it("default disabled blocks transport", async () => {
    const transport = { execute: vi.fn() };
    const out = await runRemoteExecution({ request: { requestId: "r1", nowIso: "2026-05-09T00:00:00.000Z", action: "worker:execute", command: "echo hi", targetEndpoint: "https://worker" }, config: { enabled: false, source: "default" }, transport, policyBundle: allowPolicy, registry: createDeviceRegistry() });
    expect(out.status).toBe("disabled");
    expect(transport.execute).not.toHaveBeenCalled();
  });

  it("policy deny and approval gate block transport until approved", async () => {
    const transport = { execute: vi.fn() };
    const denied = await runRemoteExecution({ request: { requestId: "r2", nowIso: "2026-05-09T00:00:00.000Z", action: "worker:execute", command: "echo hi", targetEndpoint: "https://worker" }, config: { enabled: true, source: "env" }, transport, policyBundle: denyPolicy, registry: createDeviceRegistry() });
    expect(denied.status).toBe("policy_denied");
    const approval = await runRemoteExecution({ request: { requestId: "r3", nowIso: "2026-05-09T00:00:00.000Z", action: "worker:execute", command: "echo hi", targetEndpoint: "https://worker" }, config: { enabled: true, source: "env" }, transport, policyBundle: approvalPolicy, registry: createDeviceRegistry() });
    expect(approval.status).toBe("approval_required");
    expect(transport.execute).not.toHaveBeenCalled();
  });

  it("trust denial blocks remote transport before execution", async () => {
    const registry = createDeviceRegistry();
    registry.registerNode({
      version: "1",
      nodeId: "w-denied",
      role: "remote",
      transport: "http",
      endpoint: "https://worker-denied",
      trustClass: "trusted",
      registeredAt: "2026-05-09T00:00:00.000Z",
      lastHeartbeatAt: "2026-05-09T00:00:00.000Z",
      health: "healthy",
      metadata: {},
      workerTrustLevel: "untrusted",
      workerAttestationStatus: "probe_observed",
      capabilities: { version: "1", capturedAt: "2026-05-09T00:00:00.000Z", source: "test", runtimeBackend: "mock", executionMode: "remote", gpus: [], models: [], policyTags: [], reliabilityTags: [], runtimeTags: [], transportRequirements: [] },
    });
    const transport = { execute: vi.fn() };
    const out = await runRemoteExecution({ request: { requestId: "r-denied", nowIso: "2026-05-09T00:00:00.000Z", action: "worker:execute", command: "echo hi", nodeId: "w-denied", approved: true }, config: { enabled: true, source: "env" }, transport, policyBundle: allowPolicy, registry });
    expect(out.status).toBe("degraded");
    expect(out.degradedReason).toBe("policy_denied");
    expect(transport.execute).not.toHaveBeenCalled();
  });

  it("conflicted worker emits conflict event and is blocked", async () => {
    const registry = createDeviceRegistry();
    registry.registerNode({
      version: "1", nodeId: "w-conflict", role: "remote", transport: "http", endpoint: "https://worker-conflict", trustClass: "trusted", registeredAt: "2026-05-09T00:00:00.000Z", lastHeartbeatAt: "2026-05-09T00:00:00.000Z", health: "healthy", metadata: {},
      workerTrustLevel: "untrusted", workerAttestationStatus: "conflict_detected",
      capabilities: { version: "1", capturedAt: "2026-05-09T00:00:00.000Z", source: "test", runtimeBackend: "mock", executionMode: "remote", gpus: [], models: [], policyTags: [], reliabilityTags: [], runtimeTags: [], transportRequirements: [] },
    });
    const out = await runRemoteExecution({ request: { requestId: "r-conflict", nowIso: "2026-05-09T00:00:00.000Z", action: "worker:execute", command: "echo hi", nodeId: "w-conflict", approved: true }, config: { enabled: true, source: "env" }, transport: { execute: vi.fn() }, policyBundle: allowPolicy, registry, operationalMemory: new OperationalMemoryLog() });
    expect(out.status).toBe("degraded");
    expect(out.degradedReason).toBe("attestation_conflict");
    expect(out.events.some((event) => event.category === "degraded_state" && String((event.payload as { degraded?: { reason?: string } }).degraded?.reason).includes("attestation_conflict"))).toBe(true);
  });

  it("expired attestation emits expiry event and is blocked", async () => {
    const registry = createDeviceRegistry();
    registry.registerNode({
      version: "1", nodeId: "w-expired", role: "remote", transport: "http", endpoint: "https://worker-expired", trustClass: "trusted", registeredAt: "2026-05-09T00:00:00.000Z", lastHeartbeatAt: "2026-05-09T00:00:00.000Z", health: "healthy", metadata: {},
      workerTrustLevel: "untrusted", workerAttestationStatus: "expired",
      capabilities: { version: "1", capturedAt: "2026-05-09T00:00:00.000Z", source: "test", runtimeBackend: "mock", executionMode: "remote", gpus: [], models: [], policyTags: [], reliabilityTags: [], runtimeTags: [], transportRequirements: [] },
    });
    const out = await runRemoteExecution({ request: { requestId: "r-expired", nowIso: "2026-05-09T00:00:00.000Z", action: "worker:execute", command: "echo hi", nodeId: "w-expired", approved: true }, config: { enabled: true, source: "env" }, transport: { execute: vi.fn() }, policyBundle: allowPolicy, registry, operationalMemory: new OperationalMemoryLog() });
    expect(out.status).toBe("degraded");
    expect(out.degradedReason).toBe("attestation_expired");
    expect(out.events.some((event) => event.category === "degraded_state" && String((event.payload as { degraded?: { reason?: string } }).degraded?.reason).includes("attestation_expired"))).toBe(true);
  });

  it("approved context permits transport call and handles degraded outcomes", async () => {
    const log = new OperationalMemoryLog();
    const transport = { execute: vi.fn().mockResolvedValueOnce({ status: 504, body: "" }).mockResolvedValueOnce({ status: 200, body: "bad json" }).mockResolvedValueOnce({ status: 200, body: JSON.stringify({ status: "ok", output: "done" }) }) };
    const base = { nowIso: "2026-05-09T00:00:00.000Z", action: "worker:execute", command: "echo hi", targetEndpoint: "https://worker", approved: true, auth: { headerName: "Authorization", token: "secret" } };
    const t1 = await runRemoteExecution({ request: { requestId: "r4", ...base }, config: { enabled: true, source: "env" }, transport, policyBundle: allowPolicy, registry: createDeviceRegistry(), operationalMemory: log });
    const t2 = await runRemoteExecution({ request: { requestId: "r5", ...base }, config: { enabled: true, source: "env" }, transport, policyBundle: allowPolicy, registry: createDeviceRegistry(), operationalMemory: log });
    const t3 = await runRemoteExecution({ request: { requestId: "r6", ...base }, config: { enabled: true, source: "env" }, transport, policyBundle: allowPolicy, registry: createDeviceRegistry(), operationalMemory: log });
    expect(t1.status).toBe("degraded");
    expect(t2.degradedReason).toBe("malformed_response");
    expect(t3.status).toBe("succeeded");
    expect(transport.execute).toHaveBeenCalledTimes(3);
    expect(JSON.stringify(t3.receipt)).not.toContain("secret");
    expect(log.list().length).toBeGreaterThan(0);
  });

  it("supports timeout/network degraded and diagnostics summary", async () => {
    const transport = { execute: vi.fn().mockRejectedValue(new Error("timeout")) };
    const out = await runRemoteExecution({ request: { requestId: "r7", nowIso: "2026-05-09T00:00:00.000Z", action: "worker:execute", command: "echo hi", targetEndpoint: "https://worker", approved: true }, config: { enabled: true, source: "env" }, transport, policyBundle: allowPolicy, registry: createDeviceRegistry() });
    expect(out.degradedReason).toBe("timeout");
    expect(summarizeRemoteExecutionDiagnostics({ enabled: true, source: "env" }, { status: out.status, target: "worker", receiptId: out.receipt.receiptId, reason: out.degradedReason })[0]).toContain("enabled");
  });
});
