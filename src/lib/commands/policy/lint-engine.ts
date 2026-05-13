// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import * as fs from "fs";
import * as path from "path";
import Ajv from "ajv/dist/2020";
import type { ErrorObject } from "ajv";
import * as yaml from "yaml";

export interface PolicyLintError {
  file: string;
  line: number;
  column: number;
  message: string;
  severity: "error" | "warning";
  code: string;
}

export interface PolicyLintResult {
  errors: PolicyLintError[];
  warnings: PolicyLintError[];
  valid: boolean;
}

export type PolicySchemaType = "sandbox-policy" | "policy-preset";

export function resolveSchemaPath(schemaType: PolicySchemaType): string {
  const projectRoot = path.resolve(__dirname, "..", "..", "..", "..");
  const schemasDir = path.join(projectRoot, "schemas");
  switch (schemaType) {
    case "sandbox-policy":
      return path.join(schemasDir, "sandbox-policy.schema.json");
    case "policy-preset":
      return path.join(schemasDir, "policy-preset.schema.json");
  }
}

function locateLineAndColumn(doc: yaml.Document.Parsed, errPath: string): { line: number; column: number } {
  const pathParts = errPath.replace(/^\//, "").split("/").filter(Boolean);
  let node: yaml.Document.Parsed["contents"] = doc.contents;
  for (const segment of pathParts) {
    if (!node) break;
    if (yaml.isMap(node)) {
      const item = node.items.find((i) => yaml.isScalar(i.key) && String(i.key.value) === segment);
      node = item?.value ?? null;
    } else if (yaml.isSeq(node)) {
      const idx = Number(segment);
      if (!isNaN(idx)) node = node.items[idx] ?? null;
      else break;
    } else {
      break;
    }
  }
  if (node && "range" in node && node.range && doc.range) {
    const src = doc.toString();
    const before = src.slice(0, node.range[0]);
    const lines = before.split("\n");
    return { line: lines.length, column: lines[lines.length - 1].length + 1 };
  }
  return { line: 1, column: 1 };
}

function formatAjvPath(instancePath: string): string {
  if (!instancePath) return "root";
  return instancePath.replace(/^\//, "").replace(/\//g, ".");
}

function schemaErrorToLintError(
  err: ErrorObject,
  filePath: string,
  doc: yaml.Document.Parsed,
): PolicyLintError {
  const { line, column } = locateLineAndColumn(doc, err.instancePath);
  return {
    file: filePath,
    line,
    column,
    message: `${formatAjvPath(err.instancePath)}: ${err.message ?? "Validation failed"} (${err.keyword})`,
    severity: "error",
    code: `schema:${err.keyword}`,
  };
}

export function lintPolicyFile(
  filePath: string,
  schemaType: PolicySchemaType,
): PolicyLintResult {
  const errors: PolicyLintError[] = [];
  const warnings: PolicyLintError[] = [];

  let content: string;
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { errors: [{ file: filePath, line: 0, column: 0, message: `Cannot read file: ${msg}`, severity: "error", code: "io:read" }], warnings: [], valid: false };
  }

  let parsed: unknown;
  let doc: yaml.Document.Parsed;
  try {
    doc = yaml.parseDocument(content);
    if (!yaml.isDocument(doc)) {
      return { errors: [{ file: filePath, line: 0, column: 0, message: "Not a valid YAML document", severity: "error", code: "parse:invalid" }], warnings: [], valid: false };
    }
    if (doc.errors.length > 0) {
      const parseErrors: PolicyLintError[] = doc.errors.map((e) => {
        const pos = (e as { linePos?: Array<{ line: number; col: number }> }).linePos?.[0];
        return { file: filePath, line: pos?.line ?? 1, column: pos?.col ?? 1, message: `YAML parse error: ${e.message}`, severity: "error", code: "parse:syntax" };
      });
      return { errors: parseErrors, warnings: [], valid: false };
    }
    parsed = doc.toJSON();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const match = msg.match(/line (\d+)/i);
    const line = match ? parseInt(match[1], 10) : 1;
    return { errors: [{ file: filePath, line, column: 0, message: `YAML parse error: ${msg}`, severity: "error", code: "parse:syntax" }], warnings: [], valid: false };
  }

  const schemaPath = resolveSchemaPath(schemaType);
  let schema: unknown;
  try {
    schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { errors: [{ file: filePath, line: 0, column: 0, message: `Cannot load schema: ${msg}`, severity: "error", code: "schema:load" }], warnings: [], valid: false };
  }

  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema as Record<string, unknown>);
  const valid = validate(parsed);

  if (!valid) {
    for (const err of validate.errors ?? []) {
      errors.push(schemaErrorToLintError(err, filePath, doc));
    }
  }

  const semanticErrors = lintSemantic(parsed as Record<string, unknown>, filePath, doc);
  errors.push(...semanticErrors.errors);
  warnings.push(...semanticErrors.warnings);

  return { errors, warnings, valid: errors.length === 0 };
}

