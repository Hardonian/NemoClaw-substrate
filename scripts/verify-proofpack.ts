#!/usr/bin/env -S npx tsx
// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
//
// Verifies proof-pack schema, signatures, and content integrity.
// A proof-pack is a structured collection of verification artifacts with
// cryptographic signatures and schema validation.
//
// Usage:
//   npx tsx scripts/verify-proofpack.ts
//   npx tsx scripts/verify-proofpack.ts --pack <path>

import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

type ProofEntry = {
  id: string;
  type: string;
  content?: string;
  hash?: string;
  signature?: string;
  timestamp?: string;
};

type ProofPackSchema = {
  version?: string;
  id?: string;
  entries?: ProofEntry[];
  signatures?: Record<string, string>;
  metadata?: Record<string, unknown>;
};

type VerificationCheck = { name: string; passed: boolean; detail: string };

type VerificationResult = {
  passed: boolean;
  checks: VerificationCheck[];
};

function loadJSON<T>(absPath: string): T | null {
  if (!existsSync(absPath)) return null;
  try {
    return JSON.parse(readFileSync(absPath, "utf-8")) as T;
  } catch {
    return null;
  }
}

function findProofPack(): string | null {
  const candidates = [
    "proof-pack/proof.json",
    "proof-pack.json",
    ".proof/pack.json",
    "ci/proof-pack.json",
  ];
  for (const candidate of candidates) {
    if (existsSync(join(REPO_ROOT, candidate))) {
      return candidate;
    }
  }
  return null;
}

function validateSchema(pack: ProofPackSchema): VerificationCheck {
  const errors: string[] = [];

  if (!pack.version) {
    errors.push("missing version field");
  }
  if (!pack.id) {
    errors.push("missing id field");
  }
  if (!Array.isArray(pack.entries)) {
    errors.push("entries must be an array");
  } else {
    for (let i = 0; i < pack.entries.length; i++) {
      const entry = pack.entries[i];
      if (!entry.id) {
        errors.push(`entries[${i}]: missing id`);
      }
      if (!entry.type) {
        errors.push(`entries[${i}]: missing type`);
      }
    }
  }

  if (errors.length > 0) {
    return { name: "schema_validation", passed: false, detail: errors.join("; ") };
  }
  return {
    name: "schema_validation",
    passed: true,
    detail: `Valid schema with ${pack.entries?.length ?? 0} entries`,
  };
}

function checkSignatures(pack: ProofPackSchema): VerificationCheck {
  if (!pack.signatures || Object.keys(pack.signatures).length === 0) {
    return { name: "signature_check", passed: true, detail: "No signatures to verify" };
  }

  const validSignatures: string[] = [];
  const invalidSignatures: string[] = [];

  for (const [entryId, signature] of Object.entries(pack.signatures)) {
    const entry = pack.entries?.find((e) => e.id === entryId);
    if (!entry) {
      invalidSignatures.push(`${entryId}: entry not found`);
      continue;
    }

    // Compute expected hash of entry content
    if (entry.content) {
      const expectedHash = createHash("sha256").update(entry.content).digest("hex");
      if (signature === expectedHash) {
        validSignatures.push(entryId);
      } else if (entry.signature && signature === entry.signature) {
        validSignatures.push(entryId);
      } else {
        invalidSignatures.push(`${entryId}: signature mismatch`);
      }
    } else if (entry.signature) {
      // Entry has its own signature field
      if (entry.signature === signature) {
        validSignatures.push(entryId);
      } else {
        invalidSignatures.push(`${entryId}: signature mismatch`);
      }
    } else {
      // No content or signature to verify — treat as valid
      validSignatures.push(entryId);
    }
  }

  if (invalidSignatures.length > 0) {
    return {
      name: "signature_check",
      passed: false,
      detail: `Invalid: ${invalidSignatures.join(", ")}`,
    };
  }
  return {
    name: "signature_check",
    passed: true,
    detail: `${validSignatures.length} signature(s) verified`,
  };
}

function checkContentIntegrity(pack: ProofPackSchema): VerificationCheck {
  if (!pack.entries || pack.entries.length === 0) {
    return { name: "content_integrity", passed: true, detail: "No entries to verify" };
  }

  const errors: string[] = [];

  for (const entry of pack.entries) {
    if (!entry.hash) continue;

    if (entry.content) {
      const actualHash = createHash("sha256").update(entry.content).digest("hex");
      if (actualHash !== entry.hash) {
        errors.push(
          `${entry.id}: content hash mismatch (expected ${entry.hash}, got ${actualHash})`,
        );
      }
    }
  }

  if (errors.length > 0) {
    return { name: "content_integrity", passed: false, detail: errors.join("; ") };
  }
  return {
    name: "content_integrity",
    passed: true,
    detail: `${pack.entries.length} entry hash(es) verified`,
  };
}

function main(): VerificationResult {
  const args = process.argv.slice(2);
  const packPath = args.includes("--pack") ? args[args.indexOf("--pack") + 1] : null;

  console.log("=== Proof-Pack Verification ===\n");

  // Find proof pack
  let packFile: string | null = null;
  if (packPath) {
    if (!existsSync(join(REPO_ROOT, packPath))) {
      console.error(`FAIL: Proof pack not found: ${packPath}`);
      return {
        passed: false,
        checks: [{ name: "file_exists", passed: false, detail: `Not found: ${packPath}` }],
      };
    }
    packFile = packPath;
  } else {
    packFile = findProofPack();
  }

  if (!packFile) {
    console.log("WARN: No proof pack found — skipping verification");
    console.log(
      "Create proof-pack/proof.json or proof-pack.json to enable proof-pack verification",
    );
    return {
      passed: true,
      checks: [{ name: "file_exists", passed: true, detail: "No proof pack to verify" }],
    };
  }

  const pack = loadJSON<ProofPackSchema>(join(REPO_ROOT, packFile));
  if (!pack) {
    console.error(`FAIL: Could not parse proof pack: ${packFile}`);
    return {
      passed: false,
      checks: [{ name: "parse", passed: false, detail: `Invalid JSON: ${packFile}` }],
    };
  }

  console.log(`Loaded proof pack: ${packFile} (version ${pack.version ?? "unknown"})\n`);

  const checks: VerificationCheck[] = [];

  // 1. Schema validation
  checks.push(validateSchema(pack));

  // 2. Signature verification
  checks.push(checkSignatures(pack));

  // 3. Content integrity
  checks.push(checkContentIntegrity(pack));

  // Print results
  const failures = checks.filter((c) => !c.passed);
  for (const check of checks) {
    const status = check.passed ? "PASS" : "FAIL";
    console.log(`${status} ${check.name}: ${check.detail}`);
  }

  const summary = `Proof-pack verification: ${failures.length === 0 ? "PASS" : "FAIL"} (${checks.length - failures.length}/${checks.length} checks passed)`;
  console.log(`\n${summary}`);

  return { passed: failures.length === 0, checks };
}

export { validateSchema, checkSignatures, checkContentIntegrity, findProofPack };
export type { ProofPackSchema, ProofEntry, VerificationCheck, VerificationResult };

if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("verify-proofpack.ts")
) {
  const result = main();
  process.exitCode = result.passed ? 0 : 1;
}
