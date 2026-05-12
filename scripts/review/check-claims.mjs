#!/usr/bin/env node
// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(fileURLToPath(new URL("..", import.meta.url)), "..");
const evidencePath = join(repoRoot, "docs/review/evidence-index.md");

function splitTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isEvidenceRow(line) {
  if (!line.startsWith("|")) return false;
  if (line.includes("---")) return false;
  if (line.includes("Claim | Implementation files")) return false;
  return true;
}

function cellHasReference(cell) {
  return /`[^`]+`/.test(cell);
}

const bannedClaimWords = [
  "production-grade",
  "production ready",
  "autonomous orchestration",
  "automatic recovery",
  "guaranteed secure",
];

if (!existsSync(evidencePath)) {
  console.error("FAIL evidence index missing: docs/review/evidence-index.md");
  process.exit(1);
}

const content = readFileSync(evidencePath, "utf8");
const rows = content
  .split(/\r?\n/)
  .filter(isEvidenceRow)
  .map(splitTableRow)
  .filter((row) => row.length > 1);

const problems = [];
if (rows.length === 0) {
  problems.push("evidence index has no claim rows");
}

for (const [index, row] of rows.entries()) {
  if (row.length !== 6) {
    problems.push(`row ${index + 1}: expected 6 columns, found ${row.length}`);
    continue;
  }

  const [claim, implementation, tests, docs, demo, limitation] = row;
  const lowerClaim = claim.toLowerCase();
  for (const banned of bannedClaimWords) {
    if (lowerClaim.includes(banned)) {
      problems.push(`row ${index + 1}: unsupported overclaim "${banned}"`);
    }
  }

  if (!cellHasReference(implementation)) {
    problems.push(`row ${index + 1}: missing implementation reference`);
  }
  if (!cellHasReference(tests)) {
    problems.push(`row ${index + 1}: missing test reference`);
  }
  if (!cellHasReference(docs)) {
    problems.push(`row ${index + 1}: missing docs reference`);
  }
  if (!cellHasReference(demo)) {
    problems.push(`row ${index + 1}: missing demo command`);
  }
  if (!limitation || /^n\/a$/i.test(limitation)) {
    problems.push(`row ${index + 1}: missing current limitation`);
  }
}

if (problems.length > 0) {
  console.error(`Claim review failed:\n- ${problems.join("\n- ")}`);
  process.exit(1);
}

console.log(`Claim review OK (${rows.length} claims with implementation, tests, docs, commands, and limitations)`);
