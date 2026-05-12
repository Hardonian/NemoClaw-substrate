import type { OperationalEvent, ReplayEnvelope, NodeDescriptor } from "./control-plane-types";

export function buildReplayEnvelope(events: OperationalEvent[], exportedAt: string): ReplayEnvelope {
  const sorted = [...events].sort((a, b) => a.sequence - b.sequence);
  const digest = Buffer.from(JSON.stringify(sorted)).toString("base64url");
  return { version: "1", exportedAt, eventCount: sorted.length, events: sorted, digest };
}

export function validateReplayEnvelope(envelope: ReplayEnvelope): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (envelope.eventCount !== envelope.events.length) reasons.push("event_count_mismatch");
  if (envelope.events.some((e, i) => e.sequence !== i)) reasons.push("sequence_mismatch");
  if (envelope.events.some((e) => !e.replayRef?.lineage?.length)) reasons.push("missing_replay_lineage");
  const expectedDigest = Buffer.from(JSON.stringify(envelope.events)).toString("base64url");
  if (expectedDigest !== envelope.digest) reasons.push("digest_mismatch");
  return { ok: reasons.length === 0, reasons };
}

export function summarizePolicyOutcomes(events: OperationalEvent[]): Record<string, number> {
  const summary: Record<string, number> = { allow: 0, deny: 0, approval_required: 0, unavailable: 0 };
  for (const event of events.filter((e) => e.category === "policy_outcome")) {
    const decision = event.payload["policyDecision"] as { allowed?: boolean; requiredApproval?: boolean } | undefined;
    if (!decision) { summary.unavailable += 1; continue; }
    if (decision.allowed && decision.requiredApproval) summary.approval_required += 1;
    else if (decision.allowed) summary.allow += 1;
    else summary.deny += 1;
  }
  return summary;
}

export function summarizeDegradedTimeline(events: OperationalEvent[]): string[] {
  return events
    .filter((e) => e.category === "degraded_state")
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
    .map((e) => `${e.occurredAt} observed ${(e.payload["degraded"] as { reasonCode?: string } | undefined)?.reasonCode ?? "unknown"}`);
}

export function summarizeFallbackFrequency(events: OperationalEvent[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const event of events.filter((e) => e.category === "degraded")) {
    const reason = (event.payload["degraded"] as { reason?: string } | undefined)?.reason ?? "unknown";
    out[reason] = (out[reason] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

export function summarizeStaleNodes(nodes: NodeDescriptor[], now: string, staleAfterMs = 60_000): string[] {
  const nowMs = Date.parse(now);
  return nodes
    .filter((n) => nowMs - Date.parse(n.lastHeartbeatAt) > staleAfterMs || n.health === "stale")
    .sort((a, b) => a.nodeId.localeCompare(b.nodeId))
    .map((n) => `${n.nodeId}: observed ${n.health}`);
}

const TELEMETRY_KINDS = new Set([
  "telemetry_probe_started", "telemetry_probe_succeeded", "telemetry_probe_failed", "telemetry_parse_succeeded", "telemetry_parse_partial", "telemetry_parse_failed", "telemetry_unavailable", "telemetry_stale", "telemetry_conflict_detected", "telemetry_registry_update_applied", "telemetry_registry_update_skipped",
]);

export function summarizeTelemetryEventCounts(events: OperationalEvent[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const event of events) if (TELEMETRY_KINDS.has(event.category)) out[event.category] = (out[event.category] ?? 0) + 1;
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

export function summarizeTelemetryDimensions(events: OperationalEvent[]): { confidence: Record<string, number>; source: Record<string, number> } {
  const confidence: Record<string, number> = {};
  const source: Record<string, number> = {};
  for (const event of events.filter((e) => TELEMETRY_KINDS.has(e.category))) {
    source[event.source] = (source[event.source] ?? 0) + 1;
    const value = String((event.payload["confidence"] ?? "unknown"));
    confidence[value] = (confidence[value] ?? 0) + 1;
  }
  return { confidence, source };
}

export function summarizeHeterogeneousDiagnostics(input: { routing: { enabled: boolean; source: string }; governedEnabled: boolean; remote: { enabled: boolean; source: string }; result?: { selectedCandidate?: { candidateId: string }; excludedCandidates?: Array<{ candidateId: string }>; receipt: { degradedEvents: Array<{ reasonCode: string }>; fallbackAttempts: Array<{ reason: string }> } } }): string[] {
  const noCandidateReason = input.result?.selectedCandidate ? "none" : input.result?.receipt.degradedEvents.map((event) => event.reasonCode).join(",") || "no_selected_candidate";
  const fallbackState = input.result ? (input.result.receipt.fallbackAttempts.length > 0 ? input.result.receipt.fallbackAttempts.map((attempt) => attempt.reason).join(",") : "none") : "none";
  return [
    `Heterogeneous routing: ${input.routing.enabled ? "enabled" : "disabled"} (${input.routing.source})`,
    `Governed routing: ${input.governedEnabled ? "enabled" : "disabled"}`,
    `Remote execution: ${input.remote.enabled ? "enabled" : "disabled"} (${input.remote.source})`,
    `Selected candidate: ${input.result?.selectedCandidate?.candidateId ?? "none"}`,
    `Excluded candidates: ${input.result?.excludedCandidates?.map((c) => c.candidateId).join(",") || "none"}`,
    `No-candidate reason: ${noCandidateReason}`,
    `Degraded: ${fallbackState}`,
    `Receipt: ${input.result?.receipt.receiptId ?? "none"}`,
  ];
}

export function summarizeLocalDiagnostics(input: {
  probeSummary: { outcomes: Array<{ degradedState?: { reasonCode?: string } }>; telemetry: { gpus: { state: string }; backendVersion: { state: string; value?: string }; modelInventory: { state: string; value?: string[] }; runtimeHealth: { state: string }; capturedAt: string }; telemetryAvailable: boolean };
  registry: { list: () => Array<{ nodeId: string }> };
  governedRouting: { enabled: boolean; source: string };
  dryRun?: { policyResult: string };
}): string[] {
  return [
    `Local probes: ${input.probeSummary.outcomes.length}`,
    `Probe degraded states: ${input.probeSummary.outcomes.map((o) => o.degradedState?.reasonCode).filter(Boolean).join(",") || "none"}`,
    `Registered nodes: ${input.registry.list().length}`,
    `Telemetry availability: ${input.probeSummary.telemetryAvailable ? "available" : "unavailable"}`,
    `GPU telemetry: ${input.probeSummary.telemetry.gpus.state}`,
    `Runtime metadata: version=${input.probeSummary.telemetry.backendVersion.state}, models=${input.probeSummary.telemetry.modelInventory.state}`,
    `Telemetry source: local`,
    `Parser confidence: ${input.probeSummary.telemetry.runtimeHealth.state}`,
    `Model inventory count: ${input.probeSummary.telemetry.modelInventory.value?.length ?? 0}`,
    `GPU metadata: ${input.probeSummary.telemetry.gpus.state === "observed" ? "known" : "unknown"}`,
    `Registry update: applied (reason=observed_local_probe)`,
    `Observed at: ${input.probeSummary.telemetry.capturedAt}`,
    `Governed routing: ${input.governedRouting.enabled ? "enabled" : "disabled"} (${input.governedRouting.source})`,
    `Dry-run result: ${input.dryRun ? input.dryRun.policyResult : "none"}`,
  ];
}
