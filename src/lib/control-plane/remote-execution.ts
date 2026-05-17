// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createHash } from "crypto";
import { exec, execFile } from "child_process";
import { promisify } from "util";
import { evaluatePolicy, type PolicyBundle } from "./governance";
import type { DeviceRegistry } from "./device-registry";
import { type OperationalEvent, type OperationalMemoryLog, buildEventsFromReceipt } from "./operational-memory";
import {
  applyExecutionAuthorization,
  createExecutionPolicySnapshot,
  createExecutionTrustSnapshot,
  executionLineageFromPlan,
  validateExecutionAuthorization,
  type ExecutionApproval,
  type ExecutionPlan,
} from "./execution-plans";
import type { ExecutionReceipt } from "./types";
import {
  DEFAULT_SECURITY_POLICY,
  type CommandDescriptor,
  type CommandExecutionPolicy,
  redactSecurityPayload,
  validateCommandDescriptor,
  validateCommandString,
  validateRemoteUrl,
} from "../security/security-policy";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

export type RemoteExecutionStatus = "disabled" | "policy_denied" | "approval_required" | "authorization_denied" | "unavailable" | "degraded" | "failed" | "succeeded" | "not_supported";
export interface RemoteExecutionRequest { requestId: string; nowIso: string; action: string; command: string; commandDescriptor?: CommandDescriptor; nodeId?: string; targetEndpoint?: string; auth?: { headerName?: string; token?: string }; approved?: boolean; timeoutMs?: number; executionPlanRequired?: boolean; commandPolicy?: CommandExecutionPolicy; }
export interface RemoteExecutionResult { status: RemoteExecutionStatus; output?: string; degradedReason?: string; errorCode?: string; receipt: ExecutionReceipt; events: OperationalEvent[]; replayRef: ExecutionReceipt["provenance"]; }
export interface RemoteExecutionTransport { execute(input: { endpoint: string; command: string; timeoutMs: number; auth?: { headerName?: string; token?: string } }): Promise<{ status: number; body: string }>; }
export interface RemoteExecutionError { code: string; message: string; retryable: boolean; }
export interface RemoteExecutionReceiptContext { transport: "http"; target: string; policyDecision: "allow" | "deny" | "approval_required" | "disabled"; redactedAuth: Record<string, string>; }
export interface RemoteExecutionConfig { enabled: boolean; source: "env" | "default"; }
export interface RemoteExecutionLineageSummary {
  executionPlanId?: string;
  executionApprovalId?: string;
  authorizationLineageId?: string;
  executionPolicySnapshotHash?: string;
  executionTrustSnapshotHash?: string;
  executionIntentHash?: string;
  replayReferenceId?: string;
}

export function parseRemoteExecutionConfig(env: NodeJS.ProcessEnv): RemoteExecutionConfig {
  const enabled = env.NEMOCLAW_REMOTE_EXECUTION === "1";
  return { enabled, source: enabled ? "env" : "default" };
}

function redact(auth?: { headerName?: string; token?: string }): Record<string, string> {
  if (!auth?.headerName) return {};
  return redactSecurityPayload({ [auth.headerName]: auth.token ?? "<present>" }) as Record<string, string>;
}

export function computeOutputHash(output: string): string {
  return createHash("sha256").update(output).digest("hex");
}

export function verifyResultHash(output: string, expectedHash: string): boolean {
  if (!expectedHash) return true;
  return computeOutputHash(output) === expectedHash;
}

export async function executeSshCommand(credentials: SshCredentials, command: string, timeoutMs: number): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const sshArgs = [
    "-o", "StrictHostKeyChecking=no",
    "-o", `ConnectTimeout=${Math.max(1, Math.floor(timeoutMs / 1000))}`,
    "-o", "BatchMode=yes",
    "-p", String(credentials.port),
  ];
  if (credentials.privateKeyPath) {
    sshArgs.push("-i", credentials.privateKeyPath);
  }
  sshArgs.push(`${credentials.user}@${credentials.host}`);
  sshArgs.push(command);

  try {
    const { stdout, stderr } = await execFileAsync("ssh", sshArgs, { timeout: timeoutMs });
    return { stdout, stderr, exitCode: 0 };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isTimeout = msg.toLowerCase().includes("timeout") || msg.toLowerCase().includes("timed out");
    const codeMatch = msg.match(/exit code (\d+)/);
    const exitCode = codeMatch ? parseInt(codeMatch[1], 10) : (isTimeout ? 124 : 1);
    const stderr = msg;
    const stdout = "";
    return { stdout, stderr, exitCode };
  }
}

