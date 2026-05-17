// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import { execa } from "execa";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

const smokeScript = path.join(process.cwd(), "scripts", "smoke", "operator-cli-smoke.mjs");
const fixtureGenScript = path.join(process.cwd(), "scripts", "fixtures", "generate-fixtures.mjs");

describe("operator CLI smoke harness", () => {
  it("passes on demo fixtures after generation", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "smoke-test-"));

    await execa("node", [fixtureGenScript, "--output", tmpDir]);

    const { stdout } = await execa("node", [smokeScript, "--fixture-dir", tmpDir]);
    expect(stdout).toContain("smoke tests passed");

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("validates JSON output structure", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "smoke-json-"));

    await execa("node", [fixtureGenScript, "--output", tmpDir]);

    const receiptPath = path.join(tmpDir, "receipt.json");
    const content = fs.readFileSync(receiptPath, "utf-8");
    const receipt = JSON.parse(content);

    expect(receipt.receiptId).toBeDefined();
    expect(receipt.type).toBeDefined();
    expect(receipt.timestamp).toBeDefined();

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("verifies redaction in smoke output", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "smoke-redact-"));

    await execa("node", [fixtureGenScript, "--output", tmpDir]);

    const files = fs.readdirSync(tmpDir);
    for (const file of files) {
      const content = fs.readFileSync(path.join(tmpDir, file), "utf-8");
      expect(content).not.toMatch(/sk-[a-zA-Z0-9]{48}/);
      expect(content).not.toMatch(/gh[pousr]_[a-zA-Z0-9]{36}/);
      expect(content).not.toMatch(/nvapi-[a-zA-Z0-9_-]{40,}/);
    }

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
