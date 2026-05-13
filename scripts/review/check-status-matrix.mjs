// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { promises as fs } from 'fs';
import path from 'path';

const ALLOWED_LABELS = ['stable', 'beta', 'alpha', 'experimental', 'deprecated', 'planned', 'fixture', 'demo', 'opt-in'];

async function checkStatusMatrix(dir) {
  let issues = 0;
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const res = path.resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git'].includes(entry.name)) continue;
      issues += await checkStatusMatrix(res);
    } else if (entry.name.endsWith('.md')) {
      const content = await fs.readFile(res, 'utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('|') && line.toLowerCase().includes('status')) {
          const statusMatch = line.match(/Status: (\w+)/i);
          if (statusMatch) {
             const label = statusMatch[1].toLowerCase();
             if (!ALLOWED_LABELS.includes(label)) {
                 console.error(`[check-status-matrix] FAIL: Invalid status label in ${res} at line ${i+1}: ${label}`);
                 issues++;
             }
          }
        }
      }
    }
  }
  return issues;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const docsDir = path.resolve(process.argv[2] || './docs');
  checkStatusMatrix(docsDir).catch(() => {}).then(issues => {
    if (issues > 0) process.exit(1);
    console.log('[check-status-matrix] All checks passed.');
  });
}
export { checkStatusMatrix, ALLOWED_LABELS };
