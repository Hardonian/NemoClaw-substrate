// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export interface NamingViolation {
  file: string;
  line: number;
  identifier: string;
  rule: string;
  suggestion: string;
}

export interface NamingConventionReport {
  violations: NamingViolation[];
  summary: {
    total: number;
    camelCase: number;
    snakeCase: number;
    acronymNormalized: number;
  };
}

const ACRONYM_MAP: Record<string, string> = {
  SSRF: "SSRF",
  HTTP: "HTTP",
  URL: "URL",
  API: "API",
  CLI: "CLI",
  E2E: "E2E",
  CI: "CI",
  UI: "UI",
  ID: "ID",
  JSON: "JSON",
  YAML: "YAML",
};

function normalizeAcronym(input: string): string {
  let result = input;
  for (const [key, normalized] of Object.entries(ACRONYM_MAP)) {
    const lowerKey = key.toLowerCase();
    result = result.replace(new RegExp(`\\b${lowerKey}\\b`, "gi"), normalized);
  }
  return result;
}

function isCamelCase(name: string): boolean {
  return /^[a-z][a-zA-Z0-9]*$/.test(name);
}

function isSnakeCase(name: string): boolean {
  return /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/.test(name);
}

function toCamelCase(snake: string): string {
  return snake.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function toSnakeCase(camel: string): string {
  return camel
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "");
}

export function scanNamingConventions(
  source: string,
  fileName: string = "<unknown>",
  options: { checkCamelCase?: boolean; checkSnakeCase?: boolean; checkAcronyms?: boolean } = {},
): NamingConventionReport {
  const { checkCamelCase = true, checkSnakeCase = true, checkAcronyms = true } = options;
  const violations: NamingViolation[] = [];
  const lines = source.split("\n");

  let camelCaseViolations = 0;
  let snakeCaseViolations = 0;
  let acronymNormalized = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (checkAcronyms) {
      const acronymMatches = line.match(/\b(http|url|api|cli|e2e|ci|ui|id|json|yaml|ssrf)\w*/gi);
      if (acronymMatches) {
        for (const match of acronymMatches) {
          const normalized = normalizeAcronym(match);
          if (match !== normalized && !match.startsWith("//") && !match.startsWith("*")) {
            violations.push({
              file: fileName,
              line: i + 1,
              identifier: match,
              rule: "acronym-normalization",
              suggestion: `Use "${normalized}" instead of "${match}"`,
            });
            acronymNormalized++;
          }
        }
      }
    }

    if (checkCamelCase) {
      const funcMatches = line.matchAll(/(?:function|const|let|var)\s+([a-zA-Z_]\w*)/g);
      for (const match of funcMatches) {
        const name = match[1];
        if (name.startsWith("_")) continue;
        if (isSnakeCase(name) && name.includes("_")) {
          violations.push({
            file: fileName,
            line: i + 1,
            identifier: name,
            rule: "camelCase-expected",
            suggestion: `Use "${toCamelCase(name)}" instead of "${name}"`,
          });
          snakeCaseViolations++;
        }
      }
    }

    if (checkSnakeCase) {
      const snakeCandidates = line.matchAll(/const\s+([a-z]+(?:_[a-z0-9]+)+)\s*=/g);
      for (const match of snakeCandidates) {
        const name = match[1];
        if (name.startsWith("_")) continue;
        const camelVersion = toCamelCase(name);
        if (camelVersion !== name && !line.trim().startsWith("//")) {
          violations.push({
            file: fileName,
            line: i + 1,
            identifier: name,
            rule: "snake_case-expected",
            suggestion: `Use "${name}" (snake_case is correct for constants)`,
          });
        }
      }
    }
  }

  return {
    violations,
    summary: {
      total: violations.length,
      camelCase: camelCaseViolations,
      snakeCase: snakeCaseViolations,
      acronymNormalized,
    },
  };
}

export function checkNamingConventionsStrict(
  source: string,
  fileName?: string,
): boolean {
  const report = scanNamingConventions(source, fileName);
  return report.violations.length === 0;
}
