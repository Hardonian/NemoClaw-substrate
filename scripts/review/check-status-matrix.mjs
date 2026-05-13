// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { promises as fs } from 'fs';
import path from 'path';

const ALLOWED_STATUS_LABELS = [
  'supported', 'experimental', 'deprecated', 'unsupported', 'planned', 'alpha', 'beta', 'stable',
  'accepted', 'accepted, opt-in scope', 'accepted, recommendation-only scope', 'accepted, structural scope',
  'implemented', 'opt-in implementation', 'opt-in guarded boundary', 'structural implementation',
  'fixture-backed implementation', 'deferred', 'not implemented by design', 'not implemented',
  'intentionally not implemented', 'implemented (in-process)', 'implemented (disabled by default)',
  'disabled by default (env flag)',
  'implemented for the local control-plane helpers and guarded adapters', 'implemented as in-process records',
  'implemented at adapter boundary', 'implemented in probe/registry handling',
  'implemented for policy evaluation and traces', 'implemented as proposal generation only',
  'valid', 'pending', 'unverified', 'expired', 'revoked', 'conflict_detected',
  'partial', 'tested', 'caveated', 'documented only', 'clean', 'reviewed',
  'co-located with source', '[ ] pass [ ] fail', 'version scheme', 'current version',
  'scaffolded', 'remediation in progress', 'enforced', 'verified', 'active', 'tracked'
];

async function checkStatusMatrix(dir) {
  let issues = 0;
  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory() && !fullPath.includes('node_modules') && !fullPath.includes('.git')) {
        await walk(fullPath);
      } else if (entry.isFile() && fullPath.endsWith('.md')) {
        const content = await fs.readFile(fullPath, 'utf8');
        // Basic heuristic: find markdown tables with a Status column
        if (content.includes('| Status |') || content.includes('|Status|')) {
           const lines = content.split('\n');
           let inTable = false;
           let statusColIndex = -1;
           for (const line of lines) {
             if (line.trim().startsWith('|')) {
               const cols = line.split('|').map(c => c.trim().toLowerCase());
               if (!inTable) {
                 if (cols.includes('status')) {
                   inTable = true;
                   statusColIndex = cols.indexOf('status');
                 }
               } else if (inTable && statusColIndex !== -1 && !line.includes('---')) {
                 let statusVal = cols[statusColIndex];
                 if (statusVal) {
                   // clean up markdown formatting like backticks and bold
                   statusVal = statusVal.replace(/[`*]/g, '').trim();
                   if (statusVal.length > 0 && !ALLOWED_STATUS_LABELS.includes(statusVal)) {
                      console.error(`[check-status-matrix] Invalid status label "${statusVal}" in ${fullPath}`);
                      issues++;
                   }
                 }
               }
             } else {
               inTable = false;
             }
           }
        }
      }
    }
  }
  await walk(dir);
  if (issues > 0) {
    console.error(`[check-status-matrix] Found ${issues} issues.`);
    process.exit(1);
  }
  console.log('[check-status-matrix] Status matrix check complete.');
}

const targetDir = process.argv[2] || './docs';
checkStatusMatrix(targetDir).catch(err => {
  console.error(err);
  process.exit(1);
});