export async function executeSignedHttps(endpoint: string, command: string, timeoutMs: number, signingKey: string): Promise<{ status: number; body: string }> {
  const payload = JSON.stringify({ command, timestamp: Date.now() });
  const signature = createHash("sha256").update(signingKey + payload).digest("hex");

  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return { status: 500, body: JSON.stringify({ error: "invalid_endpoint_url" }) };
  }
  url.searchParams.set("sig", signature);

  try {
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Signature": signature },
      body: payload,
      signal: AbortSignal.timeout(timeoutMs),
    });
    const body = await response.text();
    return { status: response.status, body };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isTimeout = msg.toLowerCase().includes("timeout") || msg.toLowerCase().includes("timed out") || msg.toLowerCase().includes("abort");
    return { status: isTimeout ? 408 : 500, body: JSON.stringify({ error: msg }) };
  }
}

export async function executeRemoteWorkerProof(config: RemoteWorkerProofConfig, command: string): Promise<RemoteWorkerProofResult> {
  const start = Date.now();

  if (config.transportType === "ssh") {
    const creds = config.credentials as SshCredentials;
    if (!creds.host || !creds.user) {
      return { success: false, output: "", outputHash: "", hashMatches: false, durationMs: Date.now() - start, error: "missing_ssh_credentials" };
    }
    const result = await executeSshCommand(creds, command, config.timeoutMs);
    const output = result.exitCode === 0 ? result.stdout : result.stderr;
    const outputHash = computeOutputHash(output);
    const hashMatches = config.expectedOutputHash ? outputHash === config.expectedOutputHash : true;
    return {
      success: result.exitCode === 0 && hashMatches,
      output,
      outputHash,
      hashMatches,
      durationMs: Date.now() - start,
      error: result.exitCode !== 0 ? `exit_code_${result.exitCode}` : !hashMatches ? "hash_mismatch" : undefined,
    };
  }

  if (config.transportType === "https-signed") {
    const signedCreds = config.credentials as { endpoint: string; signingKey: string };
    if (!signedCreds.endpoint || !signedCreds.signingKey) {
      return { success: false, output: "", outputHash: "", hashMatches: false, durationMs: Date.now() - start, error: "missing_signed_https_credentials" };
    }
    const response = await executeSignedHttps(signedCreds.endpoint, command, config.timeoutMs, signedCreds.signingKey);
    const output = response.body;
    const outputHash = computeOutputHash(output);
    const hashMatches = config.expectedOutputHash ? outputHash === config.expectedOutputHash : true;
    return {
      success: response.status >= 200 && response.status < 300 && hashMatches,
      output,
      outputHash,
      hashMatches,
      durationMs: Date.now() - start,
      error: response.status < 200 || response.status >= 300 ? `http_${response.status}` : !hashMatches ? "hash_mismatch" : undefined,
    };
  }

  return { success: false, output: "", outputHash: "", hashMatches: false, durationMs: Date.now() - start, error: "unsupported_transport" };
}

