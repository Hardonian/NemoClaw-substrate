// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ALLOWED_LABELS = [
  "implemented",
  "implemented-in-process",
  "opt-in",
  "fixture-backed",
  "structural",
  "scaffolded",
  "partial",
  "deferred",
  "planned",
  "not-implemented",
  "stable",
  "beta",
  "alpha",
  "experimental",
  "deprecated",
  "demo",
];

const SKIPPED_DIRS = new Set(["node_modules", ".git", "dist", "_build"]);
const STATUS_MATRIX_MARKER = /<!--\s*status-matrix(?::|\s)/i;

function parseTableCells(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return null;
  return trimmed
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
}

function isSeparatorRow(cells) {
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function normalizeStatusLabel(value) {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/`/g, "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");
}

function hasStatusMatrixMarker(lines, headerIndex) {
  const nearbyLines = lines.slice(Math.max(0, headerIndex - 3), headerIndex);
  return nearbyLines.some((line) => STATUS_MATRIX_MARKER.test(line));
}

async function checkStatusMatrix(dir) {
  let issues = 0;
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const res = path.resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIPPED_DIRS.has(entry.name)) continue;
      issues += await checkStatusMatrix(res);
    } else if (entry.name.endsWith('.md')) {
      const content = await fs.readFile(res, 'utf8');
      const lines = content.split('\n');
      let activeStatusColumnIndex = -1;
      let tableIsMarkedStatusMatrix = false;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const cells = parseTableCells(line);
        if (!cells) {
          activeStatusColumnIndex = -1;
          tableIsMarkedStatusMatrix = false;
          continue;
        }

        if (isSeparatorRow(cells)) continue;

        const statusHeaderIndex = cells.findIndex((cell) => cell.toLowerCase() === "status");
        if (statusHeaderIndex !== -1) {
          tableIsMarkedStatusMatrix = hasStatusMatrixMarker(lines, i);
          activeStatusColumnIndex = tableIsMarkedStatusMatrix ? statusHeaderIndex : -1;
          continue;
        }

        if (tableIsMarkedStatusMatrix && activeStatusColumnIndex !== -1) {
          const foundLabel = normalizeStatusLabel(cells[activeStatusColumnIndex] ?? "");
          if (foundLabel && !ALLOWED_LABELS.includes(foundLabel)) {
            console.error(
              `[check-status-matrix] FAIL: Invalid status label in ${res} at line ${i + 1}: ${foundLabel}`,
            );
            issues++;
          }
        } else {
          activeStatusColumnIndex = -1;
        }
      }
    }
  }
  return issues;
}

if (process.argv[1] && (path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))) {
  const docsDir = path.resolve(process.argv[2] || './docs');
  checkStatusMatrix(docsDir).then(issues => {
    if (issues > 0) process.exit(1);
    console.log('[check-status-matrix] All checks passed.');
  }).catch((error) => {
    console.error(`[check-status-matrix] ERROR: ${error.message}`);
    process.exit(1);
  });
}
export { checkStatusMatrix, ALLOWED_LABELS };
