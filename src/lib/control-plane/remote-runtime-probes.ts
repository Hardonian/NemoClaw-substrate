// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { DegradedState } from "./types";
import type { WorkerProbeRequest, WorkerProbeResult } from "./worker-probes";

export interface RemoteHttpAuthConfig { headerName: string; token?: string; }
export interface RemoteHttpProbeRequest {
  requestId: string;
  nodeId: string;
  runtime: WorkerProbeRequest["runtime"];
  endpoint: string;
  nowIso: string;
  timeoutMs?: number;
  auth?: RemoteHttpAuthConfig;
}

export interface RemoteSshProbeRequest { requestId: string; nodeId: string; runtime: WorkerProbeRequest["runtime"]; endpoint: string; nowIso: string; }

function degraded(nowIso: string, reasonCode: DegradedState["reasonCode"], reason: string): DegradedState {
  return { category: "degraded", reason, affectedSubsystem: "remote-probe", severity: "warning", reasonCode, explanation: reason, sourceComponent: "remote-runtime-probes", timestamp: nowIso };
}

function validateRemoteHttpEndpoint(endpoint: string): { ok: true; url: URL } | { ok: false; reason: string } {
  let parsed: URL;
  try { parsed = new URL(endpoint); } catch { return { ok: false, reason: "malformed_url" }; }
  if (!["http:", "https:"].includes(parsed.protocol)) return { ok: false, reason: "unsupported_scheme" };
  return { ok: true, url: parsed };
}

function redactHeaders(auth?: RemoteHttpAuthConfig): Record<string, string> {
  if (!auth?.headerName) return {};
  return { [auth.headerName]: "[REDACTED]" };
}

export async function runRemoteHttpHealthProbe(input: RemoteHttpProbeRequest): Promise<WorkerProbeResult> {
  const validated = validateRemoteHttpEndpoint(input.endpoint);
  const request: WorkerProbeRequest = { requestId: input.requestId, nodeId: input.nodeId, runtime: input.runtime, transport: "http", endpoint: input.endpoint, nowIso: input.nowIso };
  const base = { request, capability: { runtimeBackend: input.runtime, executionMode: "remote" as const, models: [] }, telemetry: { capturedAt: input.nowIso, runtimeHealth: { state: "unavailable" as const, reason: "not_probed" }, backendVersion: { state: "unavailable" as const, reason: "not_probed" }, modelInventory: { state: "unavailable" as const, reason: "not_probed" }, gpus: { state: "unavailable" as const, reason: "remote_probe_http" }, runtimeMetrics: {} } };
  if (!validated.ok) {
    return { ...base, status: "failed", degradedStates: [degraded(input.nowIso, "constraint_unsatisfied", validated.reason)], error: { code: "probe_not_supported", message: validated.reason, retryable: false } };
  }

  const timeoutMs = Math.max(250, Math.min(10_000, input.timeoutMs ?? 2_000));
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const headers = new Headers();
    if (input.auth?.headerName && input.auth.token) headers.set(input.auth.headerName, input.auth.token);
    const response = await fetch(validated.url, { method: "GET", headers, signal: ctl.signal });
    const body = (await response.text()).trim();
    if (response.status === 401 || response.status === 403) {
      return { ...base, status: "degraded", degradedStates: [degraded(input.nowIso, "policy_blocked", "auth_rejected")], telemetry: { ...base.telemetry, runtimeHealth: { state: "degraded", reason: "auth_rejected" } }, error: { code: "transport_unreachable", message: "auth_rejected", retryable: true } };
    }
    if (!response.ok) {
      return { ...base, status: "degraded", degradedStates: [degraded(input.nowIso, "transport_unreachable", `http_${response.status}`)], telemetry: { ...base.telemetry, runtimeHealth: { state: "degraded", reason: `http_${response.status}` } }, error: { code: "transport_unreachable", message: `HTTP ${response.status}`, retryable: true } };
    }
    let parsed: Record<string, unknown> | undefined;
    if (body) {
      try { parsed = JSON.parse(body) as Record<string, unknown>; } catch { return { ...base, status: "degraded", degradedStates: [degraded(input.nowIso, "unknown_error", "malformed_response")], error: { code: "unknown_error", message: "malformed_response", retryable: true } }; }
    }
    return { ...base, status: "succeeded", degradedStates: [], capability: { ...base.capability, models: Array.isArray(parsed?.models) ? (parsed?.models as string[]) : [] }, telemetry: { ...base.telemetry, runtimeHealth: { state: "observed", value: "healthy", observedAt: input.nowIso }, backendVersion: { state: parsed?.version ? "observed" : "unavailable", value: typeof parsed?.version === "string" ? parsed.version : undefined }, modelInventory: { state: Array.isArray(parsed?.models) ? "observed" : "unavailable", value: Array.isArray(parsed?.models) ? (parsed.models as string[]) : undefined } } };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const isTimeout = msg.toLowerCase().includes("abort");
    return { ...base, status: "degraded", degradedStates: [degraded(input.nowIso, "transport_unreachable", isTimeout ? "timeout" : "network_unavailable")], error: { code: "transport_unreachable", message: isTimeout ? "timeout" : "network_unavailable", retryable: true }, telemetry: { ...base.telemetry, runtimeHealth: { state: "unavailable", reason: isTimeout ? "timeout" : "network_unavailable" } } };
  } finally { clearTimeout(timer); }
}

export function runRemoteSshProbePlaceholder(input: RemoteSshProbeRequest): WorkerProbeResult {
  return {
    request: { requestId: input.requestId, nodeId: input.nodeId, runtime: input.runtime, transport: "ssh", endpoint: input.endpoint, nowIso: input.nowIso },
    status: "not_supported",
    capability: { runtimeBackend: input.runtime, executionMode: "remote", models: [] },
    telemetry: { capturedAt: input.nowIso, runtimeHealth: { state: "unavailable", reason: "not_implemented" }, backendVersion: { state: "unavailable", reason: "not_implemented" }, modelInventory: { state: "unavailable", reason: "not_implemented" }, gpus: { state: "unavailable", reason: "not_implemented" }, runtimeMetrics: {} },
    degradedStates: [degraded(input.nowIso, "constraint_unsatisfied", "ssh_probe_not_implemented")],
    error: { code: "probe_not_supported", message: "ssh_probe_not_implemented", retryable: false },
  };
}

export function redactRemoteProbeMetadata(input: RemoteHttpProbeRequest): Record<string, string> {
  return { endpoint: input.endpoint, ...redactHeaders(input.auth) };
}