export async function runRemoteExecution(input: { request: RemoteExecutionRequest; config: RemoteExecutionConfig; transport: RemoteExecutionTransport; policyBundle: PolicyBundle; registry: DeviceRegistry; operationalMemory?: OperationalMemoryLog; executionPlan?: ExecutionPlan; executionApproval?: ExecutionApproval }): Promise<RemoteExecutionResult> {
  const { request } = input;
  const target = request.nodeId ?? request.targetEndpoint ?? "unresolved";
  const policyEval = evaluatePolicy(input.policyBundle, { request: { version: "1", requestId: request.requestId, receivedAt: request.nowIso, source: "remote-execution", actor: "runtime", action: request.action, requestedModel: undefined, constraints: [], metadata: { target } }, actionClass: "remote_node" });
  const policyDecision = !input.config.enabled ? "disabled" : (policyEval.requiredApproval ? "approval_required" : policyEval.allowed ? "allow" : "deny");
  const receiptBase = { version: "1" as const, receiptId: `remote-exec-${request.requestId}`, requestId: request.requestId, createdAt: request.nowIso, phases: [{ phase: "received", at: request.nowIso, notes: "execution_requested" }], toolInvocations: [], timing: { totalMs: 0 }, fallbackAttempts: [], operatorOverrides: [], provenance: { source: "remote-execution", lineage: ["worker", "remote"], replayVersion: "1" as const } };
  const context: RemoteExecutionReceiptContext = { transport: "http", target, policyDecision, redactedAuth: redact(request.auth) };
  const finalize = (status: RemoteExecutionStatus, notes: string, degradedReason?: string, errorCode?: string, plan?: ExecutionPlan): RemoteExecutionResult => {
    const receipt: ExecutionReceipt = redactSecurityPayload({ ...receiptBase, phases: [...receiptBase.phases, { phase: "completed", at: request.nowIso, notes }], degradedEvents: degradedReason ? [{ category: "degraded", reason: degradedReason, affectedSubsystem: "remote-execution", severity: "warning", reasonCode: errorCode === "policy_blocked" || errorCode === "approval_required" ? "policy_blocked" : "transport_unreachable", explanation: degradedReason, sourceComponent: "remote-execution", timestamp: request.nowIso }] : [], policyDecision: policyDecision === "allow" ? { allowed: true, requiredApproval: false, reasons: [{ code: policyEval.reasonCode, explanation: "remote execution allowed", source: policyEval.sourceRuleId }] } : { allowed: false, requiredApproval: policyDecision === "approval_required", reasons: [{ code: policyDecision === "disabled" ? "policy_default_deny" : policyEval.reasonCode, explanation: notes, source: policyEval.sourceRuleId }] }, executionLineage: plan ? executionLineageFromPlan(plan, input.executionApproval, plan.authorization?.result) : undefined, metadata: context as never }) as unknown as ExecutionReceipt;
    const events = input.operationalMemory ? buildEventsFromReceipt(receipt, "remote-execution", input.operationalMemory) : [];
    return { status, degradedReason, errorCode, receipt, events, replayRef: receipt.provenance };
  };

  if (!input.config.enabled) return finalize("disabled", "remote_execution_disabled", "disabled_by_flag", "policy_blocked");
  if (policyDecision === "deny") return finalize("policy_denied", "policy_denied", "policy_denied", "policy_blocked");
  if (policyDecision === "approval_required" && !request.approved) return finalize("approval_required", "approval_required", "approval_required", "approval_required");

  const node = request.nodeId ? input.registry.getNode(request.nodeId) : undefined;
  if (request.executionPlanRequired && !input.executionPlan) return finalize("authorization_denied", "missing_execution_plan_lineage", "missing_execution_plan_lineage", "approval_required");
  if (input.executionPlan) {
    const currentPolicySnapshot = createExecutionPolicySnapshot({
      capturedAt: input.executionPlan.policySnapshot.capturedAt,
      governedRoutingEnabled: input.executionPlan.policySnapshot.governedRoutingEnabled,
      heterogeneousRoutingEnabled: input.executionPlan.policySnapshot.heterogeneousRoutingEnabled,
      remoteExecutionEnabled: input.config.enabled,
      policy: policyEval,
      fallbackPermitted: input.executionPlan.policySnapshot.fallbackPermitted,
      trustRequirement: input.executionPlan.policySnapshot.trustRequirement,
      attestationRequirement: input.executionPlan.policySnapshot.attestationRequirement,
      selectedCandidateClass: input.executionPlan.policySnapshot.selectedCandidateClass,
      workerTrustLevel: node?.workerTrustLevel,
      workerAttestationStatus: node?.workerAttestationStatus,
      executionMode: input.executionPlan.intent.executionMode,
    });
    const currentTrustSnapshot = createExecutionTrustSnapshot({
      capturedAt: input.executionPlan.trustSnapshot.capturedAt,
      node,
      trustRequirement: input.executionPlan.trustSnapshot.trustRequirement,
      attestationRequirement: input.executionPlan.trustSnapshot.attestationRequirement,
    });
    const authorization = validateExecutionAuthorization({
      nowIso: request.nowIso,
      plan: input.executionPlan,
      approval: input.executionApproval,
      currentIntent: { ...input.executionPlan.intent, requestId: request.requestId, action: request.action, command: request.command, targetNodeId: request.nodeId ?? input.executionPlan.intent.targetNodeId, targetEndpoint: request.targetEndpoint ?? input.executionPlan.intent.targetEndpoint },
      currentPolicySnapshot,
      currentTrustSnapshot,
    });
    const authorizedPlan = applyExecutionAuthorization(input.executionPlan, authorization);
    if (!authorization.granted) return finalize("authorization_denied", authorization.reasonCodes.join(","), authorization.reasonCodes.join(","), "approval_required", authorizedPlan);
    input.executionPlan = authorizedPlan;
  }
  if (request.nodeId && !node) return finalize("unavailable", "node_unavailable", "node_not_registered", "transport_unreachable");
  if (node && node.health !== "healthy") return finalize("degraded", "node_degraded", "node_stale_or_unhealthy", "transport_unreachable");
  if (node && (node.workerTrustLevel === "revoked" || node.workerAttestationStatus === "revoked")) return finalize("degraded", "worker_revoked", "worker_revoked", "policy_blocked");
  if (node && node.workerAttestationStatus === "expired") return finalize("degraded", "attestation_expired", "attestation_expired", "policy_blocked");
  if (node && node.workerAttestationStatus === "conflict_detected") return finalize("degraded", "attestation_conflict", "attestation_conflict", "policy_blocked");
  if (node && node.workerTrustLevel && !["trusted_remote", "trusted_local"].includes(node.workerTrustLevel)) return finalize("degraded", "worker_trust_denied", "policy_denied", "policy_blocked");
  const endpoint = request.targetEndpoint ?? node?.endpoint;
  if (!endpoint) return finalize("failed", "invalid_endpoint", "invalid_endpoint", "constraint_unsatisfied");
  const urlDecision = validateRemoteUrl(endpoint, request.timeoutMs);
  if (!urlDecision.decision.allowed || !urlDecision.url) return finalize("failed", urlDecision.decision.reasonCode, urlDecision.decision.reasonCode, "constraint_unsatisfied");
  const commandDecision = request.commandDescriptor
    ? validateCommandDescriptor(request.commandDescriptor, request.commandPolicy ?? DEFAULT_SECURITY_POLICY.commandExecution)
    : validateCommandString(request.command, request.commandPolicy ?? DEFAULT_SECURITY_POLICY.commandExecution, request.timeoutMs);
  if (!commandDecision.decision.allowed || !commandDecision.descriptor) {
    return finalize("failed", commandDecision.decision.reasonCode, commandDecision.decision.reasonCode, "policy_blocked");
  }
  const safeCommand = [commandDecision.descriptor.name, ...commandDecision.descriptor.argv].join(" ");

  try {
    const response = await input.transport.execute({ endpoint: urlDecision.url.toString(), command: safeCommand, timeoutMs: commandDecision.descriptor.timeoutMs, auth: request.auth });
    if (response.status === 401 || response.status === 403) return finalize("degraded", "auth_rejected", "auth_rejected", "policy_blocked");
    if (response.status < 200 || response.status >= 300) return finalize("degraded", `http_${response.status}`, `http_${response.status}`, "transport_unreachable");
    let body: { status?: string; output?: string };
    try { body = JSON.parse(response.body) as { status?: string; output?: string }; } catch { return finalize("degraded", "malformed_response", "malformed_response", "unknown_error"); }
    if (body.status !== "ok") return finalize("failed", "remote_failed", "remote_failed", "unknown_error");
    const ok = finalize("succeeded", "execution_succeeded", undefined, undefined, input.executionPlan);
    return { ...ok, output: body.output };
  } catch (e) {
    const msg = e instanceof Error ? e.message.toLowerCase() : String(e).toLowerCase();
    return finalize("degraded", msg.includes("timeout") ? "timeout" : "network_unavailable", msg.includes("timeout") ? "timeout" : "network_unavailable", "transport_unreachable");
  }
}

