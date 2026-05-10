// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

const fs = require("node:fs");

const content = fs.readFileSync("CHANGELOG.md", "utf8");

function count(pattern) {
  return (content.match(pattern) || []).length;
}

const lines = content.split(/\r?\n/);
const normalized = lines.map((line) => line.trim());
const duplicateAllowlist = new Set(["### Added", "### Changed", "### Fixed"]);

const duplicateLineMap = new Map();
for (const line of normalized) {
  if (!line) continue;
  if (duplicateAllowlist.has(line)) continue;
  duplicateLineMap.set(line, (duplicateLineMap.get(line) ?? 0) + 1);
}

const duplicateLines = [...duplicateLineMap.entries()]
  .filter(([, countForLine]) => countForLine > 1)
  .map(([line]) => line);

const problems = [];
if (count(/SPDX-FileCopyrightText/g) !== 1)
  problems.push("duplicate SPDX-FileCopyrightText header");
if (count(/SPDX-License-Identifier/g) !== 1)
  problems.push("duplicate SPDX-License-Identifier header");
const titleCount = normalized.filter((line) => line === "# Changelog").length;
if (titleCount !== 1) problems.push("duplicate # Changelog title");
const titleIndex = normalized.findIndex((line) => line === "# Changelog");
if (titleIndex >= 0) {
  const preTitleContent = normalized
    .slice(0, titleIndex)
    .filter(
      (line) =>
        line &&
        !line.startsWith("<!-- SPDX-FileCopyrightText:") &&
        !line.startsWith("<!-- SPDX-License-Identifier:"),
    );
  if (preTitleContent.length)
    problems.push(`non-SPDX content before # Changelog: ${preTitleContent.join(" | ")}`);
}
if (duplicateLines.length)
  problems.push(`duplicate non-empty lines: ${duplicateLines.join(" | ")}`);

if (problems.length) {
  console.error(`CHANGELOG hygiene failed:\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log("CHANGELOG hygiene OK");
