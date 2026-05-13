// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { promises as fs } from 'fs';
import path from 'path';

async function checkDocLinks(dir) {
  let issues = 0;
  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory() && !fullPath.includes('node_modules') && !fullPath.includes('.git')) {
        await walk(fullPath);
      } else if (entry.isFile() && fullPath.endsWith('.md')) {
        const content = await fs.readFile(fullPath, 'utf8');
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        let match;
        while ((match = linkRegex.exec(content)) !== null) {
          const link = match[2];
          if (link.startsWith('http') || link.startsWith('#') || link.startsWith('mailto:')) continue;

          try {
            const targetPath = path.resolve(path.dirname(fullPath), link.split('#')[0]);
            await fs.access(targetPath);
          } catch (e) {
            console.error(`[check-doc-links] Broken link "${link}" in ${fullPath}`);
            issues++;
          }
        }
      }
    }
  }
  await walk(dir);
  if (issues > 0) {
    // Just warn for now to avoid blocking CI unexpectedly
    console.warn(`[check-doc-links] Found ${issues} broken links (warnings).`);
  }
  console.log('[check-doc-links] Link check complete.');
}

checkDocLinks('./docs').catch(err => {
  console.error(err);
  process.exit(1);
});
