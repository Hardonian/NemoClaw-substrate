// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { buildEventsFromReceipt, type OperationalEvent, type OperationalMemoryLog } from "./operational-memory";
import type { DegradedState, ExecutionReceipt } from "./types";
import type { ProbeTelemetrySnapshot } from "./worker-probes";
import {
  DEFAULT_SECURITY_POLICY,
  validateCommandDescriptor,
  validateLocalOnlyUrl,
} from "../security/security-policy";

export type LocalProbeType = "provider-metadata" | "command-availability" | "ollama-http" | "vllm-http" | "llamacpp-http" | "nim-http" | "gpu-nvidia-smi" | "gpu-rocm";
export type CommandRunner = (command: string, args: string[], timeoutMs: number) => Promise<{ code: number; stdout: string; stderr?: string }>;

export interface LocalProbeRequest { requestId: string; nowIso: string; provider?: string; commands?: string[]; endpoints?: Partial<Record<"ollama" | "vllm" | "llamacpp" | "nim", string>>; timeoutMs?: number; commandRunner?: CommandRunner; }
export interface ProbeOutcome { probe: LocalProbeType; state: "healthy" | "degraded" | "unavailable"; detail: string; degradedState?: DegradedState; }
export interface LocalProbeSummary { outcomes: ProbeOutcome[]; degradedStates: DegradedState[]; telemetryAvailable: boolean; telemetry: ProbeTelemetrySnapshot; receipt: ExecutionReceipt; events: OperationalEvent[]; }

const defaultCommandRunner: CommandRunner = async (command, args, timeoutMs) => {
  const commandDecision = validateCommandDescriptor(
    { name: command, argv: args, shell: false, timeoutMs },
    { ...DEFAULT_SECURITY_POLICY.commandExecution, allowlist: ["nvidia-smi"] },
  );
  if (!commandDecision.decision.allowed || !commandDecision.descriptor) {
    return { code: 126, stdout: "", stderr: commandDecision.decision.reasonCode };
  }
  const descriptor = commandDecision.descriptor;
  const { spawn } = await import("node:child_process");
  return new Promise((resolve) => {
    const child = spawn(descriptor.name, [...descriptor.argv], { shell: false });
    let stdout = ""; let stderr = ""; let done = false;
    const timer = setTimeout(() => { if (!done) { done = true; child.kill("SIGTERM"); resolve({ code: 124, stdout: stdout.slice(0, descriptor.stdoutMaxBytes), stderr: `${stderr} timeout`.slice(0, descriptor.stderrMaxBytes) }); } }, descriptor.timeoutMs);
    child.stdout.on("data", (d) => { stdout = (stdout + String(d)).slice(0, descriptor.stdoutMaxBytes); });
    child.stderr.on("data", (d) => { stderr = (stderr + String(d)).slice(0, descriptor.stderrMaxBytes); });
    child.on("error", () => { if (!done) { done = true; clearTimeout(timer); resolve({ code: 127, stdout: "", stderr: "not_found" }); } });
    child.on("exit", (code) => { if (!done) { done = true; clearTimeout(timer); resolve({ code: code ?? 1, stdout, stderr }); } });
  });
};

