// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

const fs = require("fs");
const path = require("path");

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith(".md")) {
      results.push(file);
    }
  });
  return results;
}

const files = walk("docs");
const excludes = [
  "docs\\architecture\\governance-glossary.md",
  "docs/architecture/governance-glossary.md",
  "docs\\architecture\\canonical-terminology-index.md",
  "docs/architecture/canonical-terminology-index.md",
  "docs\\architecture\\security-threat-model.md",
  "docs/architecture/security-threat-model.md", // wait, let's fix it manually there to not mess up shell fallback if needed
];

files.forEach((file) => {
  if (excludes.some((e) => file.includes(e))) {
    console.log(`Skipping excluded file: ${file}`);
    return;
  }

  let content = fs.readFileSync(file, "utf8");
  let changed = false;

  const replacePatterns = [
    { from: /\bhidden fallbacks\b/gi, to: "hidden degraded states" },
    { from: /\bHidden fallbacks\b/gi, to: "Hidden degraded states" },
    { from: /\bhidden fallback\b/gi, to: "hidden degraded state" },
    { from: /\bHidden fallback\b/gi, to: "Hidden degraded state" },
    { from: /\bfallbacks\b/gi, to: "degraded states" },
    { from: /\bFallbacks\b/gi, to: "Degraded States" },
    { from: /\bfallback\b/g, to: "degraded state" },
    { from: /\bFallback\b/g, to: "Degraded State" },
    { from: /\bFALLBACK\b/g, to: "DEGRADED_STATE" },
  ];

  replacePatterns.forEach(({ from, to }) => {
    if (from.test(content)) {
      content = content.replace(from, to);
      changed = true;
    }
  });

  if (changed) {
    fs.writeFileSync(file, content, "utf8");
    console.log(`Updated: ${file}`);
  }
});
