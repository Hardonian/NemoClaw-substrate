// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import { applyExecutionTransition } from "./execution-state-machine";

describe("execution state machine", () => {
  it("rejects invalid transitions", () => {
    const r = applyExecutionTransition("completed", { to: "executing", atIso: "2026-01-01T00:00:00.000Z", lineageId: "x", reasonCode: "execution_started" });
    expect(r.ok).toBe(false);
  });
});
