// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
        if (line.includes('|')) {
          const cells = line.split('|').map(c => c.trim()).filter(Boolean);
          for (const cell of cells) {
            const label = cell.toLowerCase();
            // Match "Status: label" or just "| label |" in a Status column
            const statusMatch = cell.match(/^Status:?\s*(\w+)$/i);
            const foundLabel = statusMatch ? statusMatch[1].toLowerCase() : label;
            
            // Handle markdown tables: check current cell, previous line, or line before that (for separators)
            const isStatusContext = statusMatch || 
              (i > 0 && lines[i-1].toLowerCase().includes('status')) ||
              (i > 1 && lines[i-1].match(/^[|\s-:]+$/) && lines[i-2].toLowerCase().includes('status'));

            if (isStatusContext) {
               if (foundLabel && !ALLOWED_LABELS.includes(foundLabel) && !foundLabel.match(/^[---]+$/) && !foundLabel.includes('status')) {
                 console.error(`[check-status-matrix] FAIL: Invalid status label in ${res} at line ${i + 1}: ${foundLabel}`);
                 issues++;
               }
            }
          }
        }
      }
    }
  }
  return issues;
}

if (process.argv[1] && (path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))) {
  const docsDir = path.resolve(process.argv[2] || './docs');
  checkStatusMatrix(docsDir).catch(() => {}).then(issues => {
    if (issues > 0) process.exit(1);
    console.log('[check-status-matrix] All checks passed.');
  });
}
export { checkStatusMatrix, ALLOWED_LABELS };
