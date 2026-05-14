// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const THEATRE_TERMS = [
  { regex: /\bmilitary-grade\b/gi, label: "military-grade" },
  { regex: /\bbank-level\b/gi, label: "bank-level" },
  { regex: /\bairtight\b/gi, label: "airtight" },
  { regex: /\bself-healing\b/gi, label: "self-healing" },
  { regex: /\bauto-orchestrates\b/gi, label: "auto-orchestrates" },
  { regex: /\bautomatically heals\b/gi, label: "automatically heals" },
  { regex: /\bAI magic\b/gi, label: "AI magic" },
  { regex: /\benterprise[- ]grade\b/gi, label: "enterprise-grade" },
  { regex: /\bworld[- ]class\b/gi, label: "world-class" },
  { regex: /\bseamlessly\b/gi, label: "seamlessly" },
  { regex: /\bintelligently\b/gi, label: "intelligently" },
];

const DEFAULT_TARGETS = ["README.md", "CHANGELOG.md", "docs"];
const SKIPPED_DIRS = new Set(["node_modules", ".git", "dist", "_build"]);
const PERMITTED_DISCUSSION_CONTEXT =
  /\b(avoid|avoids|replace|replaces|replaced|reject|rejects|rejected|do not use|forbidden|non-goal|non-claim|not implemented|intentionally not|what not to claim)\b/i;

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

async function checkNoTheatre(targets = DEFAULT_TARGETS) {
  let issues = 0;
  const targetList = Array.isArray(targets) ? targets : [targets];

  for (const target of targetList) {
    for await (const res of markdownFiles(target)) {
      const content = await fs.readFile(res, "utf8");
      const lines = content.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (PERMITTED_DISCUSSION_CONTEXT.test(line)) continue;
        for (const { regex, label } of THEATRE_TERMS) {
          regex.lastIndex = 0;
          const matches = [...line.matchAll(regex)];
          if (matches.length === 0) continue;
          console.error(
            `[check-no-theatre] FAIL: theatre wording in ${res} at line ${i + 1}: ${label}`,
          );
          issues++;
        }
      }
    }
  }
  return issues;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const targets = process.argv.slice(2);
  checkNoTheatre(targets.length > 0 ? targets : DEFAULT_TARGETS)
    .then((issues) => {
      if (issues > 0) process.exit(1);
      console.log("[check-no-theatre] Security theatre check complete.");
    })
    .catch((error) => {
      console.error(`[check-no-theatre] ERROR: ${error.message}`);
      process.exit(1);
    });
}

export { checkNoTheatre, THEATRE_TERMS };
