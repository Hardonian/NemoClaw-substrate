// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { DegradedState } from "./types";
import type { ProbeTelemetrySnapshot, WorkerProbeRequest, WorkerProbeResult } from "./worker-probes";
import {
  DEFAULT_SECURITY_POLICY,
  redactSecurityPayload,
  validateRemoteUrl,
} from "../security/security-policy";

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
export interface RuntimeTelemetryParseResult {
  parser: "ollama" | "vllm" | "llama.cpp" | "nim" | "generic";
  confidence: "observed" | "partial" | "unavailable";
  runtimeName?: string;
  runtimeVersion?: string;
  models?: string[];
  contextLimitTokens?: number;
  backendType?: string;
  gpus?: Array<{ vendor: string; model: string; vramMb?: number; uuid?: string }>;
  queueDepth?: number;
  health?: "healthy" | "degraded" | "unavailable";
  reasonCode?: string;
}

export interface RemoteSshProbeRequest { requestId: string; nodeId: string; runtime: WorkerProbeRequest["runtime"]; endpoint: string; nowIso: string; }

function degraded(nowIso: string, reasonCode: DegradedState["reasonCode"], reason: string): DegradedState {
  return { category: "degraded", reason, affectedSubsystem: "remote-probe", severity: "warning", reasonCode, explanation: reason, sourceComponent: "remote-runtime-probes", timestamp: nowIso };
}
const readNumber = (v: unknown): number | undefined => typeof v === "number" && Number.isFinite(v) ? v : undefined;
const readString = (v: unknown): string | undefined => typeof v === "string" && v.trim() ? v.trim() : undefined;
const asRecord = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? v as Record<string, unknown> : {});
const readModels = (raw: unknown): string[] | undefined => {
  if (!Array.isArray(raw)) return undefined;
  const values = raw.map((item) => typeof item === "string" ? item : readString(asRecord(item).name) ?? readString(asRecord(item).id)).filter((m): m is string => Boolean(m));
  return values.length ? [...new Set(values)].sort() : undefined;
};

export function parseOllamaTelemetry(raw: Record<string, unknown>): RuntimeTelemetryParseResult {
  const models = readModels(raw.models);
  const version = readString(raw.version) ?? readString(raw.ollama_version);
  return { parser: "ollama", confidence: version || models ? (version && models ? "observed" : "partial") : "unavailable", runtimeName: "ollama", runtimeVersion: version, models, health: "healthy", reasonCode: version || models ? undefined : "missing_fields" };
}
export function parseVllmTelemetry(raw: Record<string, unknown>): RuntimeTelemetryParseResult {
  const data = asRecord(raw.data);
  const models = readModels(raw.models) ?? readModels(data.models) ?? readModels(data.data);
  const version = readString(raw.version) ?? readString(raw.vllm_version);
  const context = readNumber(raw.max_model_len) ?? readNumber(data.max_model_len);
  return { parser: "vllm", confidence: version || models || context ? "partial" : "unavailable", runtimeName: "vllm", runtimeVersion: version, models, contextLimitTokens: context, backendType: readString(raw.backend), health: "healthy", reasonCode: version || models || context ? undefined : "missing_fields" };
}
export function parseLlamaCppTelemetry(raw: Record<string, unknown>): RuntimeTelemetryParseResult {
  const models = readModels(raw.models);
  const version = readString(raw.version);
  const ctx = readNumber(raw.n_ctx) ?? readNumber(raw.context_length);
  return { parser: "llama.cpp", confidence: version || models || ctx ? "partial" : "unavailable", runtimeName: "llama.cpp", runtimeVersion: version, models, contextLimitTokens: ctx, backendType: readString(raw.backend), queueDepth: readNumber(raw.queue_depth), health: "healthy", reasonCode: version || models || ctx ? undefined : "missing_fields" };
}
export function parseNimTelemetry(raw: Record<string, unknown>): RuntimeTelemetryParseResult {
  const models = readModels(raw.models) ?? readModels(asRecord(raw.data).models);
  const gpus = Array.isArray(raw.gpus) ? raw.gpus.map((g) => ({ vendor: readString(asRecord(g).vendor) ?? "unknown", model: readString(asRecord(g).model) ?? "unknown", vramMb: readNumber(asRecord(g).vramMb), uuid: readString(asRecord(g).uuid) })) : undefined;
  const version = readString(raw.version) ?? readString(raw.nim_version);
  return { parser: "nim", confidence: version || models || gpus?.length ? "partial" : "unavailable", runtimeName: "nim", runtimeVersion: version, models, gpus: gpus?.length ? gpus : undefined, queueDepth: readNumber(raw.queue_depth), health: "healthy", reasonCode: version || models || gpus?.length ? undefined : "missing_fields" };
}
export function parseGenericRuntimeTelemetry(raw: Record<string, unknown>): RuntimeTelemetryParseResult {
  const models = readModels(raw.models) ?? readModels(asRecord(raw.data).data);
  const version = readString(raw.version);
  return { parser: "generic", confidence: version || models ? "partial" : "unavailable", runtimeName: readString(raw.runtime), runtimeVersion: version, models, contextLimitTokens: readNumber(raw.context_limit), backendType: readString(raw.backend_type), health: "healthy", reasonCode: version || models ? undefined : "missing_fields" };
}

function redactHeaders(auth?: RemoteHttpAuthConfig): Record<string, string> {
  if (!auth?.headerName) return {};
  return redactSecurityPayload({ [auth.headerName]: auth.token ?? "<present>" }) as Record<string, string>;
}

