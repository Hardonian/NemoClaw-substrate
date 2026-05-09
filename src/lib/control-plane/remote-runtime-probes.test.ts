// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, describe, expect, it, vi } from "vitest";
import { parseGenericRuntimeTelemetry, parseLlamaCppTelemetry, parseNimTelemetry, parseOllamaTelemetry, parseVllmTelemetry, runRemoteHttpHealthProbe, runRemoteSshProbePlaceholder } from "./remote-runtime-probes";

describe("remote runtime probes", () => {
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it("parses runtime-specific telemetry adapters", () => {
    expect(parseOllamaTelemetry({ version: "0.6.0", models: [{ name: "llama3" }] }).models).toEqual(["llama3"]);
    expect(parseVllmTelemetry({ max_model_len: 8192 }).contextLimitTokens).toBe(8192);
    expect(parseLlamaCppTelemetry({ n_ctx: 4096 }).contextLimitTokens).toBe(4096);
    expect(parseNimTelemetry({ gpus: [{ vendor: "nvidia", model: "L40" }] }).gpus?.[0]?.model).toBe("L40");
    expect(parseGenericRuntimeTelemetry({ backend_type: "custom" }).backendType).toBe("custom");
  });

  it("rejects unsupported scheme", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const out = await runRemoteHttpHealthProbe({ requestId: "r1", nodeId: "n1", runtime: "vllm", endpoint: "ftp://host/health", nowIso: "2026-05-09T00:00:00.000Z" });
    expect(out.status).toBe("failed");
    expect(out.error?.message).toBe("unsupported_scheme");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("strips embedded URL credentials before fetch", async () => {
    const fetchSpy = vi.fn(async () => ({ ok: true, status: 200, text: async () => "{\"version\":\"1\"}" }));
    vi.stubGlobal("fetch", fetchSpy);
    const out = await runRemoteHttpHealthProbe({ requestId: "r1b", nodeId: "n1", runtime: "vllm", endpoint: "https://user:pass@worker/health", nowIso: "2026-05-09T00:00:00.000Z" });
    expect(out.status).toBe("succeeded");
    expect(String(fetchSpy.mock.calls[0]?.[0])).toBe("https://worker/health");
  });

  it("handles auth rejection", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 401, text: async () => "unauthorized" })));
    const out = await runRemoteHttpHealthProbe({ requestId: "r2", nodeId: "n1", runtime: "vllm", endpoint: "https://worker/health", nowIso: "2026-05-09T00:00:00.000Z", auth: { headerName: "Authorization", token: "secret" } });
    expect(out.degradedStates[0]?.reason).toContain("auth_rejected");
  });

  it("marks missing fields as partial/unavailable deterministically", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, text: async () => "{}" })));
    const out = await runRemoteHttpHealthProbe({ requestId: "r2b", nodeId: "n1", runtime: "ollama", endpoint: "https://worker/health", nowIso: "2026-05-09T00:00:00.000Z" });
    expect(out.status).toBe("degraded");
    expect(out.telemetry.backendVersion.state).toBe("unavailable");
  });

  it("handles timeout/network failures as degraded", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(async (_url, init) => new Promise((_resolve, reject) => { init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true }); })));
    const outPromise = runRemoteHttpHealthProbe({ requestId: "r3", nodeId: "n1", runtime: "vllm", endpoint: "https://worker/health", nowIso: "2026-05-09T00:00:00.000Z", timeoutMs: 10 });
    await vi.advanceTimersByTimeAsync(300);
    const out = await outPromise;
    expect(out.status).toBe("degraded");
  });

  it("returns not implemented for ssh", () => {
    const out = runRemoteSshProbePlaceholder({ requestId: "r4", nodeId: "n1", runtime: "vllm", endpoint: "ssh://host", nowIso: "2026-05-09T00:00:00.000Z" });
    expect(out.status).toBe("not_supported");
  });
});
