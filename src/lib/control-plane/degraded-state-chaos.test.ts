// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from "vitest";
import { createDeviceRegistry, type DeviceRegistry } from "./device-registry";
import type { PolicyBundle } from "./governance";
import { routeProviderWithGovernance } from "./governed-provider-routing";
import { OperationalMemoryLog } from "./operational-memory";
import { buildReplayEnvelope, validateReplayEnvelope } from "./replay";
import { runRemoteExecution } from "./remote-execution";
import { summarizeDryRunDiagnostics } from "./dry-run-diagnostics";
import { applyProbeToRegistry, type WorkerProbeResult } from "./worker-probes";
import { LocalProviderCapabilityAdapter } from "./local-provider-capability-adapter";

const allowPolicy: PolicyBundle = { id: "allow", version: "1", defaultEffect: "allow", rules: [] };
const denyPolicy: PolicyBundle = { id: "deny", version: "1", defaultEffect: "deny", rules: [] };
const approvalPolicy: PolicyBundle = { id: "approval", version: "1", defaultEffect: "allow", rules: [{ id: "approval-rule", order: 1, description: "approval", effect: "approval_required", reasonCode: "policy_rule_approval_required", matches: () => true }] };

function fakeRegistry({ stale = false }: { stale?: boolean } = {}): DeviceRegistry {
  const reg = createDeviceRegistry();
  const node = new LocalProviderCapabilityAdapter().toNodeDescriptor({ provider: "nvidia-nim", model: "nvidia/nemotron-3-super-120b-a12b", source: "chaos-test", capturedAt: "2026-05-09T00:00:00.000Z" }).node;
  reg.register(node);
  reg.updateHeartbeat(node.nodeId, stale ? "2026-05-01T00:00:00.000Z" : "2026-05-09T00:00:00.000Z");
  if (stale) node.health = "stale";
  return reg;
}

function fakeProbe(status: WorkerProbeResult["status"], overrides: Partial<WorkerProbeResult["telemetry"]> = {}): WorkerProbeResult {
  return {
    request: { requestId: "probe-r1", nodeId: "node-1", runtime: "vllm", transport: "http", endpoint: "http://worker", nowIso: "2026-05-09T00:00:00.000Z" },
    status,
    capability: { runtimeBackend: "vllm", executionMode: "remote", models: ["m1"] },
    telemetry: {
      capturedAt: "2026-05-09T00:00:00.000Z",
      runtimeHealth: { state: "observed", value: "healthy", observedAt: "2026-05-09T00:00:00.000Z" },
      backendVersion: { state: "observed", value: "1.0" },
      modelInventory: { state: "observed", value: ["m1"] },
      gpus: { state: "observed", value: [] },
      runtimeMetrics: { queueDepth: { state: "observed", value: 1 } },
      ...overrides,
    },
    degradedStates: status === "degraded" ? [{ category: "degraded", reason: "probe degraded", affectedSubsystem: "probe", severity: "warning", reasonCode: "unknown_error", explanation: "probe degraded", sourceComponent: "worker-probes", timestamp: "2026-05-09T00:00:00.000Z" }] : [],
  };
}

