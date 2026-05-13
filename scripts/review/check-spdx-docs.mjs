// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { promises as fs } from 'fs';
import path from 'path';

// Files exempt from SPDX requirement — these are generated, standard,
// or have their own license convention.
const EXEMPT_PATHS = [
  '_build',
  '_templates',
  'node_modules',
  '.git',
];

const EXEMPT_NAMES = [
  'CHANGELOG.md',
];

async function checkSpdxDocs(dir) {
  let issues = 0;
  const missing = [];

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (EXEMPT_PATHS.some((p) => fullPath.includes(p))) continue;
        await walk(fullPath);
      } else if (entry.isFile() && fullPath.endsWith('.md')) {
        if (EXEMPT_NAMES.some((n) => fullPath.includes(n))) continue;

        const content = await fs.readFile(fullPath, 'utf8');
        if (!content.includes('SPDX-License-Identifier:')) {
          missing.push(fullPath);
          issues++;
        }
      }
    }
  }

  await walk(dir);

  for (const f of missing) {
    console.error(`[check-spdx-docs] Missing SPDX header in ${f}`);
  }

  if (issues > 0) {
    console.error(`[check-spdx-docs] Found ${issues} file(s) missing SPDX headers.`);
    process.exit(1);
  }

  console.log('[check-spdx-docs] SPDX docs check complete.');
}

const targetDir = process.argv[2] || './docs';
checkSpdxDocs(targetDir).catch((err) => {
  console.error(err);
  process.exit(1);
});
