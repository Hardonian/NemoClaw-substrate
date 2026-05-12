#!/usr/bin/env -S npx tsx
// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
//
// Wrapper for docs:strict enforcement with additional checks.
// Runs `npm run docs:strict` and validates docs output integrity.
//
// Usage:
//   npx tsx scripts/verify-docs-strict.ts
//   npx tsx scripts/verify-docs-strict.ts --skip-build

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

type DocsCheck = { name: string; passed: boolean; detail: string };

type DocsResult = {
  passed: boolean;
  checks: DocsCheck[];
};

function runDocsStrict(): { status: number | null; stdout: string; stderr: string } {
  try {
    const output = execFileSync("npm", ["run", "docs:strict"], {
      cwd: REPO_ROOT,
      encoding: "utf-8",
      stdio: ["inherit", "pipe", "pipe"],
      timeout: 300_000,
    });
    return { status: 0, stdout: output, stderr: "" };
  } catch (error) {
    const errorObj = typeof error === "object" && error !== null ? error : {};
    const stdout =
      typeof (errorObj as { stdout?: string }).stdout === "string"
        ? (errorObj as { stdout: string }).stdout
        : "";
    const stderr =
      typeof (errorObj as { stderr?: string }).stderr === "string"
        ? (errorObj as { stderr: string }).stderr
        : "";
    const status =
      typeof (errorObj as { status?: number }).status === "number"
        ? (errorObj as { status: number }).status
        : 1;
    return { status, stdout, stderr };
  }
}

function checkDocsBuildResult(result: {
  status: number | null;
  stdout: string;
  stderr: string;
}): DocsCheck {
  if (result.status === 0) {
    return { name: "docs_build", passed: true, detail: "Sphinx build completed with no warnings" };
  }
  const output = `${result.stdout}\n${result.stderr}`.trim();
  const lastLines = output.split("\n").slice(-5).join("\n");
  return {
    name: "docs_build",
    passed: false,
    detail: `Sphinx build failed (exit ${result.status}):\n${lastLines}`,
  };
}

function checkDocsOutputExists(): DocsCheck {
  const buildDir = join(REPO_ROOT, "docs/_build/html");
  if (!existsSync(buildDir)) {
    return { name: "docs_output", passed: false, detail: `Build output not found: ${buildDir}` };
  }

  const indexHtml = join(buildDir, "index.html");
  if (!existsSync(indexHtml)) {
    return { name: "docs_output", passed: false, detail: `index.html missing from ${buildDir}` };
  }

  const files = readdirSync(buildDir).filter((f) => f.endsWith(".html"));
  return { name: "docs_output", passed: true, detail: `${files.length} HTML file(s) generated` };
}

function checkBrokenLinks(): DocsCheck {
  const buildDir = join(REPO_ROOT, "docs/_build/html");
  if (!existsSync(buildDir)) {
    return { name: "broken_links", passed: true, detail: "No build output to check — skipping" };
  }

  const indexHtml = join(buildDir, "index.html");
  if (!existsSync(indexHtml)) {
    return { name: "broken_links", passed: true, detail: "No index.html to check — skipping" };
  }

  const content = readFileSync(indexHtml, "utf-8");

  // Check for Sphinx's "broken internal link" markers
  if (content.includes("reference not found") || content.includes("undefined label")) {
    return {
      name: "broken_links",
      passed: false,
      detail: "Found broken internal link markers in index.html",
    };
  }

  return { name: "broken_links", passed: true, detail: "No broken link markers found" };
}