const degraded = (nowIso: string, reasonCode: DegradedState["reasonCode"], reason: string, subsystem: string, suggestion: string): DegradedState => ({ category: "degraded", reason, affectedSubsystem: subsystem, severity: "warning", reasonCode, explanation: reason, sourceComponent: "local-runtime-probes", timestamp: nowIso, recoverySuggestion: suggestion });
async function probeHttp(url: string, timeoutMs: number): Promise<{ ok: boolean; detail: string; data?: Record<string, unknown>; malformed?: boolean }> {
  const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try { const res = await fetch(url, { method: "GET", signal: ctl.signal }); const text = await res.text(); if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` }; if (!text.trim()) return { ok: true, detail: "empty body" }; try { const data = JSON.parse(text) as Record<string, unknown>; return { ok: true, detail: "ok", data }; } catch { return { ok: true, detail: "non-json", malformed: true }; } } catch (error) { const msg = error instanceof Error ? error.message : String(error); return { ok: false, detail: msg.includes("aborted") ? "timeout" : msg }; } finally { clearTimeout(timer); }
}

function parseNvidiaSmi(stdout: string): ProbeTelemetrySnapshot["gpus"] {
  const lines = stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return { state: "unavailable", reason: "empty_output" };
  const gpus = lines.map((line) => {
    const [name, driver, total, used, free, util, temp] = line.split(",").map((part) => part.trim());
    return { vendor: "nvidia", model: name, vramMb: Number(total), driver, usedMb: Number(used), freeMb: Number(free), utilPct: Number(util), tempC: Number(temp) };
  });
  if (gpus.some((g) => !g.model || Number.isNaN(g.vramMb))) return { state: "unavailable", reason: "malformed_output" };
  return { state: "observed", observedAt: new Date().toISOString(), value: gpus.map((g) => ({ vendor: g.vendor, model: g.model, vramMb: g.vramMb, uuid: `${g.driver}|${g.utilPct}|${g.tempC}|${g.usedMb}|${g.freeMb}` })) };
}

export async function runLocalRuntimeProbes(input: LocalProbeRequest, operationalMemory?: OperationalMemoryLog): Promise<LocalProbeSummary> {
  const outcomes: ProbeOutcome[] = []; const degradedStates: DegradedState[] = []; const timeoutMs = input.timeoutMs ?? 1500; const runner = input.commandRunner ?? defaultCommandRunner;
  const telemetry: ProbeTelemetrySnapshot = { capturedAt: input.nowIso, runtimeHealth: { state: "unavailable", reason: "not_probed" }, backendVersion: { state: "unavailable", reason: "not_probed" }, modelInventory: { state: "unavailable", reason: "not_probed" }, gpus: { state: "unavailable", reason: "not_observed" }, runtimeMetrics: {} };

  outcomes.push(input.provider ? { probe: "provider-metadata", state: "healthy", detail: `provider=${input.provider}` } : { probe: "provider-metadata", state: "unavailable", detail: "provider not configured", degradedState: degraded(input.nowIso, "capability_missing", "provider metadata unavailable", "provider", "Configure provider before probing runtime.") });
  const emptyCommands = (input.commands ?? []).filter((c) => !c.trim());
  outcomes.push(emptyCommands.length ? { probe: "command-availability", state: "degraded", detail: "empty command entries", degradedState: degraded(input.nowIso, "constraint_unsatisfied", "command list contained empty values", "runtime", "Provide non-empty command names.") } : { probe: "command-availability", state: "healthy", detail: `commands=${(input.commands ?? []).length}` });

  const nvidia = await runner("nvidia-smi", ["--query-gpu=name,driver_version,memory.total,memory.used,memory.free,utilization.gpu,temperature.gpu", "--format=csv,noheader,nounits"], timeoutMs);
  if (nvidia.code !== 0) { outcomes.push({ probe: "gpu-nvidia-smi", state: "unavailable", detail: nvidia.code === 124 ? "timeout" : "not available" }); telemetry.gpus = { state: "unavailable", reason: nvidia.code === 124 ? "timeout" : "command_unavailable" }; }
  else {
    const parsed = parseNvidiaSmi(nvidia.stdout);
    if (parsed.state !== "observed") { const d = degraded(input.nowIso, "unknown_error", "nvidia-smi malformed output", "gpu", "Use csv noheader nounits format for local telemetry probe."); outcomes.push({ probe: "gpu-nvidia-smi", state: "degraded", detail: "malformed output", degradedState: d }); degradedStates.push(d); telemetry.gpus = { state: "unavailable", reason: "malformed_output" }; }
    else { outcomes.push({ probe: "gpu-nvidia-smi", state: "healthy", detail: "observed" }); telemetry.gpus = { ...parsed, observedAt: input.nowIso }; }
  }
  outcomes.push({ probe: "gpu-rocm", state: "unavailable", detail: "not implemented" });

  for (const [provider, url] of Object.entries(input.endpoints ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
    const probeName = `${provider}-http` as LocalProbeType; if (!url) { const d = degraded(input.nowIso, "capability_missing", `${provider} endpoint not configured`, provider, "Provide explicit local URL to run HTTP probe."); outcomes.push({ probe: probeName, state: "unavailable", detail: "url required", degradedState: d }); degradedStates.push(d); continue; }
    const localUrl = validateLocalOnlyUrl(url, timeoutMs);
    if (!localUrl.decision.allowed || !localUrl.url) { const d = degraded(input.nowIso, "constraint_unsatisfied", `${provider} endpoint must be local`, provider, "Use localhost/127.0.0.1/::1 endpoint for local probes."); outcomes.push({ probe: probeName, state: "degraded", detail: localUrl.decision.reasonCode, degradedState: d }); degradedStates.push(d); continue; }
    const http = await probeHttp(localUrl.url.toString(), localUrl.normalizedTimeoutMs); if (!http.ok || http.malformed) { const d = degraded(input.nowIso, !http.ok && http.detail === "timeout" ? "transport_unreachable" : "unknown_error", `${provider} probe failed: ${http.detail}`, provider, "Verify local runtime endpoint is running and returns JSON."); outcomes.push({ probe: probeName, state: "degraded", detail: http.detail, degradedState: d }); degradedStates.push(d); continue; }
    const data = http.data ?? {}; const models = Array.isArray(data.models) ? data.models.filter((m): m is string => typeof m === "string") : Array.isArray((data as { data?: unknown }).data) ? ((data as { data: Array<{ id?: string }> }).data.map((x) => x?.id).filter((id): id is string => typeof id === "string")) : [];
    const version = typeof data.version === "string" ? data.version : typeof (data as { ollama_version?: string }).ollama_version === "string" ? (data as { ollama_version: string }).ollama_version : undefined;
    if (models.length) telemetry.modelInventory = { state: "observed", value: [...models].sort(), observedAt: input.nowIso };
    if (version) telemetry.backendVersion = { state: "observed", value: version, observedAt: input.nowIso };
    telemetry.runtimeHealth = { state: "observed", value: "healthy", observedAt: input.nowIso };
    outcomes.push({ probe: probeName, state: "healthy", detail: http.detail });
  }

  for (const outcome of outcomes) if (outcome.degradedState) degradedStates.push(outcome.degradedState);
  const telemetryAvailable = telemetry.gpus.state === "observed" || telemetry.backendVersion.state === "observed" || telemetry.modelInventory.state === "observed";
  const receipt: ExecutionReceipt = { version: "1", receiptId: `local-probe-${input.requestId}`, requestId: input.requestId, createdAt: input.nowIso, phases: [{ phase: "received", at: input.nowIso, notes: "telemetry_probe_started" }, { phase: "completed", at: input.nowIso, notes: "telemetry_probe_finished" }], degradedEvents: degradedStates, fallbackAttempts: [], toolInvocations: [], timing: { totalMs: 0 }, provenance: { source: "local-runtime-probes", lineage: ["diagnostics", "local-probe"], replayVersion: "1" }, operatorOverrides: [] };
  const events = buildEventsFromReceipt(receipt, "local-runtime-probes", operationalMemory);
  events.unshift(
    { eventId: `telemetry-probe-${input.requestId}`, occurredAt: input.nowIso, sequence: -2, category: "telemetry_probe_started", source: "local-runtime-probes", provenance: { requestId: input.requestId, receiptId: receipt.receiptId }, replayRef: receipt.provenance, payload: { sourceRuntime: input.provider ?? "unknown", confidence: telemetryAvailable ? "observed" : "unavailable" } },
    { eventId: `telemetry-parse-${input.requestId}`, occurredAt: input.nowIso, sequence: -1, category: telemetryAvailable ? (telemetry.gpus.state === "unavailable" ? "telemetry_parse_partial" : "telemetry_parse_succeeded") : "telemetry_parse_failed", source: "local-runtime-probes", provenance: { requestId: input.requestId, receiptId: receipt.receiptId }, replayRef: receipt.provenance, payload: { confidence: telemetryAvailable ? "medium" : "low", degradedReasonCodes: degradedStates.map((d) => d.reasonCode) } },
  );
  if (telemetry.gpus.reason === "command_unavailable") events.push({ eventId: `telemetry-unavailable-${input.requestId}`, occurredAt: input.nowIso, sequence: Number.MAX_SAFE_INTEGER - 1, category: "telemetry_unavailable", source: "local-runtime-probes", provenance: { requestId: input.requestId, receiptId: receipt.receiptId }, replayRef: receipt.provenance, payload: { reasonCode: "nvidia_smi_unavailable", confidence: "low", sourceRuntime: input.provider ?? "unknown" } });
  events.push({ eventId: `telemetry-probe-result-${input.requestId}`, occurredAt: input.nowIso, sequence: Number.MAX_SAFE_INTEGER, category: telemetryAvailable ? "telemetry_probe_succeeded" : "telemetry_probe_failed", source: "local-runtime-probes", provenance: { requestId: input.requestId, receiptId: receipt.receiptId }, replayRef: receipt.provenance, payload: { confidence: telemetryAvailable ? "medium" : "low", sourceRuntime: input.provider ?? "unknown" } });
  return { outcomes: outcomes.sort((a, b) => a.probe.localeCompare(b.probe)), degradedStates, telemetryAvailable, telemetry, receipt, events };
}
