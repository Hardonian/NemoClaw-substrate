// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from "vitest";
import { createDeviceRegistry } from "./device-registry";
import type { PolicyBundle } from "./governance";
import { evaluatePolicy } from "./governance";
import { OperationalMemoryLog } from "./operational-memory";
import { parseRemoteExecutionConfig, runRemoteExecution, summarizeRemoteExecutionDiagnostics } from "./remote-execution";
import {
  approveExecutionPlan,
  createExecutionPlan,
  createExecutionPolicySnapshot,
  createExecutionTrustSnapshot,
} from "./execution-plans";
import type { NodeDescriptor } from "./types";

const allowPolicy: PolicyBundle = { version: "1", id: "b1", defaultEffect: "allow", rules: [] };
const denyPolicy: PolicyBundle = { version: "1", id: "b2", defaultEffect: "deny", rules: [] };
const approvalPolicy: PolicyBundle = { version: "1", id: "b3", defaultEffect: "deny", rules: [{ id: "a", order: 1, description: "a", effect: "approval_required", reasonCode: "policy_rule_approval_required", matches: () => true }] };
const now = "2026-05-09T00:00:00.000Z";

const receiptLineage = (receipt: unknown) =>
  (receipt as { executionLineage?: { executionPlanId?: string; executionApprovalId?: string } })
    .executionLineage;

function trustedWorker(): NodeDescriptor {
  return {
    version: "1",
    nodeId: "worker-1",
    role: "remote",
    transport: "http",
    endpoint: "https://worker",
    trustClass: "trusted",
    registeredAt: now,
    lastHeartbeatAt: now,
    health: "healthy",
    metadata: {},
    workerTrustLevel: "trusted_remote",
    workerAttestationStatus: "operator_approved",
    workerTrustReasonCodes: ["operator_approved"],
    workerLastAttestedAt: now,
    capabilities: { version: "1", capturedAt: now, source: "test", runtimeBackend: "mock", executionMode: "remote", gpus: [], models: [], policyTags: [], reliabilityTags: [], runtimeTags: [], transportRequirements: [] },
  };
}

