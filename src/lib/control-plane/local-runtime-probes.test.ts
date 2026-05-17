// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, describe, expect, it, vi } from "vitest";
import { createDeviceRegistry } from "./device-registry";
import { summarizeLocalDiagnostics } from "./local-diagnostics";
import { runLocalRuntimeProbes } from "./local-runtime-probes";

describe("local runtime probes", () => {
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it("nvidia-smi absent returns unavailable", async () => {
    const out = await runLocalRuntimeProbes({ requestId: "p0", nowIso: "2026-05-09T00:00:00.000Z", commandRunner: async () => ({ code: 127, stdout: "" }) });
    expect(out.outcomes.find((o) => o.probe === "gpu-nvidia-smi")?.state).toBe("unavailable");
    expect(out.events.some((e) => e.category === "telemetry_unavailable")).toBe(true);
  });

  it("parses mocked nvidia-smi output", async () => {
    const out = await runLocalRuntimeProbes({ requestId: "p1", nowIso: "2026-05-09T00:00:00.000Z", commandRunner: async () => ({ code: 0, stdout: "RTX 6000, 555.42, 24564, 100, 24464, 7, 40" }) });
    expect(out.telemetry.gpus.state).toBe("observed");
  });

  it("marks malformed nvidia-smi output degraded", async () => {
    const out = await runLocalRuntimeProbes({ requestId: "p2", nowIso: "2026-05-09T00:00:00.000Z", commandRunner: async () => ({ code: 0, stdout: "bad" }) });
    expect(out.outcomes.find((o) => o.probe === "gpu-nvidia-smi")?.state).toBe("degraded");
    expect(out.events.some((e) => e.category === "telemetry_parse_failed")).toBe(true);
  });

  it("marks command timeout degraded/unavailable", async () => {
    const out = await runLocalRuntimeProbes({ requestId: "p3", nowIso: "2026-05-09T00:00:00.000Z", commandRunner: async () => ({ code: 124, stdout: "" }) });
    expect(out.telemetry.gpus.reason).toContain("timeout");
  });

  it("parses runtime metadata from mocked Ollama response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ version: "0.5.0", models: [{ name: "llama3" }], data: [{ id: "llama3" }] }) })));
    const out = await runLocalRuntimeProbes({ requestId: "p4", nowIso: "2026-05-09T00:00:00.000Z", endpoints: { ollama: "http://127.0.0.1:11434/api/tags" }, commandRunner: async () => ({ code: 127, stdout: "" }) });
    expect(out.telemetry.backendVersion.state).toBe("observed");
  });

  it("keeps diagnostics explicit and routing default unchanged", async () => {
    const out = await runLocalRuntimeProbes({ requestId: "p5", nowIso: "2026-05-09T00:00:00.000Z", endpoints: { llamacpp: "https://example.com/health" }, commandRunner: async () => ({ code: 127, stdout: "" }) });
    const lines = summarizeLocalDiagnostics({ probeSummary: out, registry: createDeviceRegistry(), governedRouting: { enabled: false, source: "default", allowDegradedState: false } });
    expect(lines.join("\n")).toContain("GPU telemetry");
    expect(out.receipt.provenance.lineage).toContain("local-probe");
  });
});
