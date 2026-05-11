#!/usr/bin/env -S npx tsx
// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
//
// Validates release manifest integrity, artifact hashes, and compatibility matrix.
//
// Usage:
//   npx tsx scripts/verify-release.ts
//   npx tsx scripts/verify-release.ts --manifest <path>
//   npx tsx scripts/verify-release.ts --strict

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

type CheckResult = { name: string; passed: boolean; detail: string };

type ReleaseResult = {
  passed: boolean;
  checks: CheckResult[];
};

type CompatibilityEntry = {
  agent?: string;
  provider?: string;
  minVersion?: string;
  maxVersion?: string;
  notes?: string;
};

type ManifestSchema = {
  version?: string;
  artifacts?: Record<string, { hash?: string; path?: string }>;
  compatibility?: Record<string, CompatibilityEntry[]>;
  signatures?: Record<string, string>;
  publishedAt?: string;
};

function loadJSON<T>(repoRelative: string): T | null {
  const abs = join(REPO_ROOT, repoRelative);
  if (!existsSync(abs)) return null;
  return JSON.parse(readFileSync(abs, "utf-8")) as T;
}

function hashFile(filePath: string, algorithm = "sha256"): string {
  const data = readFileSync(filePath);
  return createHash(algorithm).update(data).digest("hex");
}

function checkManifestExists(): CheckResult {
  const candidates = ["release/manifest.json", "dist/manifest.json", "manifest.json"];
  for (const candidate of candidates) {
    if (existsSync(join(REPO_ROOT, candidate))) {
      return { name: "manifest_exists", passed: true, detail: `Found at ${candidate}` };
    }
  }
  return { name: "manifest_exists", passed: false, detail: "No manifest.json found in release/, dist/, or root" };
}

function loadManifest(): ManifestSchema | null {
  const candidates = ["release/manifest.json", "dist/manifest.json", "manifest.json"];
  for (const candidate of candidates) {
    const path = join(REPO_ROOT, candidate);
    if (existsSync(path)) {
      return loadJSON<ManifestSchema>(candidate);
    }
  }
  return null;
}

function checkArtifactHashes(manifest: ManifestSchema): CheckResult[] {
  const results: CheckResult[] = [];
  const artifacts = manifest.artifacts;
  if (!artifacts || Object.keys(artifacts).length === 0) {
    results.push({ name: "artifact_hashes", passed: true, detail: "No artifacts to validate" });
    return results;
  }

  for (const [name, artifact] of Object.entries(artifacts)) {
    if (!artifact.path) {
      results.push({ name: `artifact_hash_${name}`, passed: false, detail: `Missing path for ${name}` });
      continue;
    }
    const absPath = join(REPO_ROOT, artifact.path);
    if (!existsSync(absPath)) {
      results.push({ name: `artifact_hash_${name}`, passed: false, detail: `File not found: ${artifact.path}` });
      continue;
    }
    const actualHash = hashFile(absPath);
    if (artifact.hash && actualHash !== artifact.hash) {
      results.push({
        name: `artifact_hash_${name}`,
        passed: false,
        detail: `Hash mismatch for ${artifact.path}: expected ${artifact.hash}, got ${actualHash}`,
      });
    } else {
      results.push({ name: `artifact_hash_${name}`, passed: true, detail: `${artifact.path} hash verified` });
    }
  }
  return results;
}

function checkCompatibilityMatrix(manifest: ManifestSchema): CheckResult {
  const compat = manifest.compatibility;
  if (!compat || Object.keys(compat).length === 0) {
    return { name: "compatibility_matrix", passed: true, detail: "No compatibility matrix in manifest" };
  }

  const errors: string[] = [];
  for (const [category, entries] of Object.entries(compat)) {
    if (!Array.isArray(entries)) {
      errors.push(`${category}: entries must be an array`);
      continue;
    }
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry.agent && !entry.provider) {
        errors.push(`${category}[${i}]: must specify agent or provider`);
      }
    }
  }

  if (errors.length > 0) {
    return { name: "compatibility_matrix", passed: false, detail: errors.join("; ") };
  }
  return { name: "compatibility_matrix", passed: true, detail: `${Object.keys(compat).length} categories valid` };
}

function checkPackageVersion(manifest: ManifestSchema): CheckResult {
  const pkgPath = "package.json";
  const pkg = loadJSON<{ version?: string }>(pkgPath);
  if (!pkg?.version) {
    return { name: "package_version", passed: false, detail: "Cannot read version from package.json" };
  }
  if (manifest.version && manifest.version !== pkg.version) {
    return {
      name: "package_version",
      passed: false,
      detail: `Manifest version ${manifest.version} != package.json ${pkg.version}`,
    };
  }
  return { name: "package_version", passed: true, detail: `Version ${pkg.version} consistent` };
}

function checkBlueprintVersion(manifest: ManifestSchema): CheckResult {
  const blueprintPath = join(REPO_ROOT, "nemoclaw-blueprint/blueprint.yaml");
  if (!existsSync(blueprintPath)) {
    return { name: "blueprint_version", passed: true, detail: "Blueprint YAML not found — skipping" };
  }
  const blueprint = YAML.parse(readFileSync(blueprintPath, "utf-8")) as { version?: string };
  if (manifest.version && blueprint.version && manifest.version !== blueprint.version) {
    return {
      name: "blueprint_version",
      passed: false,
      detail: `Manifest version ${manifest.version} != blueprint ${blueprint.version}`,
    };
  }
  return { name: "blueprint_version", passed: true, detail: `Blueprint version ${blueprint.version ?? "unknown"} consistent` };
}

async function main(): Promise<ReleaseResult> {
  const strictMode = process.argv.includes("--strict");
  const checks: CheckResult[] = [];

  // 1. Check manifest exists
  const manifestCheck = checkManifestExists();
  checks.push(manifestCheck);
  if (!manifestCheck.passed && !strictMode) {
    // In relaxed mode, just warn if no manifest
    console.log(`WARN ${manifestCheck.detail}`);
    return { passed: true, checks };
  }

  const manifest = loadManifest();
  if (!manifest) {
    checks.push({ name: "manifest_load", passed: false, detail: "Could not load manifest" });
    console.log("FAIL Could not load manifest");
    return { passed: false, checks };
  }

  // 2. Check version consistency
  checks.push(checkPackageVersion(manifest));
  checks.push(checkBlueprintVersion(manifest));

  // 3. Check artifact hashes
  checks.push(...checkArtifactHashes(manifest));

  // 4. Check compatibility matrix
  checks.push(checkCompatibilityMatrix(manifest));

  // Print results
  const failures = checks.filter((c) => !c.passed);
  for (const check of checks) {
    const status = check.passed ? "PASS" : "FAIL";
    console.log(`${status} ${check.name}: ${check.detail}`);
  }

  const summary = `Summary: PASS=${checks.length - failures.length} FAIL=${failures.length}`;
  console.log(summary);

  return { passed: failures.length === 0, checks };
}

// Export for unit tests.
export { checkManifestExists, checkArtifactHashes, checkCompatibilityMatrix, checkPackageVersion, loadManifest, hashFile };

// Only run main when invoked directly.
if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("verify-release.ts")
) {
  main().then((result) => {
    process.exitCode = result.passed ? 0 : 1;
  });
}
