// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import { execa } from "execa";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

const scriptsDir = path.join(process.cwd(), "scripts", "review");

describe("review/check-claims.mjs", () => {
  it("passes when docs contain no forbidden claims", async () => {
    const { stdout } = await execa("node", [path.join(scriptsDir, "check-claims.mjs")]);
    expect(stdout).toContain("No forbidden claims found");
  });

  it("catches unsupported claim words", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "claims-test-"));
    const testFile = path.join(tmpDir, "test.md");
    fs.writeFileSync(testFile, "# Test\n\nThis product is 100% foolproof and guaranteed.");

    try {
      await execa("node", [path.join(scriptsDir, "check-claims.mjs"), tmpDir], {
        reject: false,
      });
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe("review/check-status-matrix.mjs", () => {
  it("passes on valid status labels", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "status-test-"));
    const testFile = path.join(tmpDir, "test.md");
    fs.writeFileSync(
      testFile,
      `| Feature | Status |
|---------|--------|
| Auth    | stable |
| API     | alpha  |
`,
    );

    const { stdout, exitCode } = await execa("node", [
      path.join(scriptsDir, "check-status-matrix.mjs"),
      tmpDir,
    ]);

    fs.rmSync(tmpDir, { recursive: true, force: true });
    expect(exitCode).toBe(0);
  });

  it("rejects invalid status labels", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "status-invalid-"));
    const testFile = path.join(tmpDir, "test.md");
    fs.writeFileSync(
      testFile,
      `| Feature | Status |
|---------|--------|
| Auth    | magic  |
`,
    );

    const { stderr, exitCode } = await execa(
      "node",
      [path.join(scriptsDir, "check-status-matrix.mjs"), tmpDir],
      { reject: false },
    );

    fs.rmSync(tmpDir, { recursive: true, force: true });
    expect(exitCode).toBe(1);
    expect(stderr).toContain("Invalid status label");
  });
});

describe("review/check-no-theatre.mjs", () => {
  it("passes when no security theatre words are present", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "theatre-test-"));
    const testFile = path.join(tmpDir, "test.md");
    fs.writeFileSync(testFile, "# Test\n\nThis uses defense-in-depth.");

    const { stdout } = await execa("node", [path.join(scriptsDir, "check-no-theatre.mjs"), tmpDir]);

    fs.rmSync(tmpDir, { recursive: true, force: true });
    expect(stdout).toContain("Security theatre check complete");
  });

  it("catches security theatre words", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "theatre-catch-"));
    const testFile = path.join(tmpDir, "test.md");
    fs.writeFileSync(testFile, "# Test\n\nThis is military-grade security.");

    const { exitCode, stderr } = await execa(
      "node",
      [path.join(scriptsDir, "check-no-theatre.mjs"), tmpDir],
      { reject: false },
    );

    fs.rmSync(tmpDir, { recursive: true, force: true });
    expect(exitCode).toBe(1);
    expect(stderr).toContain("security theatre word");
  });
});

describe("review/check-fixtures-redacted.mjs", () => {
  it("passes when fixtures contain no secrets", async () => {
    const { stdout } = await execa("node", [
      path.join(scriptsDir, "check-fixtures-redacted.mjs"),
    ]);
    expect(stdout).toContain("Fixtures redaction check complete");
  });

  it("catches unredacted secrets in fixtures", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fixtures-redact-"));
    const testFile = path.join(tmpDir, "secret.json");
    fs.writeFileSync(testFile, '{"token": "sk-abcdefghijklmnop1234567890abcdefghijklmnop123456789012"}');

    const { exitCode, stderr } = await execa(
      "node",
      [path.join(scriptsDir, "check-fixtures-redacted.mjs"), tmpDir],
      { reject: false },
    );

    fs.rmSync(tmpDir, { recursive: true, force: true });
    expect(exitCode).toBe(1);
    expect(stderr).toContain("potential unredacted secret");
  });
});

describe("review/check-doc-index.mjs", () => {
  it("passes when required doc index files exist", async () => {
    const { stdout } = await execa("node", [path.join(scriptsDir, "check-doc-index.mjs")]);
    expect(stdout).toContain("All required doc indexes are present");
  });
});

describe("review/check-spdx-docs.mjs", () => {
  it("passes when docs have SPDX headers", async () => {
    const { stdout } = await execa("node", [path.join(scriptsDir, "check-spdx-docs.mjs")]);
    expect(stdout).toContain("SPDX docs check complete");
  });

  it("fails when docs are missing SPDX headers", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "spdx-test-"));
    const testFile = path.join(tmpDir, "test.md");
    fs.writeFileSync(testFile, "# Test\n\nNo SPDX header here.");

    const { exitCode, stderr } = await execa(
      "node",
      [path.join(scriptsDir, "check-spdx-docs.mjs"), tmpDir],
      { reject: false },
    );

    fs.rmSync(tmpDir, { recursive: true, force: true });
    expect(exitCode).toBe(1);
    expect(stderr).toContain("Missing SPDX header");
  });
});

describe("review/check-proofpack.mjs", () => {
  it("runs without crashing", async () => {
    const { stdout } = await execa("node", [path.join(scriptsDir, "check-proofpack.mjs")]);
    expect(stdout).toContain("check-proofpack");
  });

  it("validates proofpack fixture structure when fixtures exist", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "proofpack-test-"));
    const proofpackPath = path.join(tmpDir, "proofpack.json");
    fs.writeFileSync(
      proofpackPath,
      JSON.stringify([
        {
          id: "test-1",
          state: "ok",
          detail: "valid proofpack entry",
        },
      ]),
    );

    const { stdout } = await execa("node", [
      path.join(scriptsDir, "check-proofpack.mjs"),
      tmpDir,
    ]);

    fs.rmSync(tmpDir, { recursive: true, force: true });
    expect(stdout).toContain("Reviewing proofpack");
  });

  it("catches unredacted secrets in proofpack fixtures", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "proofpack-secret-"));
    const proofpackPath = path.join(tmpDir, "proofpack.json");
    fs.writeFileSync(
      proofpackPath,
      JSON.stringify([
        {
          id: "test-1",
          state: "ok",
          detail: "token=nvapi-abcdefghijklmnopqrstuvwxyz1234567890",
        },
      ]),
    );

    const { exitCode, stderr } = await execa(
      "node",
      [path.join(scriptsDir, "check-proofpack.mjs"), tmpDir],
      { reject: false },
    );

    fs.rmSync(tmpDir, { recursive: true, force: true });
    expect(exitCode).toBe(1);
    expect(stderr).toContain("unredacted");
  });
});
