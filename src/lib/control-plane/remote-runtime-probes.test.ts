// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from "vitest";
import { runRemoteHttpHealthProbe, runRemoteSshProbePlaceholder } from "./remote-runtime-probes";

describe("remote runtime probes", () => {
  it("rejects unsupported scheme", async () => {
    const out = await runRemoteHttpHealthProbe({ requestId: "r1", nodeId: "n1", runtime: "vllm", endpoint: "ftp://host/health", nowIso: "2026-05-09T00:00:00.000Z" });
    expect(out.status).toBe("failed");
  });

  it("handles auth rejection", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 401, text: async () => "unauthorized" })));
    const out = await runRemoteHttpHealthProbe({ requestId: "r2", nodeId: "n1", runtime: "vllm", endpoint: "https://worker/health", nowIso: "2026-05-09T00:00:00.000Z", auth: { headerName: "Authorization", token: "secret" } });
    expect(out.degradedStates[0]?.reason).toContain("auth_rejected");
    vi.unstubAllGlobals();
  });

  it("handles timeout/network failures as degraded", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Promise((_r, _j) => {})));
    const out = await runRemoteHttpHealthProbe({ requestId: "r3", nodeId: "n1", runtime: "vllm", endpoint: "https://worker/health", nowIso: "2026-05-09T00:00:00.000Z", timeoutMs: 10 });
    expect(out.status).toBe("degraded");
    vi.unstubAllGlobals();
  });

  it("returns not implemented for ssh", () => {
    const out = runRemoteSshProbePlaceholder({ requestId: "r4", nodeId: "n1", runtime: "vllm", endpoint: "ssh://host", nowIso: "2026-05-09T00:00:00.000Z" });
    expect(out.status).toBe("not_supported");
    expect(out.error?.message).toContain("not_implemented");
  });
});
