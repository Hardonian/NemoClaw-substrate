// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";

export interface DependencyIssue {
  name: string;
  issueType: "unpinned" | "outdated" | "vulnerable" | "excessive-transitive";
  severity: "low" | "medium" | "high";
  message: string;
}

export interface DependencyHygieneReport {
  issues: DependencyIssue[];
  summary: {
    total: number;
    high: number;
    medium: number;
    low: number;
  };
}

const MINOR_VERSION_PATTERN = /^\^/;
const MAJOR_WILDCARD_PATTERN = /^\*/;
const RANGE_PATTERN = /^[~<>=]/;

function isPinned(version: string): boolean {
  const trimmed = version.trim();
  if (!trimmed || trimmed === "*" || trimmed === "latest") return false;
  if (MAJOR_WILDCARD_PATTERN.test(trimmed)) return false;
  if (MINOR_VERSION_PATTERN.test(trimmed) || RANGE_PATTERN.test(trimmed)) return false;
  return /^\d+\.\d+\.\d+/.test(trimmed);
}

export function scanDependencyHygiene(rootDir: string = join(dirname(__dirname), "..", "..")): DependencyHygieneReport {
  const pkgPath = join(rootDir, "package.json");
  if (!existsSync(pkgPath)) {
    return { issues: [], summary: { total: 0, high: 0, medium: 0, low: 0 } };
  }

  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  const issues: DependencyIssue[] = [];

  const allDeps: [string, string, "dependencies" | "devDependencies"][] = [];
  if (pkg.dependencies) {
    for (const [name, version] of Object.entries(pkg.dependencies)) {
      allDeps.push([name, version, "dependencies"]);
    }
  }
  if (pkg.devDependencies) {
    for (const [name, version] of Object.entries(pkg.devDependencies)) {
      allDeps.push([name, version, "devDependencies"]);
    }
  }

  for (const [name, version, depType] of allDeps) {
    if (!isPinned(version)) {
      const severity = depType === "dependencies" ? "high" : "medium";
      issues.push({
        name,
        issueType: "unpinned",
        severity,
        message: `${name} uses "${version}" — should be pinned to an exact version for reproducible builds`,
      });
    }
  }

  const high = issues.filter((i) => i.severity === "high").length;
  const medium = issues.filter((i) => i.severity === "medium").length;
  const low = issues.filter((i) => i.severity === "low").length;

  return {
    issues,
    summary: { total: issues.length, high, medium, low },
  };
}

export function checkDependencyHygieneStrict(rootDir?: string): boolean {
  const report = scanDependencyHygiene(rootDir);
  return report.summary.high === 0;
}
