// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, describe, expect, it, vi } from "vitest";
import { runRemoteHttpHealthProbe, runRemoteSshProbePlaceholder } from "./remote-runtime-probes";

describe("remote runtime probes", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("rejects unsupported scheme", async () => {
    const out = await runRemoteHttpHealthProbe({ requestId: "r1", nodeId: "n1", runtime: "vllm", endpoint: "ftp://host/health", nowIso: "2026-05-09T00:00:00.000Z" });
    expect(out.status).toBe("failed");
  });

  it("handles auth rejection", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 401, text: async () => "unauthorized" })));
    const out = await runRemoteHttpHealthProbe({ requestId: "r2", nodeId: "n1", runtime: "vllm", endpoint: "https://worker/health", nowIso: "2026-05-09T00:00:00.000Z", auth: { headerName: "Authorization", token: "secret" } });
    expect(out.degradedStates[0]?.reason).toContain("auth_rejected");
  });

  it("handles timeout/network failures as degraded", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(async (_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    })));
    const outPromise = runRemoteHttpHealthProbe({ requestId: "r3", nodeId: "n1", runtime: "vllm", endpoint: "https://worker/health", nowIso: "2026-05-09T00:00:00.000Z", timeoutMs: 10 });
    await vi.advanceTimersByTimeAsync(300);
    const out = await outPromise;
    expect(out.status).toBe("degraded");
  });

  it("returns not implemented for ssh", () => {
    const out = runRemoteSshProbePlaceholder({ requestId: "r4", nodeId: "n1", runtime: "vllm", endpoint: "ssh://host", nowIso: "2026-05-09T00:00:00.000Z" });
    expect(out.status).toBe("not_supported");
    expect(out.error?.message).toContain("not_implemented");
  });
});
