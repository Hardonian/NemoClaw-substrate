// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from "vitest";
import { createDeviceRegistry } from "./device-registry";
import { summarizeLocalDiagnostics } from "./local-diagnostics";
import { runLocalRuntimeProbes } from "./local-runtime-probes";

describe("local runtime probes", () => {
  it("returns unavailable when runtime is not configured", async () => {
    const out = await runLocalRuntimeProbes({ requestId: "p1", nowIso: "2026-05-09T00:00:00.000Z" });
    expect(out.outcomes.find((o) => o.probe === "provider-metadata")?.state).toBe("unavailable");
  });

  it("marks timeout as degraded", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Promise((_r, _j) => {})));
    const out = await runLocalRuntimeProbes({ requestId: "p2", nowIso: "2026-05-09T00:00:00.000Z", endpoints: { ollama: "http://127.0.0.1:11434" }, timeoutMs: 10 });
    expect(out.degradedStates.some((d) => d.reasonCode === "transport_unreachable")).toBe(true);
    vi.unstubAllGlobals();
  });

  it("flags malformed probe response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, text: async () => "not-json" })));
    const out = await runLocalRuntimeProbes({ requestId: "p3", nowIso: "2026-05-09T00:00:00.000Z", endpoints: { vllm: "http://localhost:8000" } });
    expect(out.degradedStates.some((d) => d.reasonCode === "unknown_error")).toBe(true);
    vi.unstubAllGlobals();
  });

  it("requires explicit local URL for HTTP probes", async () => {
    const out = await runLocalRuntimeProbes({ requestId: "p4", nowIso: "2026-05-09T00:00:00.000Z", endpoints: { nim: "https://example.com/health" } });
    expect(out.outcomes.find((o) => o.probe === "nim-http")?.detail).toContain("non-local");
  });

  it("keeps telemetry unavailability explicit and diagnostics report degraded states", async () => {
    const out = await runLocalRuntimeProbes({ requestId: "p5", nowIso: "2026-05-09T00:00:00.000Z", endpoints: { llamacpp: "https://example.com/health" } });
    const lines = summarizeLocalDiagnostics({ probeSummary: out, registry: createDeviceRegistry(), governedRouting: { enabled: false, source: "default", allowFallback: false } });
    expect(lines.join("\n")).toContain("Telemetry availability: unavailable");
    expect(lines.join("\n")).toContain("Probe degraded states");
  });

  it("does not mutate provider routing defaults", async () => {
    const out = await runLocalRuntimeProbes({ requestId: "p6", nowIso: "2026-05-09T00:00:00.000Z", provider: "ollama" });
    expect(out.receipt.provenance.lineage).toContain("local-probe");
  });
});
