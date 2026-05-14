// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const UNSUPPORTED_CLAIMS = [
  { regex: /\b100%\b/g, label: "100%" },
  { regex: /\bfoolproof\b/gi, label: "foolproof" },
  { regex: /\bunhackable\b/gi, label: "unhackable" },
  { regex: /\bperfectly secure\b/gi, label: "perfectly secure" },
  { regex: /\benterprise[- ]grade\b/gi, label: "enterprise-grade" },
  { regex: /\bworld[- ]class\b/gi, label: "world-class" },
  { regex: /\bproduction[- ]ready\b/gi, label: "production-ready", allowNegated: true },
];

const DEFAULT_TARGETS = ["README.md", "CHANGELOG.md", "docs"];
const SKIPPED_DIRS = new Set(["node_modules", ".git", "dist", "_build"]);
const NEGATING_CONTEXT =
  /\b(no|not|never|without|avoid|avoids|forbid|forbidden|reject|rejects|rejected|non-goal|non-claim|does not claim|do not claim|intentionally not|what not to claim|not implemented)\b/i;

function hasNegatingContext(line) {
  return NEGATING_CONTEXT.test(line);
}

async function* markdownFiles(target) {
  const resolved = path.resolve(target);
  const stat = await fs.stat(resolved);
  if (stat.isDirectory()) {
    const entries = await fs.readdir(resolved, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && SKIPPED_DIRS.has(entry.name)) continue;
      yield* markdownFiles(path.join(resolved, entry.name));
    }
    return;
  }
  if (resolved.endsWith(".md")) yield resolved;
}

async function checkClaims(targets = DEFAULT_TARGETS) {
  let issues = 0;
  const targetList = Array.isArray(targets) ? targets : [targets];

  for (const target of targetList) {
    for await (const res of markdownFiles(target)) {
      const content = await fs.readFile(res, 'utf8');
      const lines = content.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const { regex, label, allowNegated } of UNSUPPORTED_CLAIMS) {
          regex.lastIndex = 0;
          if (allowNegated && hasNegatingContext(line)) continue;
          const matches = [...line.matchAll(regex)];
          if (matches.length === 0) continue;
          console.error(
            `[check-claims] FAIL: Unsupported claim found in ${res} at line ${i + 1}: ${label}`,
          );
          issues++;
        }
      }
    }
  }
  return issues;
}

if (process.argv[1] && (path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))) {
  const targets = process.argv.slice(2);
  checkClaims(targets.length > 0 ? targets : DEFAULT_TARGETS).then(issues => {
    if (issues > 0) process.exit(1);
    console.log('[check-claims] No forbidden claims found.');
  }).catch((error) => {
    console.error(`[check-claims] ERROR: ${error.message}`);
    process.exit(1);
  });
}
export { checkClaims, UNSUPPORTED_CLAIMS };
