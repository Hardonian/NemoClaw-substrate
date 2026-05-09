// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { evaluatePolicy, type PolicyBundle } from "./governance";
import type { DeviceRegistry } from "./device-registry";
import { type OperationalEvent, type OperationalMemoryLog, buildEventsFromReceipt } from "./operational-memory";
import type { ExecutionReceipt } from "./types";

export type RemoteExecutionStatus = "disabled" | "policy_denied" | "approval_required" | "unavailable" | "degraded" | "failed" | "succeeded" | "not_supported";
export interface RemoteExecutionRequest { requestId: string; nowIso: string; action: string; command: string; nodeId?: string; targetEndpoint?: string; auth?: { headerName?: string; token?: string }; approved?: boolean; timeoutMs?: number; }
export interface RemoteExecutionResult { status: RemoteExecutionStatus; output?: string; degradedReason?: string; errorCode?: string; receipt: ExecutionReceipt; events: OperationalEvent[]; replayRef: ExecutionReceipt["provenance"]; }
export interface RemoteExecutionTransport { execute(input: { endpoint: string; command: string; timeoutMs: number; auth?: { headerName?: string; token?: string } }): Promise<{ status: number; body: string }>; }
export interface RemoteExecutionError { code: string; message: string; retryable: boolean; }
export interface RemoteExecutionReceiptContext { transport: "http"; target: string; policyDecision: "allow" | "deny" | "approval_required" | "disabled"; redactedAuth: Record<string, string>; }
export interface RemoteExecutionConfig { enabled: boolean; source: "env" | "default"; }

export function parseRemoteExecutionConfig(env: NodeJS.ProcessEnv): RemoteExecutionConfig {
  const enabled = env.NEMOCLAW_REMOTE_EXECUTION === "1";
  return { enabled, source: enabled ? "env" : "default" };
}

function validateUrl(url: string): boolean { try { const u = new URL(url); return u.protocol === "http:" || u.protocol === "https:"; } catch { return false; } }
function redact(auth?: { headerName?: string }): Record<string, string> { return auth?.headerName ? { [auth.headerName]: "[REDACTED]" } : {}; }