function checkDocsFrontmatter(): DocsCheck {
  const docsDir = join(REPO_ROOT, "docs");
  if (!existsSync(docsDir)) {
    return {
      name: "docs_frontmatter",
      passed: true,
      detail: "Docs directory not found — skipping",
    };
  }

  const mdFiles: string[] = [];
  function walk(dir: string) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== "_build" && entry.name !== ".git") {
        walk(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith(".md") || entry.name.endsWith(".rst"))) {
        mdFiles.push(fullPath);
      }
    }
  }
  walk(docsDir);

  const missingFrontmatter: string[] = [];
  for (const file of mdFiles) {
    const content = readFileSync(file, "utf-8");
    // Check for MyST frontmatter (--- at start)
    if (!content.startsWith("---")) {
      const relativePath = file.replace(REPO_ROOT + "/", "");
      missingFrontmatter.push(relativePath);
    }
  }

  if (missingFrontmatter.length > 0) {
    return {
      name: "docs_frontmatter",
      passed: false,
      detail: `${missingFrontmatter.length} file(s) missing frontmatter: ${missingFrontmatter.slice(0, 3).join(", ")}${missingFrontmatter.length > 3 ? "..." : ""}`,
    };
  }
  return {
    name: "docs_frontmatter",
    passed: true,
    detail: `All ${mdFiles.length} doc files have frontmatter`,
  };
}

function checkSpdxHeaders(): DocsCheck {
  const docsDir = join(REPO_ROOT, "docs");
  if (!existsSync(docsDir)) {
    return { name: "docs_spdx", passed: true, detail: "Docs directory not found — skipping" };
  }

  const mdFiles: string[] = [];
  function walk(dir: string) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== "_build" && entry.name !== ".git") {
        walk(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith(".md") || entry.name.endsWith(".rst"))) {
        mdFiles.push(fullPath);
      }
    }
  }
  walk(docsDir);

  const missingSpdx: string[] = [];
  for (const file of mdFiles) {
    const content = readFileSync(file, "utf-8");
    if (
      !content.includes("SPDX-License-Identifier") &&
      !content.includes("SPDX-FileCopyrightText")
    ) {
      const relativePath = file.replace(REPO_ROOT + "/", "");
      missingSpdx.push(relativePath);
    }
  }

  if (missingSpdx.length > 0) {
    return {
      name: "docs_spdx",
      passed: false,
      detail: `${missingSpdx.length} file(s) missing SPDX header: ${missingSpdx.slice(0, 3).join(", ")}${missingSpdx.length > 3 ? "..." : ""}`,
    };
  }
  return {
    name: "docs_spdx",
    passed: true,
    detail: `All ${mdFiles.length} doc files have SPDX headers`,
  };
}

function main(): DocsResult {
  const skipBuild = process.argv.includes("--skip-build");

  console.log("=== Docs Strict Verification ===\n");

  const checks: DocsCheck[] = [];

  if (!skipBuild) {
    // 1. Run docs:strict
    console.log("Running docs:strict...");
    const buildResult = runDocsStrict();
    checks.push(checkDocsBuildResult(buildResult));

    if (!buildResult.stdout && !buildResult.stderr && buildResult.status !== 0) {
      console.error("FAIL: docs:strict could not run (uv/sphinx not available)");
      console.error("Install uv and Sphinx dependencies: pip install uv && uv sync --group docs");
    }
  } else {
    console.log("Skipping docs build (--skip-build)");
    checks.push({ name: "docs_build", passed: true, detail: "Skipped (--skip-build)" });
  }

  // 2. Check output exists
  checks.push(checkDocsOutputExists());

  // 3. Check broken links
  checks.push(checkBrokenLinks());

  // 4. Check frontmatter
  checks.push(checkDocsFrontmatter());

  // 5. Check SPDX headers
  checks.push(checkSpdxHeaders());

  // Print results
  const failures = checks.filter((c) => !c.passed);
  for (const check of checks) {
    const status = check.passed ? "PASS" : "FAIL";
    console.log(`${status} ${check.name}: ${check.detail}`);
  }

  const summary = `Docs verification: ${failures.length === 0 ? "PASS" : "FAIL"} (${checks.length - failures.length}/${checks.length} checks passed)`;
  console.log(`\n${summary}`);

  return { passed: failures.length === 0, checks };
}

export {
  runDocsStrict,
  checkDocsBuildResult,
  checkDocsOutputExists,
  checkBrokenLinks,
  checkDocsFrontmatter,
  checkSpdxHeaders,
};
export type { DocsCheck, DocsResult };

if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("verify-docs-strict.ts")
) {
  const result = main();
  process.exitCode = result.passed ? 0 : 1;
}
