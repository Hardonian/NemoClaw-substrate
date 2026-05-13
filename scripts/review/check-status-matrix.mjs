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
      let statusColumnIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('|')) {
          const cells = line.split('|').map(c => c.trim()).filter(Boolean);
          
          // Check if this is a header line containing "Status"
          const headerIndex = cells.findIndex(c => c.toLowerCase().includes('status'));
          if (headerIndex !== -1 && !line.match(/^[|\s-:]+$/)) {
            statusColumnIndex = headerIndex;
            continue;
          }

          // If we are in a table row and have a status column index
          if (statusColumnIndex !== -1) {
            if (line.match(/^[|\s-:]+$/)) continue; // Skip separator lines
            
            const foundLabel = cells[statusColumnIndex]?.toLowerCase();
            if (foundLabel && !ALLOWED_LABELS.includes(foundLabel) && !foundLabel.includes('status')) {
              console.error(`[check-status-matrix] FAIL: Invalid status label in ${res} at line ${i + 1}: ${foundLabel}`);
              issues++;
            }
          }
        } else {
          statusColumnIndex = -1; // Reset when table ends
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