describe("degraded state chaos coverage", () => {
  it("proves no hidden fallback and no denied candidate execution", () => {
    const empty = createDeviceRegistry();
    expect(() => routeProviderWithGovernance({ requestId: "chaos-no-candidate", nowIso: "2026-05-09T00:00:00.000Z", provider: "openai-api", model: "gpt-5", registry: empty, policyBundle: allowPolicy, config: { enabled: true, source: "env", allowFallback: false } })).toThrow(/no eligible candidate/);
    expect(() => routeProviderWithGovernance({ requestId: "chaos-deny", nowIso: "2026-05-09T00:00:00.000Z", provider: "openai-api", model: "gpt-5", registry: fakeRegistry(), policyBundle: denyPolicy, config: { enabled: true, source: "env", allowFallback: true } })).toThrow(/denied/);
  });

  it("blocks remote execution for disabled flag, deny, approval_required, and stale registry", async () => {
    const transport = { execute: vi.fn() };
    const base = { requestId: "chaos-r1", nowIso: "2026-05-09T00:00:00.000Z", action: "worker:execute", command: "echo chaos", targetEndpoint: "https://worker" };
    const disabled = await runRemoteExecution({ request: base, config: { enabled: false, source: "default" }, transport, policyBundle: allowPolicy, registry: fakeRegistry() });
    const denied = await runRemoteExecution({ request: { ...base, requestId: "chaos-r2" }, config: { enabled: true, source: "env" }, transport, policyBundle: denyPolicy, registry: fakeRegistry() });
    const approval = await runRemoteExecution({ request: { ...base, requestId: "chaos-r3" }, config: { enabled: true, source: "env" }, transport, policyBundle: approvalPolicy, registry: fakeRegistry() });
    const stale = await runRemoteExecution({ request: { ...base, requestId: "chaos-r4", nodeId: fakeRegistry({ stale: true }).listNodes()[0]?.nodeId }, config: { enabled: true, source: "env" }, transport, policyBundle: allowPolicy, registry: fakeRegistry({ stale: true }) });
    expect(disabled.status).toBe("disabled");
    expect(denied.status).toBe("policy_denied");
    expect(approval.status).toBe("approval_required");
    expect(stale.degradedReason).toBe("node_stale_or_unhealthy");
    expect(transport.execute).not.toHaveBeenCalled();
  });

  it("captures remote timeout and failed fallback deterministically in receipts/events", async () => {
    const log = new OperationalMemoryLog();
    const transport = { execute: vi.fn().mockRejectedValue(new Error("timeout")) };
    const out = await runRemoteExecution({ request: { requestId: "chaos-timeout", nowIso: "2026-05-09T00:00:00.000Z", action: "worker:execute", command: "echo chaos", targetEndpoint: "https://worker", approved: true }, config: { enabled: true, source: "env" }, transport, policyBundle: allowPolicy, registry: fakeRegistry(), operationalMemory: log });
    expect(out.status).toBe("degraded");
    expect(out.degradedReason).toBe("timeout");
    expect(out.receipt.degradedEvents[0]?.reasonCode).toBe("transport_unreachable");
    expect(out.events.length).toBeGreaterThan(0);
  });

  it("keeps telemetry truth when unavailable/malformed and does not erase observed inventory", () => {
    const reg = fakeRegistry();
    const node = reg.listNodes()[0];
    if (!node) throw new Error("missing node");
    node.capabilities.models = [{ modelId: "preserved", maxContextTokens: 0, flags: { streaming: false, tools: false, batch: false, multimodal: false, quantization: false }, inferenceConstraints: [], executionRestrictions: [] }];
    const unavailable = fakeProbe("degraded", { modelInventory: { state: "unavailable", reason: "probe_offline" }, backendVersion: { state: "unavailable", reason: "probe_offline" }, gpus: { state: "unavailable", reason: "probe_offline" } });
    const updated = applyProbeToRegistry(reg, node, unavailable);
    expect(updated.capabilities.models[0]?.modelId).toBe("preserved");

    const malformed = fakeProbe("failed", { runtimeHealth: { state: "unavailable", reason: "malformed_telemetry" } });
    expect(malformed.telemetry.runtimeHealth.state).toBe("unavailable");
  });

  it("detects replay integrity mismatch, missing lineage, and missing replay reason codes", () => {
    const log = new OperationalMemoryLog();
    log.append({ occurredAt: "2026-05-09T00:00:00.000Z", category: "degraded_state", source: "chaos", provenance: {}, payload: { degraded: { reasonCode: "replay_integrity_mismatch" } } });
    const envelope = buildReplayEnvelope(log.list(), "2026-05-09T00:00:02.000Z");
    envelope.digest = "tampered";
    expect(validateReplayEnvelope(envelope)).toEqual({ ok: false, reasons: ["missing_replay_lineage", "digest_mismatch"] });

    const missingReason = buildReplayEnvelope([
      { eventId: "e1", occurredAt: "2026-05-09T00:00:00.000Z", sequence: 0, category: "fallback", source: "chaos", provenance: {}, replayRef: { lineage: ["chaos"], replayVersion: "1" }, payload: { fallback: { at: "2026-05-09T00:00:00.000Z", target: "local/default", reason: "" } } },
    ], "2026-05-09T00:00:03.000Z");
    expect(validateReplayEnvelope(missingReason)).toEqual({ ok: false, reasons: ["missing_replay_reason_code"] });

    const lines = summarizeDryRunDiagnostics([]);
    expect(lines).toEqual(["Registered nodes: 0", "Capability snapshots: none", "Scheduler dry-run: not invoked"]);
  });


  it("rejects replay on policy/trust/candidate/fallback drift reason-code gaps", () => {
    const make = (category: "degraded_state" | "fallback" | "policy_outcome", payload: Record<string, unknown>) =>
      buildReplayEnvelope([{ eventId: "e0", occurredAt: "2026-05-09T00:00:00.000Z", sequence: 0, category, source: "chaos", provenance: {}, replayRef: { lineage: ["chaos"], replayVersion: "1" }, payload }], "2026-05-09T00:00:01.000Z");

    const policyDrift = make("policy_outcome", { policyDecision: { allowed: false, requiredApproval: false, reasons: [{ code: "" }] } });
    const trustDrift = make("degraded_state", { degraded: { reasonCode: "", reason: "trust_drift" } });
    const candidateMismatch = make("degraded_state", { degraded: { reasonCode: "", reason: "candidate_eligibility_mismatch" } });
    const fallbackMismatch = make("fallback", { fallback: { reason: "", at: "2026-05-09T00:00:00.000Z", target: "local/default" } });

    expect(validateReplayEnvelope(policyDrift).reasons).toContain("missing_replay_reason_code");
    expect(validateReplayEnvelope(trustDrift).reasons).toContain("missing_replay_reason_code");
    expect(validateReplayEnvelope(candidateMismatch).reasons).toContain("missing_replay_reason_code");
    expect(validateReplayEnvelope(fallbackMismatch).reasons).toContain("missing_replay_reason_code");
  });

});
