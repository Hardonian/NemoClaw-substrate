// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { buildEventsFromReceipt, type OperationalEvent, type OperationalMemoryLog } from "./operational-memory";
import type { DegradedState, ExecutionReceipt } from "./types";

export type LocalProbeType = "provider-metadata" | "command-availability" | "ollama-http" | "vllm-http" | "llamacpp-http" | "nim-http";

export interface LocalProbeRequest {
  requestId: string;
  nowIso: string;
  provider?: string;
  commands?: string[];
  endpoints?: Partial<Record<"ollama" | "vllm" | "llamacpp" | "nim", string>>;
  timeoutMs?: number;
}

export interface ProbeOutcome {
  probe: LocalProbeType;
  state: "healthy" | "degraded" | "unavailable";
  detail: string;
  degradedState?: DegradedState;
}

export interface LocalProbeSummary {
  outcomes: ProbeOutcome[];
  degradedStates: DegradedState[];
  telemetryAvailable: boolean;
  receipt: ExecutionReceipt;
  events: OperationalEvent[];
}

function isLocalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  } catch {
    return false;
  }
}

function degraded(nowIso: string, reasonCode: DegradedState["reasonCode"], reason: string, subsystem: string, suggestion: string): DegradedState {
  return { category: "degraded", reason, affectedSubsystem: subsystem, severity: "warning", reasonCode, explanation: reason, sourceComponent: "local-runtime-probes", timestamp: nowIso, recoverySuggestion: suggestion };
}

async function probeHttp(url: string, timeoutMs: number): Promise<{ ok: boolean; detail: string; malformed?: boolean }> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: "GET", signal: ctl.signal });
    const text = await res.text();
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
    const trimmed = text.trim();
    if (!trimmed) return { ok: true, detail: "empty body" };
    try { JSON.parse(trimmed); return { ok: true, detail: "ok" }; } catch { return { ok: true, detail: "non-json", malformed: true }; }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { ok: false, detail: msg.includes("aborted") ? "timeout" : msg };
  } finally { clearTimeout(timer); }
}

export async function runLocalRuntimeProbes(input: LocalProbeRequest, operationalMemory?: OperationalMemoryLog): Promise<LocalProbeSummary> {
  const outcomes: ProbeOutcome[] = [];
  const degradedStates: DegradedState[] = [];
  const timeoutMs = input.timeoutMs ?? 1500;

  outcomes.push(input.provider
    ? { probe: "provider-metadata", state: "healthy", detail: `provider=${input.provider}` }
    : { probe: "provider-metadata", state: "unavailable", detail: "provider not configured", degradedState: degraded(input.nowIso, "capability_missing", "provider metadata unavailable", "provider", "Configure provider before probing runtime.") });

  const missingCommands = (input.commands ?? []).filter((command) => !command.trim());
  outcomes.push(missingCommands.length
    ? { probe: "command-availability", state: "degraded", detail: "empty command entries", degradedState: degraded(input.nowIso, "constraint_unsatisfied", "command list contained empty values", "runtime", "Provide non-empty command names.") }
    : { probe: "command-availability", state: "healthy", detail: `commands=${(input.commands ?? []).length}` });

  for (const [provider, url] of Object.entries(input.endpoints ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
    const probeName = `${provider}-http` as LocalProbeType;
    if (!url) {
      const d = degraded(input.nowIso, "capability_missing", `${provider} endpoint not configured`, provider, "Provide explicit local URL to run HTTP probe.");
      outcomes.push({ probe: probeName, state: "unavailable", detail: "url required", degradedState: d });
      degradedStates.push(d);
      continue;
    }
    if (!isLocalUrl(url)) {
      const d = degraded(input.nowIso, "constraint_unsatisfied", `${provider} endpoint must be local`, provider, "Use localhost/127.0.0.1/::1 endpoint for local probes.");
      outcomes.push({ probe: probeName, state: "degraded", detail: "non-local url rejected", degradedState: d });
      degradedStates.push(d);
      continue;
    }
    const http = await probeHttp(url, timeoutMs);
    if (!http.ok) {
      const d = degraded(input.nowIso, http.detail === "timeout" ? "transport_unreachable" : "unknown_error", `${provider} probe failed: ${http.detail}`, provider, "Verify local runtime endpoint is running and reachable.");
      outcomes.push({ probe: probeName, state: "degraded", detail: http.detail, degradedState: d });
      degradedStates.push(d);
      continue;
    }
    if (http.malformed) {
      const d = degraded(input.nowIso, "unknown_error", `${provider} returned malformed probe payload`, provider, "Use a health/version endpoint that returns valid JSON.");
      outcomes.push({ probe: probeName, state: "degraded", detail: http.detail, degradedState: d });
      degradedStates.push(d);
      continue;
    }
    outcomes.push({ probe: probeName, state: "healthy", detail: http.detail });
  }

  for (const outcome of outcomes) if (outcome.degradedState) degradedStates.push(outcome.degradedState);
  const telemetryAvailable = false;
  const receipt: ExecutionReceipt = {
    version: "1", receiptId: `local-probe-${input.requestId}`, requestId: input.requestId, createdAt: input.nowIso,
    phases: [{ phase: "received", at: input.nowIso, notes: "local-probe-started" }, { phase: "completed", at: input.nowIso, notes: "local-probe-finished" }],
    degradedEvents: degradedStates, fallbackAttempts: [], toolInvocations: [], timing: { totalMs: 0 }, provenance: { source: "local-runtime-probes", lineage: ["diagnostics", "local-probe"], replayVersion: "1" }, operatorOverrides: [],
  };
  const events = buildEventsFromReceipt(receipt, "local-runtime-probes", operationalMemory);
  events.unshift({ eventId: `probe-start-${input.requestId}`, occurredAt: input.nowIso, sequence: -1, category: "runtime_action", source: "local-runtime-probes", provenance: { requestId: input.requestId }, replayRef: receipt.provenance, payload: { phase: "started", telemetryAvailable } });
  return { outcomes: outcomes.sort((a, b) => a.probe.localeCompare(b.probe)), degradedStates, telemetryAvailable, receipt, events };
}
