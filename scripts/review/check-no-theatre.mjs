// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { promises as fs } from 'fs';
import path from 'path';

const THEATRE_TERMS = [
  /\bmilitary-grade\b/gi,
  /\bbank-level\b/gi,
  /\bairtight\b/gi,
];

async function checkNoTheatre(dir) {
  let issues = 0;
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const res = path.resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git'].includes(entry.name)) continue;
      issues += await checkNoTheatre(res);
    } else if (entry.name.endsWith('.md')) {
      const content = await fs.readFile(res, 'utf8');
      for (const regex of THEATRE_TERMS) {
        const matches = [...content.matchAll(regex)];
        if (matches.length > 0) {
          console.error(`[check-no-theatre] FAIL: Security theatre term found in ${res}: ${matches.map(m => m[0]).join(', ')}`);
          issues++;
        }
      }
    }
  }
  return issues;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const docsDir = path.resolve(process.argv[2] || './docs');
  checkNoTheatre(docsDir).catch(() => {}).then(issues => {
    if (issues > 0) process.exit(1);
    console.log('[check-no-theatre] All checks passed.');
  });
}
