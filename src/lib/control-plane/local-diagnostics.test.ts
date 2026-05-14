// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { createDeviceRegistry } from "./device-registry";
import { summarizeLocalDiagnostics } from "./local-diagnostics";
import { runLocalRuntimeProbes } from "./local-runtime-probes";

describe("local diagnostics summary", () => {
  it("reports unavailable telemetry and disabled governed routing explicitly", async () => {
    const probes = await runLocalRuntimeProbes({
      requestId: "diag-1",
      nowIso: "2026-05-09T00:00:00.000Z",
      commandRunner: async () => ({ code: 127, stdout: "" }),
    });

    const lines = summarizeLocalDiagnostics({
      probeSummary: probes,
      registry: createDeviceRegistry(),
      governedRouting: { enabled: false, source: "default", allowDegradedState: false },
    });

    expect(lines).toContain("Telemetry availability: unavailable");
    expect(lines).toContain("Governed routing: disabled (default)");
    expect(lines).toContain("Dry-run result: none");
  });
});
