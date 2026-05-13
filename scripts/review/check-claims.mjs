// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { promises as fs } from 'fs';
import path from 'path';

// Minimal script to check for unsupported claims
const forbiddenClaims = [
  'guaranteed', '100%', 'foolproof', 'bulletproof', 'unhackable', 'perfect',
  'impenetrable', 'invincible', 'absolute security', 'completely safe',
  'total protection', 'unbreakable', 'zero risk', 'fully autonomous',
  'magic', 'autonomous decision-making'
];


const EXEMPT_FILES = [
  'review-automation.md',
  'anti-theatre-doctrine.md',
  'canonical-terminology-index.md',
  'terminological-consistency-audit.md',
  'evidence-index.md',
  'governance-glossary.md',
  'glossary.md',
  'release-maturity-summary.md',
  'strategic-positioning.md',
  'nemoclaw-vs-openclaw.md',
  'evidence-map.md',
  'semantic-consistency-audit.md',
  'fixture-generation-doctrine.md',
  'evidence-export-formats.md'
];

async function checkClaims(dir) {
  let issues = 0;
  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory() && !fullPath.includes('node_modules') && !fullPath.includes('.git')) {
        await walk(fullPath);
      } else if (entry.isFile() && fullPath.endsWith('.md')) {
        if (EXEMPT_FILES.some(f => fullPath.endsWith(f))) continue;
        const content = await fs.readFile(fullPath, 'utf8');
        for (const claim of forbiddenClaims) {
          const regex = new RegExp(`\\b${claim.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
          if (regex.test(content)) {
            console.error(`[check-claims] Found forbidden claim "${claim}" in ${fullPath}`);
            issues++;
          }
        }
      }
    }
  }
  await walk(dir);
  if (issues > 0) {
    console.error(`[check-claims] Found ${issues} issues.`);
    process.exit(1);
  }
  console.log('[check-claims] No forbidden claims found.');
}

const targetDir = process.argv[2] || './docs';
checkClaims(targetDir).catch(err => {
  console.error(err);
  process.exit(1);
});