export async function runRemoteExecution(input: { request: RemoteExecutionRequest; config: RemoteExecutionConfig; transport: RemoteExecutionTransport; policyBundle: PolicyBundle; registry: DeviceRegistry; operationalMemory?: OperationalMemoryLog }): Promise<RemoteExecutionResult> {
  const { request } = input;
  const target = request.nodeId ?? request.targetEndpoint ?? "unresolved";
  const policyDecision = !input.config.enabled ? "disabled" : (evaluatePolicy(input.policyBundle, { request: { version: "1", requestId: request.requestId, receivedAt: request.nowIso, source: "remote-execution", actor: "runtime", action: request.action, requestedModel: undefined, constraints: [], metadata: { target } }, actionClass: "runtime" }).requiredApproval ? "approval_required" : evaluatePolicy(input.policyBundle, { request: { version: "1", requestId: request.requestId, receivedAt: request.nowIso, source: "remote-execution", actor: "runtime", action: request.action, requestedModel: undefined, constraints: [], metadata: { target } }, actionClass: "runtime" }).allowed ? "allow" : "deny");
  const receiptBase = { version: "1" as const, receiptId: `remote-exec-${request.requestId}`, requestId: request.requestId, createdAt: request.nowIso, phases: [{ phase: "received", at: request.nowIso, notes: "execution_requested" }], toolInvocations: [], timing: { totalMs: 0 }, fallbackAttempts: [], operatorOverrides: [], provenance: { source: "remote-execution", lineage: ["worker", "remote"], replayVersion: "1" as const } };
  const context: RemoteExecutionReceiptContext = { transport: "http", target, policyDecision, redactedAuth: redact(request.auth) };
  const finalize = (status: RemoteExecutionStatus, notes: string, degradedReason?: string, errorCode?: string): RemoteExecutionResult => {
    const receipt: ExecutionReceipt = { ...receiptBase, phases: [...receiptBase.phases, { phase: "completed", at: request.nowIso, notes }], degradedEvents: degradedReason ? [{ category: "degraded", reason: degradedReason, affectedSubsystem: "remote-execution", severity: "warning", reasonCode: errorCode === "policy_blocked" ? "policy_blocked" : "transport_unreachable", explanation: degradedReason, sourceComponent: "remote-execution", timestamp: request.nowIso }] : [], policyDecision: policyDecision === "allow" ? { allowed: true, requiredApproval: false, reasons: [{ code: "policy_default_allow", explanation: "remote execution allowed", source: "default" }] } : { allowed: false, requiredApproval: policyDecision === "approval_required", reasons: [{ code: policyDecision === "disabled" ? "policy_default_deny" : "policy_rule_deny", explanation: notes, source: "remote-execution" }] }, metadata: context as never } as unknown as ExecutionReceipt;
    const events = input.operationalMemory ? buildEventsFromReceipt(receipt, "remote-execution", input.operationalMemory) : [];
    return { status, degradedReason, errorCode, receipt, events, replayRef: receipt.provenance };
  };

  if (!input.config.enabled) return finalize("disabled", "remote_execution_disabled", "disabled_by_flag", "policy_blocked");
  if (policyDecision === "deny") return finalize("policy_denied", "policy_denied", "policy_denied", "policy_blocked");
  if (policyDecision === "approval_required" && !request.approved) return finalize("approval_required", "approval_required", "approval_required", "approval_required");

  const node = request.nodeId ? input.registry.getNode(request.nodeId) : undefined;
  if (request.nodeId && !node) return finalize("unavailable", "node_unavailable", "node_not_registered", "transport_unreachable");
  if (node && node.health !== "healthy") return finalize("degraded", "node_degraded", "node_stale_or_unhealthy", "transport_unreachable");
  if (node && (node.workerTrustLevel === "revoked" || node.workerAttestationStatus === "revoked")) return finalize("degraded", "worker_revoked", "worker_revoked", "policy_blocked");
  if (node && node.workerAttestationStatus === "expired") return finalize("degraded", "attestation_expired", "attestation_expired", "policy_blocked");
  if (node && node.workerAttestationStatus === "conflict_detected") return finalize("degraded", "attestation_conflict", "attestation_conflict", "policy_blocked");
  if (node && node.workerTrustLevel && !["trusted_remote", "trusted_local"].includes(node.workerTrustLevel)) return finalize("degraded", "worker_trust_denied", "policy_denied", "policy_blocked");
  const endpoint = request.targetEndpoint ?? node?.endpoint;
  if (!endpoint || !validateUrl(endpoint)) return finalize("failed", "invalid_endpoint", "invalid_endpoint", "constraint_unsatisfied");

  try {
    const response = await input.transport.execute({ endpoint, command: request.command, timeoutMs: Math.max(250, Math.min(10_000, request.timeoutMs ?? 2_000)), auth: request.auth });
    if (response.status === 401 || response.status === 403) return finalize("degraded", "auth_rejected", "auth_rejected", "policy_blocked");
    if (response.status < 200 || response.status >= 300) return finalize("degraded", `http_${response.status}`, `http_${response.status}`, "transport_unreachable");
    let body: { status?: string; output?: string };
    try { body = JSON.parse(response.body) as { status?: string; output?: string }; } catch { return finalize("degraded", "malformed_response", "malformed_response", "unknown_error"); }
    if (body.status !== "ok") return finalize("failed", "remote_failed", "remote_failed", "unknown_error");
    const ok = finalize("succeeded", "execution_succeeded");
    return { ...ok, output: body.output };
  } catch (e) {
    const msg = e instanceof Error ? e.message.toLowerCase() : String(e).toLowerCase();
    return finalize("degraded", msg.includes("timeout") ? "timeout" : "network_unavailable", msg.includes("timeout") ? "timeout" : "network_unavailable", "transport_unreachable");
  }
}

export function summarizeRemoteExecutionDiagnostics(config: RemoteExecutionConfig, last?: { status: RemoteExecutionStatus; target?: string; receiptId?: string; reason?: string }): string[] {
  return [
    `Remote execution: ${config.enabled ? "enabled" : "disabled"} (${config.source})`,
    `Last status: ${last?.status ?? "none"}`,
    `Target: ${last?.target ?? "none"}`,
    `Policy/degraded: ${last?.reason ?? "none"}`,
    `Receipt: ${last?.receiptId ?? "none"}`,
  ];
}
