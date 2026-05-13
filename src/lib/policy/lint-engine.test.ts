// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { lintPolicyFile, formatLintReport, resolveSchemaPath } from "./lint-engine";

function findProjectRoot(): string {
  let current = __dirname;
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(current, "schemas", "sandbox-policy.schema.json"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return path.resolve(__dirname, "..", "..", "..", "..");
}

describe("lint-engine", () => {
  let tmpDir: string;
  let projectRoot: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(process.cwd(), "tmp-lint-"));
    projectRoot = findProjectRoot();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("resolveSchemaPath", () => {
    it("resolves sandbox-policy schema path", () => {
      const p = resolveSchemaPath("sandbox-policy");
      expect(p).toMatch(/sandbox-policy\.schema\.json$/);
    });

    it("resolves policy-preset schema path", () => {
      const p = resolveSchemaPath("policy-preset");
      expect(p).toMatch(/policy-preset\.schema\.json$/);
    });
  });

  describe("valid policy", () => {
    it("returns no errors for a valid sandbox policy", () => {
      const schemaPath = resolveSchemaPath("sandbox-policy");
      if (!fs.existsSync(schemaPath)) {
        return;
      }
      const filePath = path.join(tmpDir, "valid-policy.yaml");
      fs.writeFileSync(filePath, `version: 1\nnetwork_policies:\n  test_policy:\n    name: test_policy\n    endpoints:\n      - host: api.example.com\n        port: 443\n`);

      const result = lintPolicyFile(filePath, "sandbox-policy");
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("schema validation", () => {
    it("detects missing required fields", () => {
      const schemaPath = resolveSchemaPath("sandbox-policy");
      if (!fs.existsSync(schemaPath)) {
        return;
      }
      const filePath = path.join(tmpDir, "missing-version.yaml");
      fs.writeFileSync(filePath, `network_policies: {}\n`);

      const result = lintPolicyFile(filePath, "sandbox-policy");
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code.includes("required") || e.message.includes("version"))).toBe(true);
    });

    it("detects invalid network_policies type", () => {
      const schemaPath = resolveSchemaPath("sandbox-policy");
      if (!fs.existsSync(schemaPath)) {
        return;
      }
      const filePath = path.join(tmpDir, "bad-net-policies.yaml");
      fs.writeFileSync(filePath, `version: 1\nnetwork_policies: "not an object"\n`);

      const result = lintPolicyFile(filePath, "sandbox-policy");
      expect(result.valid).toBe(false);
    });
  });

  describe("semantic validation", () => {
    it("detects wildcard host as warning", () => {
      const filePath = path.join(tmpDir, "wildcard.yaml");
      fs.writeFileSync(filePath, `version: 1\nnetwork_policies:\n  wildcard:\n    name: wildcard\n    endpoints:\n      - host: "*"\n        port: 80\n`);

      const result = lintPolicyFile(filePath, "sandbox-policy");
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.code === "semantic:wildcard_host")).toBe(true);
    });

    it("detects shell injection in binary constraints", () => {
      const filePath = path.join(tmpDir, "injection.yaml");
      fs.writeFileSync(filePath, `version: 1\nnetwork_policies:\n  bad_bin:\n    name: bad_bin\n    endpoints:\n      - host: api.example.com\n        port: 443\n    binaries:\n      - "curl; rm -rf /"\n`);

      const result = lintPolicyFile(filePath, "sandbox-policy");
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "semantic:shell_injection")).toBe(true);
    });

    it("detects unrestricted access rule", () => {
      const filePath = path.join(tmpDir, "unrestricted.yaml");
      fs.writeFileSync(filePath, `version: 1\nnetwork_policies:\n  open:\n    name: open\n    endpoints:\n      - host: api.example.com\n        port: 443\n    rules:\n      - access: "*"\n`);

      const result = lintPolicyFile(filePath, "sandbox-policy");
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "semantic:unrestricted_access")).toBe(true);
    });

    it("detects root process as warning", () => {
      const filePath = path.join(tmpDir, "root.yaml");
      fs.writeFileSync(filePath, `version: 1\nnetwork_policies:\n  test:\n    name: test\n    endpoints:\n      - host: api.example.com\n        port: 443\nprocess:\n  run_as_user: root\n`);

      const result = lintPolicyFile(filePath, "sandbox-policy");
      expect(result.warnings.some((w) => w.code === "semantic:root_process")).toBe(true);
    });

    it("detects overly permissive filesystem access", () => {
      const filePath = path.join(tmpDir, "permissive-fs.yaml");
      fs.writeFileSync(filePath, `version: 1\nnetwork_policies:\n  test:\n    name: test\n    endpoints:\n      - host: api.example.com\n        port: 443\nfilesystem_policy:\n  read_write:\n    - /\n`);

      const result = lintPolicyFile(filePath, "sandbox-policy");
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "semantic:permissive_fs")).toBe(true);
    });

    it("detects unreachable policy branches", () => {
      const filePath = path.join(tmpDir, "unreachable.yaml");
      fs.writeFileSync(filePath, `version: 1\nnetwork_policies:\n  empty_policy:\n    name: empty\n`);

      const result = lintPolicyFile(filePath, "sandbox-policy");
      expect(result.warnings.some((w) => w.code === "semantic:unreachable")).toBe(true);
    });
  });

  describe("file errors", () => {
    it("handles nonexistent file", () => {
      const result = lintPolicyFile("/nonexistent/path.yaml", "sandbox-policy");
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "io:read")).toBe(true);
    });

    it("handles invalid YAML syntax", () => {
      const filePath = path.join(tmpDir, "bad-yaml.yaml");
      fs.writeFileSync(filePath, `foo: [bar\n    nested: {incomplete\n  - [unclosed`);

      const result = lintPolicyFile(filePath, "sandbox-policy");
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code.startsWith("parse:"))).toBe(true);
    });
  });

  describe("formatLintReport", () => {
    it("formats a clean report", () => {
      const report = formatLintReport({ errors: [], warnings: [], valid: true });
      expect(report).toContain("No issues found");
    });

    it("formats error report", () => {
      const report = formatLintReport({
        errors: [{ file: "test.yaml", line: 5, column: 1, message: "test error", severity: "error", code: "schema:required" }],
        warnings: [],
        valid: false,
      });
      expect(report).toContain("Found 1 error(s)");
      expect(report).toContain("Result: FAIL");
    });

    it("formats warning report", () => {
      const report = formatLintReport({
        errors: [],
        warnings: [{ file: "test.yaml", line: 5, column: 1, message: "test warning", severity: "warning", code: "semantic:wildcard" }],
        valid: true,
      });
      expect(report).toContain("Found 1 warning(s)");
      expect(report).toContain("Result: WARN");
    });
  });

  describe("real preset files", () => {
    it("validates all built-in presets against schema", () => {
      const presetsDir = path.join(projectRoot, "nemoclaw-blueprint", "policies", "presets");
      if (!fs.existsSync(presetsDir)) {
        return;
      }
      const files = fs.readdirSync(presetsDir).filter((f) => f.endsWith(".yaml"));
      for (const file of files) {
        const filePath = path.join(presetsDir, file);
        const result = lintPolicyFile(filePath, "policy-preset");
        if (!result.valid) {
          const messages = result.errors.map((e) => e.message).join("\n  ");
          throw new Error(`Preset ${file} failed validation:\n  ${messages}`);
        }
      }
    });
  });
});