function approvedPlan() {
  const node = trustedWorker();
  const registry = createDeviceRegistry();
  registry.registerNode(node);
  const request = { version: "1", requestId: "r-plan", receivedAt: now, source: "test", actor: "operator", action: "worker:execute", constraints: [], metadata: { target: "worker-1" } };
  const policy = evaluatePolicy(approvalPolicy, { request, actionClass: "remote_node" });
  const intent = { requestId: "r-plan", actor: "operator", action: "worker:execute", command: "run:model", targetNodeId: "worker-1", executionMode: "remote" as const, metadata: {} };
  const plan = createExecutionPlan({
    intent,
    policySnapshot: createExecutionPolicySnapshot({ capturedAt: now, governedRoutingEnabled: true, heterogeneousRoutingEnabled: true, remoteExecutionEnabled: true, policy, degradedStateTriggerPermitted: false, selectedCandidateClass: "remote_worker", workerTrustLevel: node.workerTrustLevel, workerAttestationStatus: node.workerAttestationStatus, executionMode: "remote" }),
    trustSnapshot: createExecutionTrustSnapshot({ capturedAt: now, node }),
    createdAt: now,
    actor: "operator",
  });
  return { registry, ...approveExecutionPlan(plan, { actor: "operator", approvedAt: now, expiresAt: "2026-05-09T01:00:00.000Z" }) };
}

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

  it("preserves default remote behavior when no execution plan is supplied", async () => {
    const transport = { execute: vi.fn().mockResolvedValue({ status: 200, body: JSON.stringify({ status: "ok", output: "done" }) }) };
    const out = await runRemoteExecution({ request: { requestId: "r-default", nowIso: now, action: "worker:execute", command: "echo hi", targetEndpoint: "https://worker", approved: true }, config: { enabled: true, source: "env" }, transport, policyBundle: allowPolicy, registry: createDeviceRegistry() });
    expect(out.status).toBe("succeeded");
    expect(receiptLineage(out.receipt)).toBeUndefined();
    expect(transport.execute).toHaveBeenCalledTimes(1);
  });

  it("blocks before transport when a required execution plan is missing", async () => {
    const transport = { execute: vi.fn() };
    const out = await runRemoteExecution({ request: { requestId: "r-required", nowIso: now, action: "worker:execute", command: "echo hi", targetEndpoint: "https://worker", approved: true, executionPlanRequired: true }, config: { enabled: true, source: "env" }, transport, policyBundle: allowPolicy, registry: createDeviceRegistry() });
    expect(out.status).toBe("authorization_denied");
    expect(out.degradedReason).toBe("missing_execution_plan_lineage");
    expect(transport.execute).not.toHaveBeenCalled();
  });

  it("blocks transport for unsafe command descriptors", async () => {
    const transport = { execute: vi.fn() };
    const out = await runRemoteExecution({
      request: {
        requestId: "r-command-shell",
        nowIso: now,
        action: "worker:execute",
        command: "echo ok",
        commandDescriptor: { name: "echo", argv: ["ok"], shell: true as false },
        targetEndpoint: "https://worker",
        approved: true,
      },
      config: { enabled: true, source: "env" },
      transport,
      policyBundle: allowPolicy,
      registry: createDeviceRegistry(),
    });
    expect(out.status).toBe("failed");
    expect(out.degradedReason).toBe("command_shell_denied");
    expect(transport.execute).not.toHaveBeenCalled();
  });

  it("blocks transport for command allowlist denial", async () => {
    const transport = { execute: vi.fn() };
    const out = await runRemoteExecution({
      request: {
        requestId: "r-command-allowlist",
        nowIso: now,
        action: "worker:execute",
        command: "curl https://example.com",
        commandPolicy: {
          allowlist: ["nvidia-smi"],
          denylist: [],
          timeoutCeilingMs: 10_000,
          defaultTimeoutMs: 2_000,
          stdoutMaxBytes: 100,
          stderrMaxBytes: 100,
          requireShellFalse: true,
        },
        targetEndpoint: "https://worker",
        approved: true,
      },
      config: { enabled: true, source: "env" },
      transport,
      policyBundle: allowPolicy,
      registry: createDeviceRegistry(),
    });
    expect(out.status).toBe("failed");
    expect(out.degradedReason).toBe("command_allowlist_denied");
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
    expect(JSON.stringify(log.list())).not.toContain("secret");
    expect(log.list().length).toBeGreaterThan(0);
  });

  it("allows remote transport only with valid approved execution-plan lineage", async () => {
    const { registry, plan, approval } = approvedPlan();
    const transport = { execute: vi.fn().mockResolvedValue({ status: 200, body: JSON.stringify({ status: "ok", output: "lineage" }) }) };
    const out = await runRemoteExecution({ request: { requestId: "r-plan", nowIso: now, action: "worker:execute", command: "run:model", nodeId: "worker-1", approved: true, executionPlanRequired: true }, config: { enabled: true, source: "env" }, transport, policyBundle: approvalPolicy, registry, executionPlan: plan, executionApproval: approval });
    expect(out.status).toBe("succeeded");
    expect(receiptLineage(out.receipt)?.executionPlanId).toBe(plan.planId);
    expect(receiptLineage(out.receipt)?.executionApprovalId).toBe(approval.approvalId);
    expect(transport.execute).toHaveBeenCalledTimes(1);
  });

  it("blocks transport for revoked execution approval lineage", async () => {
    const { registry, plan, approval } = approvedPlan();
    const revoked = { ...approval, state: "revoked" as const, decision: "revoked" as const };
    const transport = { execute: vi.fn() };
    const out = await runRemoteExecution({ request: { requestId: "r-plan", nowIso: now, action: "worker:execute", command: "run:model", nodeId: "worker-1", approved: true, executionPlanRequired: true }, config: { enabled: true, source: "env" }, transport, policyBundle: approvalPolicy, registry, executionPlan: plan, executionApproval: revoked });
    expect(out.status).toBe("authorization_denied");
    expect(out.degradedReason).toContain("approval_revoked");
    expect(transport.execute).not.toHaveBeenCalled();
  });

  it("supports timeout/network degraded and diagnostics summary", async () => {
    const transport = { execute: vi.fn().mockRejectedValue(new Error("timeout")) };
    const out = await runRemoteExecution({ request: { requestId: "r7", nowIso: "2026-05-09T00:00:00.000Z", action: "worker:execute", command: "echo hi", targetEndpoint: "https://worker", approved: true }, config: { enabled: true, source: "env" }, transport, policyBundle: allowPolicy, registry: createDeviceRegistry() });
    expect(out.degradedReason).toBe("timeout");
    expect(summarizeRemoteExecutionDiagnostics({ enabled: true, source: "env" }, { status: out.status, target: "worker", receiptId: out.receipt.receiptId, reason: out.degradedReason })[0]).toContain("enabled");
  });

  it("diagnostics expose execution-plan authorization lineage", async () => {
    const { registry, plan, approval } = approvedPlan();
    const out = await runRemoteExecution({ request: { requestId: "r-plan", nowIso: now, action: "worker:execute", command: "run:model", nodeId: "worker-1", approved: true, executionPlanRequired: true }, config: { enabled: true, source: "env" }, transport: { execute: vi.fn().mockResolvedValue({ status: 200, body: JSON.stringify({ status: "ok" }) }) }, policyBundle: approvalPolicy, registry, executionPlan: plan, executionApproval: approval });
    const diagnostics = summarizeRemoteExecutionDiagnostics({ enabled: true, source: "env" }, { status: out.status, receiptId: out.receipt.receiptId, lineage: receiptLineage(out.receipt) }).join("\n");
    expect(diagnostics).toContain("Execution plan:");
    expect(diagnostics).toContain("Approval state: recorded");
    expect(diagnostics).toContain("Authorization state: recorded");
    expect(diagnostics).toContain("Policy snapshot hash:");
    expect(diagnostics).toContain("Trust snapshot hash:");
    expect(diagnostics).toContain("Intent hash:");
  });
});
