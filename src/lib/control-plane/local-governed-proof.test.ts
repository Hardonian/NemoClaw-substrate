// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runLocalGovernedProof } from "./local-governed-proof";
import { verifyLocalGovernedProof } from "./local-governed-proof-verify";

function tmpRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "nemoclaw-local-proof-"));
}

describe("local-governed-proof canonical modules", () => {
  it("runs and verifies successfully", () => {
    const root = tmpRoot();
    const result = runLocalGovernedProof({ rootDir: root, nowIso: "2026-01-01T00:00:00.000Z" });
    expect(result.verification.ok).toBe(true);
    expect(result.verification.reasons).toEqual([]);
    expect(fs.existsSync(path.join(result.runDir, "manifest.json"))).toBe(true);
  });

  it("fails verification when events are missing", () => {
    const root = tmpRoot();
    const result = runLocalGovernedProof({ rootDir: root, nowIso: "2026-01-01T00:00:00.000Z" });
    fs.writeFileSync(path.join(result.runDir, "events.ndjson"), "\n");
    const verify = verifyLocalGovernedProof(root);
    expect(verify.ok).toBe(false);
    expect(verify.reasons).toContain("insufficient_events");
  });
});
