// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

const fs = require("node:fs");

const content = fs.readFileSync("CHANGELOG.md", "utf8");

function count(pattern) {
  return (content.match(pattern) || []).length;
}

const bullets = content
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line.startsWith("- ") && line.length > 2);

const dupeBullets = [...new Set(bullets.filter((line, index) => bullets.indexOf(line) !== index))];
const problems = [];
if (count(/SPDX-FileCopyrightText/g) !== 1) problems.push("duplicate SPDX-FileCopyrightText header");
if (count(/SPDX-License-Identifier/g) !== 1) problems.push("duplicate SPDX-License-Identifier header");
const titleCount = content.split(/\r?\n/).filter((line) => line.trim() === "# Changelog").length;
if (titleCount !== 1) problems.push("duplicate # Changelog title");
if (dupeBullets.length) problems.push(`duplicate changelog bullets: ${dupeBullets.join(" | ")}`);

if (problems.length) {
  console.error(`CHANGELOG hygiene failed:\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log("CHANGELOG hygiene OK");
