// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { promises as fs } from 'fs';
import path from 'path';

async function checkSpdxDocs(dir) {
  let issues = 0;
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const res = path.resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git'].includes(entry.name)) continue;
      issues += await checkSpdxDocs(res);
    } else if (entry.name.endsWith('.md')) {
      const content = await fs.readFile(res, 'utf8');
      if (!content.includes('SPDX-FileCopyrightText') || !content.includes('SPDX-License-Identifier')) {
        console.error(`[check-spdx-docs] FAIL: Missing SPDX header in ${res}`);
        issues++;
      }
    }
  }
  return issues;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const docsDir = path.resolve(process.argv[2] || './docs');
  checkSpdxDocs(docsDir).catch(() => {}).then(issues => {
    if (issues > 0) process.exit(1);
    console.log('[check-spdx-docs] All checks passed.');
  });
}