function lintSemantic(
  policy: Record<string, unknown>,
  filePath: string,
  doc: yaml.Document.Parsed,
): { errors: PolicyLintError[]; warnings: PolicyLintError[] } {
  const errors: PolicyLintError[] = [];
  const warnings: PolicyLintError[] = [];

  const netPolicies = policy.network_policies as Record<string, unknown> | undefined;
  if (!netPolicies || typeof netPolicies !== "object") {
    return { errors, warnings };
  }

  const policyNames = Object.keys(netPolicies);
  const seenHosts = new Set<string>();
  const seenNamePorts = new Set<string>();
  const wildcardOverrides: string[] = [];

  for (const [policyName, policyEntry] of Object.entries(netPolicies)) {
    if (typeof policyEntry !== "object" || policyEntry === null) continue;
    const entry = policyEntry as Record<string, unknown>;

    const name = entry.name as string | undefined;
    if (!name) {
      const { line, column } = locateLineAndColumn(doc, `/network_policies/${policyName}`);
      errors.push({ file: filePath, line, column, message: `Policy "${policyName}" is missing a required "name" field`, severity: "error", code: "semantic:missing_name" });
    }

    const endpoints = entry.endpoints as Array<Record<string, unknown>> | undefined;
    if (!endpoints || !Array.isArray(endpoints)) continue;

    for (const ep of endpoints) {
      const host = ep.host as string | undefined;
      const port = ep.port as number | undefined;

      if (host && port) {
        const key = `${host}:${port}`;
        if (seenNamePorts.has(key) && name) {
          const { line, column } = locateLineAndColumn(doc, `/network_policies/${policyName}`);
          warnings.push({ file: filePath, line, column, message: `Duplicate endpoint ${key} in policy "${name}"`, severity: "warning", code: "semantic:duplicate_endpoint" });
        }
        seenNamePorts.add(key);
      }

      if (host === "*") {
        const { line, column } = locateLineAndColumn(doc, `/network_policies/${policyName}`);
        wildcardOverrides.push(policyName);
        warnings.push({ file: filePath, line, column, message: `Wildcard host "*" in policy "${policyName}" bypasses fail-closed posture`, severity: "warning", code: "semantic:wildcard_host" });
      }

      if (host) seenHosts.add(host);
    }

    const binaries = entry.binaries as Array<string | Record<string, unknown>> | undefined;
    if (binaries) {
      for (const bin of binaries) {
        const binStr = typeof bin === "string" ? bin : (typeof bin === "object" && bin !== null ? String((bin as Record<string, unknown>).path ?? "") : "");
        if (binStr.includes("$") || binStr.includes("`") || binStr.includes(";") || binStr.includes("|") || binStr.includes("&&")) {
          const { line, column } = locateLineAndColumn(doc, `/network_policies/${policyName}`);
          errors.push({ file: filePath, line, column, message: `Potential shell injection vector in binary constraint "${binStr}" for policy "${name}"`, severity: "error", code: "semantic:shell_injection" });
        }
      }
    }

    const rules = entry.rules as Array<Record<string, unknown>> | undefined;
    if (rules) {
      for (const rule of rules) {
        const access = rule.access as string | undefined;
        if (access === "*" && name) {
          const { line, column } = locateLineAndColumn(doc, `/network_policies/${policyName}`);
          errors.push({ file: filePath, line, column, message: `Unrestricted access "*" in rule for policy "${name}" violates fail-closed posture`, severity: "error", code: "semantic:unrestricted_access" });
        }
      }
    }
  }

  for (const [policyName, policyEntry] of Object.entries(netPolicies)) {
    if (typeof policyEntry !== "object" || policyEntry === null) continue;
    const entry = policyEntry as Record<string, unknown>;
    const name = entry.name as string | undefined;
    const endpoints = entry.endpoints as Array<Record<string, unknown>> | undefined;
    if (!endpoints || !Array.isArray(endpoints) || endpoints.length === 0) {
      const { line, column } = locateLineAndColumn(doc, `/network_policies/${policyName}`);
      warnings.push({ file: filePath, line, column, message: `Policy "${name ?? policyName}" has no endpoints — unreachable rule branch`, severity: "warning", code: "semantic:unreachable" });
    }
  }

  const version = policy.version as number | undefined;
  if (version !== undefined && version < 1) {
    errors.push({ file: filePath, line: 1, column: 1, message: `Policy version must be >= 1, got ${version}`, severity: "error", code: "semantic:invalid_version" });
  }

  const fsPolicy = policy.filesystem_policy as Record<string, unknown> | undefined;
  if (fsPolicy) {
    const readWrite = fsPolicy.read_write as string[] | undefined;
    if (readWrite && readWrite.some((p) => p === "/" || p === "/*" || p === "**")) {
      errors.push({ file: filePath, line: 1, column: 1, message: "Overly permissive filesystem write access — root or wildcard path", severity: "error", code: "semantic:permissive_fs" });
    }
  }

  const processPolicy = policy.process as Record<string, unknown> | undefined;
  if (processPolicy) {
    const runAsUser = processPolicy.run_as_user as string | undefined;
    if (runAsUser === "root") {
      warnings.push({ file: filePath, line: 1, column: 1, message: "Process configured to run as root — consider least-privilege user", severity: "warning", code: "semantic:root_process" });
    }
  }

  return { errors, warnings };
}

export function formatLintReport(result: PolicyLintResult): string {
  const lines: string[] = [];
  if (result.valid && result.warnings.length === 0) {
    lines.push("No issues found. Policy is valid.");
    return lines.join("\n");
  }

  if (result.errors.length > 0) {
    lines.push(`Found ${result.errors.length} error(s):`);
    for (const err of result.errors) {
      const loc = err.line > 0 ? `${err.file}:${err.line}:${err.column}` : err.file;
      lines.push(`  ${loc} [${err.code}] ${err.message}`);
    }
    lines.push("");
  }

  if (result.warnings.length > 0) {
    lines.push(`Found ${result.warnings.length} warning(s):`);
    for (const warn of result.warnings) {
      const loc = warn.line > 0 ? `${warn.file}:${warn.line}:${warn.column}` : warn.file;
      lines.push(`  ${loc} [${warn.code}] ${warn.message}`);
    }
    lines.push("");
  }

  if (!result.valid) {
    lines.push(`Result: FAIL (${result.errors.length} error(s), ${result.warnings.length} warning(s))`);
  } else {
    lines.push(`Result: WARN (0 error(s), ${result.warnings.length} warning(s))`);
  }

  return lines.join("\n");
}
