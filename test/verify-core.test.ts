// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

function nodeOnlyPath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nemoclaw-verify-core-"));
  fs.symlinkSync(process.execPath, path.join(dir, "node"));
  return dir;
}

describe("verify-core script", () => {
  it("reports missing toolchain as WARN in relaxed mode", () => {
    const result = spawnSync("node", ["scripts/verify-core.js"], {
      cwd: process.cwd(),
      env: { ...process.env, PATH: nodeOnlyPath() },
      encoding: "utf8",
    });
    expect(result.stdout).toContain("WARN");
    expect(result.status).toBe(0);
  });

  it("fails in strict mode when required toolchain is unavailable", () => {
    const result = spawnSync("node", ["scripts/verify-core.js", "--strict"], {
      cwd: process.cwd(),
      env: { ...process.env, PATH: nodeOnlyPath() },
      encoding: "utf8",
    });
    expect(result.stdout).toContain("WARN");
    expect(result.status).toBe(1);
  });
});
