#!/usr/bin/env node
// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(fileURLToPath(new URL("..", import.meta.url)), "..");

const requiredDocs = [
  "README.md",
  "docs/review/reviewer-path.md",
  "docs/review/10-minute-review.md",
  "docs/review/evidence-index.md",
  "docs/architecture/decision-map.md",
  "docs/architecture/tradeoffs.md",
  "docs/verification/how-to-verify.md",
  "docs/demo/local-proof.md",
  "docs/review/naming-audit.md",
];

const missing = requiredDocs.filter((path) => !existsSync(join(repoRoot, path)));
if (missing.length > 0) {
  console.error(`Review path check failed. Missing:\n- ${missing.join("\n- ")}`);
  process.exit(1);
}

console.log("Reviewer path:");
for (const path of requiredDocs) {
  console.log(`- ${path}`);
}

console.log("\nFast local proof:");
console.log("npm run build:cli");
console.log("node ./bin/nemoclaw.js operator status --json");
console.log("npm run verify:execution-lifecycle");
console.log("npm run verify:chaos");
console.log("npm run review:claims");