function parserForRuntime(runtime: WorkerProbeRequest["runtime"]): (raw: Record<string, unknown>) => RuntimeTelemetryParseResult {
  if (runtime === "ollama") return parseOllamaTelemetry;
  if (runtime === "vllm") return parseVllmTelemetry;
  if (runtime === "llama.cpp") return parseLlamaCppTelemetry;
  if (runtime === "nim") return parseNimTelemetry;
  return parseGenericRuntimeTelemetry;
}

export async function runRemoteHttpHealthProbe(input: RemoteHttpProbeRequest): Promise<WorkerProbeResult> {
  const validated = validateRemoteUrl(input.endpoint, input.timeoutMs);
  const request: WorkerProbeRequest = { requestId: input.requestId, nodeId: input.nodeId, runtime: input.runtime, transport: "http", endpoint: validated.decision.sanitized ?? input.endpoint, nowIso: input.nowIso };
  const base = { request, capability: { runtimeBackend: input.runtime, executionMode: "remote" as const, models: [] }, telemetry: { capturedAt: input.nowIso, runtimeHealth: { state: "unavailable" as const, reason: "not_probed" }, backendVersion: { state: "unavailable" as const, reason: "not_probed" }, modelInventory: { state: "unavailable" as const, reason: "not_probed" }, gpus: { state: "unavailable" as const, reason: "remote_probe_http" }, runtimeMetrics: {} } };
  if (!validated.decision.allowed || !validated.url) {
    return { ...base, status: "failed", degradedStates: [degraded(input.nowIso, "constraint_unsatisfied", validated.decision.reasonCode)], error: { code: "probe_not_supported", message: validated.decision.reasonCode, retryable: false } };
  }

  const timeoutMs = validated.normalizedTimeoutMs;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const headers = new Headers();
    if (input.auth?.headerName && input.auth.token) headers.set(input.auth.headerName, input.auth.token);
    const response = await fetch(validated.url, { method: "GET", headers, signal: ctl.signal });
    const body = (await response.text()).trim();
    if (response.status === 401 || response.status === 403) {
      return { ...base, status: "degraded", degradedStates: [degraded(input.nowIso, "policy_blocked", "auth_rejected")], telemetry: { ...base.telemetry, runtimeHealth: { state: "unavailable", reason: "auth_rejected" } }, error: { code: "transport_unreachable", message: "auth_rejected", retryable: true } };
    }
    if (!response.ok) {
      return { ...base, status: "degraded", degradedStates: [degraded(input.nowIso, "transport_unreachable", `http_${response.status}`)], telemetry: { ...base.telemetry, runtimeHealth: { state: "unavailable", reason: `http_${response.status}` } }, error: { code: "transport_unreachable", message: `HTTP ${response.status}`, retryable: true } };
    }
    let parsed: Record<string, unknown> | undefined;
    if (body) {
      try { parsed = JSON.parse(body) as Record<string, unknown>; } catch { return { ...base, status: "degraded", degradedStates: [degraded(input.nowIso, "unknown_error", "malformed_response")], error: { code: "unknown_error", message: "malformed_response", retryable: true } }; }
    }
    const parser = parserForRuntime(input.runtime);
    const telemetryParse = parser(parsed ?? {});
    const telemetry: ProbeTelemetrySnapshot = {
      ...base.telemetry,
      runtimeHealth: { state: telemetryParse.confidence === "unavailable" ? "unavailable" : "observed", value: telemetryParse.health ?? "healthy", observedAt: input.nowIso, reason: telemetryParse.reasonCode },
      backendVersion: telemetryParse.runtimeVersion ? { state: "observed", value: telemetryParse.runtimeVersion, observedAt: input.nowIso } : { state: telemetryParse.confidence === "unavailable" ? "unavailable" : "inferred", reason: "not_reported" },
      modelInventory: telemetryParse.models ? { state: "observed", value: telemetryParse.models, observedAt: input.nowIso } : { state: telemetryParse.confidence === "unavailable" ? "unavailable" : "inferred", reason: "not_reported" },
      gpus: telemetryParse.gpus?.length ? { state: "observed", value: telemetryParse.gpus, observedAt: input.nowIso } : { state: "unavailable", reason: "not_reported" },
      runtimeMetrics: {
        context_limit_tokens: telemetryParse.contextLimitTokens ? { state: "observed", value: telemetryParse.contextLimitTokens, observedAt: input.nowIso } : { state: "unavailable", reason: "not_reported" },
        queue_depth: telemetryParse.queueDepth ? { state: "observed", value: telemetryParse.queueDepth, observedAt: input.nowIso } : { state: "unavailable", reason: "not_reported" },
      },
    };
    return { ...base, status: telemetryParse.confidence === "unavailable" ? "degraded" : "succeeded", degradedStates: [], capability: { ...base.capability, runtimeBackend: telemetryParse.runtimeName ?? input.runtime, models: telemetryParse.models ?? [] }, telemetry };
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
  const endpoint = validateRemoteUrl(input.endpoint).decision.sanitized ?? input.endpoint;
  return {
    endpoint,
    timeoutMs: String(validateRemoteUrl(input.endpoint, input.timeoutMs).normalizedTimeoutMs),
    policy: DEFAULT_SECURITY_POLICY.network.mode,
    ...redactHeaders(input.auth),
  };
}
