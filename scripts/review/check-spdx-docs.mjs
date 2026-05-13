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
        const lines = content.split('\n');

        // Check for SPDX header
        if (!content.includes('SPDX-License-Identifier:')) {
          missing.push(fullPath);
          issues++;
          continue;
        }

        // Check for content before first heading (H1)
        let foundHeading = false;
        let foundNonSpdxContent = false;
        let inSpdxComment = false;
        let inFrontmatter = false;

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed === '') continue;

          // Handle SPDX comment blocks
          if (trimmed.startsWith('<!--')) {
            inSpdxComment = true;
            if (trimmed.includes('SPDX')) {
               // already found it
            }
            if (trimmed.endsWith('-->')) {
              inSpdxComment = false;
            }
            continue;
          }
          if (inSpdxComment) {
            if (trimmed.endsWith('-->')) {
              inSpdxComment = false;
            }
            continue;
          }

          // Handle YAML frontmatter
          if (trimmed === '---') {
            inFrontmatter = !inFrontmatter;
            continue;
          }
          if (inFrontmatter) {
            continue;
          }

          // Check for H1
          if (trimmed.startsWith('# ')) {
            foundHeading = true;
            break;
          }

          // If we reach here, it's non-empty, non-SPDX comment, non-frontmatter, and not H1
          foundNonSpdxContent = true;
          break;
        }

        if (foundNonSpdxContent && !foundHeading) {
          console.error(`[check-spdx-docs] Found non-SPDX content before title in ${fullPath}`);
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
