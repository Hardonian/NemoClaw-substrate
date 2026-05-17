// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { DeviceRegistry } from "./device-registry";
import { evaluatePolicy, type PolicyBundle } from "./governance";
import { scheduleDeterministically } from "./scheduler";
import { deterministicSerialize } from "./serde";
import { classifyRequest } from "./task-classification";
import type { ControlRequestEnvelope, DegradedState, ExecutionReceipt, NodeDescriptor } from "./types";
import { validateDegradedState } from "./validation";

function makeNode(nodeId: string, hb = "2026-05-09T00:00:00.000Z", role: NodeDescriptor["role"] = "local"): NodeDescriptor { return { version: "1", nodeId, role, transport: "unix", endpoint: "local:///sandbox", trustClass: "trusted", registeredAt: hb, lastHeartbeatAt: hb, health: "healthy", metadata: {}, capabilities: { version: "1", capturedAt: hb, source: "test", runtimeBackend: "openai-compatible", executionMode: role === "remote" ? "remote" : "local", gpus: [{ vendor: "nvidia", model: "L40S", vramMb: 48000, count: 1 }], models: [{ modelId: "nvidia/model", maxContextTokens: 128000, flags: { streaming: true, tools: true, batch: false, multimodal: false, quantization: true }, inferenceConstraints: [], executionRestrictions: [] }], policyTags: [], reliabilityTags: [], runtimeTags: [], transportRequirements: [] } }; }
const request: ControlRequestEnvelope = { version: "1", requestId: "req", receivedAt: "2026-05-09T00:00:00.000Z", source: "test", actor: "user", action: "chat", constraints: [], metadata: {} };

describe("control-plane foundations", () => {
  it("serializes deterministically", () => expect(deterministicSerialize({ b: 1, a: { d: 2, c: 3 } })).toEqual(deterministicSerialize({ a: { c: 3, d: 2 }, b: 1 })));
  it("orders registry nodes deterministically", () => { const r = new DeviceRegistry(); r.registerNode(makeNode("b")); r.registerNode(makeNode("a")); expect(r.listNodes().map((n) => n.nodeId)).toEqual(["a", "b"]); });
  it("returns explicit missing-node semantics", () => { const r = new DeviceRegistry(); expect(r.updateHeartbeat("missing", "2026-05-09T00:00:01.000Z")).toEqual({ ok: false, reasonCode: "node_missing" }); });
  it("marks stale heartbeats deterministically", () => { const r = new DeviceRegistry(); r.registerNode(makeNode("a")); const s = r.summarizeHealth("2026-05-09T00:01:00.000Z", 5000); expect(s.byHealth.stale).toBe(1); });
  it("registry preserves trust/capability provenance", () => {
    const r = new DeviceRegistry();
    const node = makeNode("trusted-1", "2026-05-09T00:00:00.000Z", "remote");
    node.workerTrustLevel = "trusted_remote";
    node.workerAttestationStatus = "operator_approved";
    r.registerNode(node);
    r.updateCapabilities("trusted-1", { ...node.capabilities, source: "probe://runtime", runtimeTags: ["attestation:operator_approved"] });
    const stored = r.getNode("trusted-1");
    expect(stored?.workerTrustLevel).toBe("trusted_remote");
    expect(stored?.workerAttestationStatus).toBe("operator_approved");
    expect(stored?.capabilities.source).toBe("probe://runtime");
    expect(stored?.capabilities.runtimeTags).toContain("attestation:operator_approved");
  });
  it("validates degraded state semantics", () => { const d: DegradedState = { category: "healthy", reason: "ok", affectedSubsystem: "registry", severity: "info", reasonCode: "heartbeat_stale", explanation: "x", sourceComponent: "test", timestamp: "2026-05-09T00:00:00.000Z" }; expect(validateDegradedState(d)).toContain("healthy category must use reasonCode=none"); });
  it("keeps receipt serialization stable", () => { const rec: ExecutionReceipt = { version: "1", receiptId: "r1", requestId: "q1", createdAt: "2026-05-09T00:00:00.000Z", phases: [{ phase: "received", at: "2026-05-09T00:00:00.000Z" }], degradedEvents: [], degradedStateTriggers: [], toolInvocations: [], timing: {}, provenance: { source: "test", lineage: ["root"], replayVersion: "1" }, operatorOverrides: [] }; expect(deterministicSerialize(rec)).toEqual('{"createdAt":"2026-05-09T00:00:00.000Z","degradedEvents":[],"degradedStateTriggers":[],"operatorOverrides":[],"phases":[{"at":"2026-05-09T00:00:00.000Z","phase":"received"}],"provenance":{"lineage":["root"],"replayVersion":"1","source":"test"},"receiptId":"r1","requestId":"q1","timing":{},"toolInvocations":[],"version":"1"}'); });
  it("evaluates policy deterministically", () => { const b: PolicyBundle = { id: "default", version: "1", defaultEffect: "allow", rules: [{ id: "z", order: 10, description: "deny shell", effect: "deny", reasonCode: "policy_rule_deny", matches: (c) => c.actionClass === "shell" }] }; expect(evaluatePolicy(b, { request, actionClass: "shell" }).sourceRuleId).toBe("z"); });
  it("classifies deterministically", () => { expect(classifyRequest({ ...request, action: "shell_exec", constraints: ["local-only", "context-large", "provider:local"] }).taskKind).toBe("shell"); });
  it("schedules deterministically with degraded state trigger", () => { const r = new DeviceRegistry(); r.registerNode(makeNode("node-b")); r.registerNode(makeNode("node-a")); const out = scheduleDeterministically({ request, classification: classifyRequest(request), registry: r, policy: evaluatePolicy({ id: "p", version: "1", defaultEffect: "allow", rules: [] }, { request, actionClass: "generic" }), degradedStates: [] }); expect(out.decision.selected?.nodeId).toBe("node-a"); expect(out.degradedStateTriggerPlan.length).toBeGreaterThanOrEqual(1); });
});
