// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import { execa } from "execa";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const fixturesDir = path.join(process.cwd(), "fixtures");
const schemasDir = path.join(process.cwd(), "schemas");

describe("fixture generator determinism", () => {
  it("generates identical output on repeated runs", async () => {
    const tmpDir1 = fs.mkdtempSync(path.join(os.tmpdir(), "fixture-det-1-"));
    const tmpDir2 = fs.mkdtempSync(path.join(os.tmpdir(), "fixture-det-2-"));

    await execa("node", [
      path.join(process.cwd(), "scripts", "fixtures", "generate-fixtures.mjs"),
      "--output",
      tmpDir1,
    ]);
    await execa("node", [
      path.join(process.cwd(), "scripts", "fixtures", "generate-fixtures.mjs"),
      "--output",
      tmpDir2,
    ]);

    const files1 = fs.readdirSync(tmpDir1).sort();
    const files2 = fs.readdirSync(tmpDir2).sort();
    expect(files1).toEqual(files2);

    for (const file of files1) {
      const content1 = fs.readFileSync(path.join(tmpDir1, file), "utf-8");
      const content2 = fs.readFileSync(path.join(tmpDir2, file), "utf-8");
      expect(content1).toBe(content2);
    }

    fs.rmSync(tmpDir1, { recursive: true, force: true });
    fs.rmSync(tmpDir2, { recursive: true, force: true });
  });
});

describe("fixture generator redaction", () => {
  it("generated fixtures contain no unredacted secrets", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fixture-redact-"));

    await execa("node", [
      path.join(process.cwd(), "scripts", "fixtures", "generate-fixtures.mjs"),
      "--output",
      tmpDir,
    ]);

    const secretPatterns = [
      /sk-[a-zA-Z0-9]{48}/,
      /gh[pousr]_[a-zA-Z0-9]{36}/,
      /nvapi-[a-zA-Z0-9_-]{40,}/,
    ];

    const files = fs.readdirSync(tmpDir);
    for (const file of files) {
      const content = fs.readFileSync(path.join(tmpDir, file), "utf-8");
      for (const pattern of secretPatterns) {
        expect(content).not.toMatch(pattern);
      }
    }

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe("fixtures validate against schemas", () => {
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);

  it("generated receipt fixture validates against receipt schema", async () => {
    const schemaPath = path.join(schemasDir, "receipt.schema.json");
    if (!fs.existsSync(schemaPath)) return;

    const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
    const validate = ajv.compile(schema);

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "schema-validate-"));
    await execa("node", [path.join(process.cwd(), "scripts", "fixtures", "generate-fixtures.mjs"), "--output", tmpDir]);

    const fixturePath = path.join(tmpDir, "receipt.json");
    const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
    const valid = validate(fixture);
    expect(valid).toBe(true);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("generated replay envelope validates against replay schema", async () => {
    const schemaPath = path.join(schemasDir, "replay-envelope.schema.json");
    if (!fs.existsSync(schemaPath)) return;

    const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
    const validate = ajv.compile(schema);

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "schema-validate-"));
    await execa("node", [path.join(process.cwd(), "scripts", "fixtures", "generate-fixtures.mjs"), "--output", tmpDir]);

    const fixturePath = path.join(tmpDir, "replay-envelope.json");
    const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
    const valid = validate(fixture);
    expect(valid).toBe(true);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("generated trust attestation validates against trust decision schema", async () => {
    const schemaPath = path.join(schemasDir, "trust-decision.schema.json");
    if (!fs.existsSync(schemaPath)) return;

    const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
    const validate = ajv.compile(schema);

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "schema-validate-"));
    await execa("node", [path.join(process.cwd(), "scripts", "fixtures", "generate-fixtures.mjs"), "--output", tmpDir]);

    const fixturePath = path.join(tmpDir, "trust-attestation.json");
    const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
    const valid = validate(fixture);
    expect(valid).toBe(true);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe("schema validator rejects malformed examples", () => {
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);

  it("rejects receipt missing required fields", async () => {
    const schema = JSON.parse(fs.readFileSync(path.join(schemasDir, "receipt.schema.json"), "utf-8"));
    const validate = ajv.compile(schema);

    const invalid = { receiptId: "x" };
    expect(validate(invalid)).toBe(false);
  });

  it("rejects replay envelope missing required fields", async () => {
    const schema = JSON.parse(
      fs.readFileSync(path.join(schemasDir, "replay-envelope.schema.json"), "utf-8"),
    );
    const validate = ajv.compile(schema);

    const invalid = { replayId: "x" };
    expect(validate(invalid)).toBe(false);
  });

  it("rejects trust decision missing required fields", async () => {
    const schema = JSON.parse(
      fs.readFileSync(path.join(schemasDir, "trust-decision.schema.json"), "utf-8"),
    );
    const validate = ajv.compile(schema);

    const invalid = { decisionId: "x" };
    expect(validate(invalid)).toBe(false);
  });
});