export function summarizeRemoteExecutionDiagnostics(config: RemoteExecutionConfig, last?: { status: RemoteExecutionStatus; target?: string; receiptId?: string; reason?: string; lineage?: RemoteExecutionLineageSummary }): string[] {
  return [
    `Remote execution: ${config.enabled ? "enabled" : "disabled"} (${config.source})`,
    `Last status: ${last?.status ?? "none"}`,
    `Target: ${last?.target ?? "none"}`,
    `Policy/degraded: ${last?.reason ?? "none"}`,
    `Execution plan: ${last?.lineage?.executionPlanId ?? "none"}`,
    `Approval state: ${last?.lineage?.executionApprovalId ? "recorded" : "none"}`,
    `Authorization state: ${last?.lineage?.authorizationLineageId ? "recorded" : "none"}`,
    `Policy snapshot hash: ${last?.lineage?.executionPolicySnapshotHash ?? "none"}`,
    `Trust snapshot hash: ${last?.lineage?.executionTrustSnapshotHash ?? "none"}`,
    `Intent hash: ${last?.lineage?.executionIntentHash ?? "none"}`,
    `Replay reference: ${last?.lineage?.replayReferenceId ?? "none"}`,
    `Receipt: ${last?.receiptId ?? "none"}`,
  ];
}
