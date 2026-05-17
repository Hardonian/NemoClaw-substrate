#!/usr/bin/env -S npx tsx
// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
//
// Data-flow audit: scans for unauthorized data egress patterns.
// Checks source code, configs, and policies for potential data exfiltration vectors.
//
// Usage:
//   npx tsx scripts/verify-export.ts
//   npx tsx scripts/verify-export.ts --strict

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

type EgressCheck = { name: string; passed: boolean; detail: string; severity: "error" | "warning" };

type EgressResult = {
  passed: boolean;
  checks: EgressCheck[];
  errors: EgressCheck[];
  warnings: EgressCheck[];
};

type ScanTarget = {
  path: string;
  content: string;
};

// Patterns that indicate potential unauthorized data egress
const EGRESS_PATTERNS = [
  // Outbound network calls to unknown hosts
  {
    pattern:
      /https?:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0|docs\.nvidia\.com|github\.com|npmjs\.com|pypi\.org|huggingface\.co|api\.openai\.com)[a-z0-9.-]+\//gi,
    name: "external_url",
    severity: "warning" as const,
  },
  // Hardcoded secrets/tokens in source
  {
    pattern:
      /(api[_-]?key|secret[_-]?key|access[_-]?token|auth[_-]?token)\s*[=:]\s*['"][A-Za-z0-9+/=]{16,}['"]/gi,
    name: "hardcoded_secret",
    severity: "error" as const,
  },
  // Data exfiltration patterns (base64 encoding + outbound)
  {
    pattern: /base64.*(?:fetch|http|curl|axios|request)/gi,
    name: "encoded_exfiltration",
    severity: "error" as const,
  },
  // DNS tunneling patterns
  {
    pattern: /(?:dns|resolve)\s*\(\s*`[^`]*\$\{.*\}[^`]*\.(?:exfil|tunnel|data|log)/gi,
    name: "dns_tunnel",
    severity: "error" as const,
  },
  // Writing to /dev/tcp or similar
  { pattern: /\/dev\/tcp\//gi, name: "dev_tcp_redirect", severity: "error" as const },
];

// Allowed egress endpoints from network policies
const ALLOWED_EGRESS = new Set([
  "localhost",
  "127.0.0.1",
  "docs.nvidia.com",
  "github.com",
  "api.github.com",
  "npmjs.com",
  "registry.npmjs.org",
  "pypi.org",
  "files.pythonhosted.org",
  "huggingface.co",
  "api.openai.com",
  "api.anthropic.com",
  "openrouter.ai",
]);

function walkDir(dir: string, extensions: string[]): ScanTarget[] {
  const results: ScanTarget[] = [];
  if (!existsSync(dir)) return results;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);

    // Skip node_modules, dist, .git, and binary files
    if (
      entry.name === "node_modules" ||
      entry.name === ".git" ||
      entry.name === "dist" ||
      entry.name === "coverage" ||
      entry.name === "_build"
    ) {
      continue;
    }

    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath, extensions));
    } else if (entry.isFile()) {
      if (extensions.some((ext) => entry.name.endsWith(ext))) {
        try {
          const content = readFileSync(fullPath, "utf-8");
          results.push({ path: fullPath, content });
        } catch {
          // Skip unreadable files
        }
      }
    }
  }
  return results;
}

function scanForHardcodedSecrets(targets: ScanTarget[]): EgressCheck[] {
  const findings: EgressCheck[] = [];
  const secretPattern =
    /(api[_-]?key|secret[_-]?key|access[_-]?token|auth[_-]?token)\s*[=:]\s*['"][A-Za-z0-9+/=]{16,}['"]/gi;

  for (const target of targets) {
    const relativePath = target.path.replace(REPO_ROOT + "/", "");
    const lines = target.content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      // Skip comments and test fixtures
      if (
        lines[i].trim().startsWith("//") ||
        lines[i].trim().startsWith("#") ||
        lines[i].trim().startsWith("*")
      ) {
        continue;
      }
      if (target.path.includes("test/fixtures") || target.path.includes("__fixtures__")) {
        continue;
      }

      const matches = lines[i].matchAll(secretPattern);
      for (const match of matches) {
        // Skip example/placeholder values
        const value = match[0];
        if (
          value.includes("YOUR_") ||
          value.includes("xxx") ||
          value.includes("CHANGE_ME") ||
          value.includes("<your")
        ) {
          continue;
        }
        findings.push({
          name: "hardcoded_secret",
          passed: false,
          detail: `${relativePath}:${i + 1}: potential hardcoded secret`,
          severity: "error",
        });
      }
    }
  }

  return findings;
}

function scanForUnauthorizedEgress(targets: ScanTarget[]): EgressCheck[] {
  const findings: EgressCheck[] = [];
  const urlPattern = /https?:\/\/([a-z0-9.-]+)/gi;

  for (const target of targets) {
    const relativePath = target.path.replace(REPO_ROOT + "/", "");
    const lines = target.content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      // Skip comments, docs, and test fixtures
      if (
        lines[i].trim().startsWith("//") ||
        lines[i].trim().startsWith("#") ||
        lines[i].trim().startsWith("*")
      ) {
        continue;
      }
      if (target.path.includes("test/fixtures") || target.path.includes("__fixtures__")) {
        continue;
      }

      const matches = lines[i].matchAll(urlPattern);
      for (const match of matches) {
        const host = match[1];
        if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) {
          continue;
        }
        if (ALLOWED_EGRESS.has(host)) {
          continue;
        }
        // Skip common patterns in docs/examples
        if (target.path.endsWith(".md") || target.path.endsWith(".rst")) {
          continue;
        }
        findings.push({
          name: "unauthorized_egress",
          passed: false,
          detail: `${relativePath}:${i + 1}: outbound URL to ${host}`,
          severity: "warning",
        });
      }
    }
  }

  return findings;
}

function scanNetworkPolicies(): EgressCheck {
  const policyPath = join(REPO_ROOT, "nemoclaw-blueprint/policies/openclaw-sandbox.yaml");
  if (!existsSync(policyPath)) {
    return {
      name: "network_policy",
      passed: false,
      detail: "Network policy file not found",
      severity: "warning",
    };
  }

  const content = readFileSync(policyPath, "utf-8");
  const relativePath = policyPath.replace(REPO_ROOT + "/", "");

  // Check for overly permissive policies
  if (content.includes("host: '*'") || content.includes('host: "*"')) {
    return {
      name: "network_policy",
      passed: false,
      detail: `${relativePath}: contains wildcard host — overly permissive`,
      severity: "error",
    };
  }

  if (content.includes("0.0.0.0/0") || content.includes("::/0")) {
    return {
      name: "network_policy",
      passed: false,
      detail: `${relativePath}: contains CIDR 0.0.0.0/0 or ::/0 — overly permissive`,
      severity: "error",
    };
  }

  return {
    name: "network_policy",
    passed: true,
    detail: `${relativePath}: no overly permissive rules`,
    severity: "warning",
  };
}

function main(): EgressResult {
  const strictMode = process.argv.includes("--strict");

  console.log("=== Data-Flow Egress Audit ===\n");

  // Scan source files
  const sourceTargets = walkDir(join(REPO_ROOT, "src"), [".ts", ".js"]);
  const binTargets = walkDir(join(REPO_ROOT, "bin"), [".ts", ".js"]);
  const scriptTargets = walkDir(join(REPO_ROOT, "scripts"), [".ts", ".js"]);
  const allTargets = [...sourceTargets, ...binTargets, ...scriptTargets];

  console.log(`Scanning ${allTargets.length} source file(s)...`);

  const checks: EgressCheck[] = [];

  // 1. Hardcoded secrets
  const secretFindings = scanForHardcodedSecrets(allTargets);
  if (secretFindings.length === 0) {
    checks.push({
      name: "hardcoded_secrets",
      passed: true,
      detail: "No hardcoded secrets found",
      severity: "error",
    });
  } else {
    checks.push(...secretFindings);
  }

  // 2. Unauthorized egress URLs
  const egressFindings = scanForUnauthorizedEgress(allTargets);
  if (egressFindings.length === 0) {
    checks.push({
      name: "unauthorized_egress",
      passed: true,
      detail: "No unauthorized egress URLs",
      severity: "warning",
    });
  } else {
    checks.push(...egressFindings);
  }

  // 3. Network policy check
  checks.push(scanNetworkPolicies());

  // Print results
  const errors = checks.filter((c) => !c.passed && c.severity === "error");
  const warnings = checks.filter((c) => !c.passed && c.severity === "warning");
  const passed = checks.filter((c) => c.passed);

  for (const check of checks) {
    const status = check.passed ? "PASS" : check.severity === "error" ? "FAIL" : "WARN";
    console.log(`${status} ${check.name}: ${check.detail}`);
  }

  const shouldFail = errors.length > 0 || (strictMode && warnings.length > 0);
  const summary = `Egress audit: ${errors.length === 0 && (!strictMode || warnings.length === 0) ? "PASS" : "FAIL"} (${passed.length} pass, ${warnings.length} warn, ${errors.length} error)`;
  console.log(`\n${summary}`);

  return {
    passed: !shouldFail,
    checks,
    errors,
    warnings,
  };
}

export {
  scanForHardcodedSecrets,
  scanForUnauthorizedEgress,
  scanNetworkPolicies,
  walkDir,
  ALLOWED_EGRESS,
};
export type { EgressCheck, EgressResult, ScanTarget };

if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("verify-export.ts")
) {
  const result = main();
  process.exitCode = result.passed ? 0 : 1;
}
