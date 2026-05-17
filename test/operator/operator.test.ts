// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { formatJson, formatTable } from "../../src/lib/operator/format";
import { resolveProfile } from "../../src/lib/operator/profiles";

describe("operator formatting", () => {
  it("redacts secrets deterministically", () => {
    const payload = formatJson("status", [{ id: "1", state: "ok", detail: "token=abc" }]);
    expect(payload).toContain("[REDACTED]");
    expect(payload).not.toContain("abc");
  });

  it("sorts table rows", () => {
    const table = formatTable([
      { id: "b", state: "ok", detail: "x" },
      { id: "a", state: "ok", detail: "x" },
    ]);
    expect(table.split("\n")[1].startsWith("a")).toBe(true);
  });
});

describe("profiles", () => {
  it("fails closed on invalid profile", () => {
    expect(() => resolveProfile("bad-profile")).toThrow("Invalid profile");
  });
});
