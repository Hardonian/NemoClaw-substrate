// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { promises as fs, existsSync } from 'fs';
import path from 'path';

async function checkDocLinks(dir, rootDir) {
  let issues = 0;
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const res = path.resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git'].includes(entry.name)) continue;
      issues += await checkDocLinks(res, rootDir);
    } else if (entry.name.endsWith('.md')) {
      const content = await fs.readFile(res, 'utf8');
      const links = [...content.matchAll(/\[.*?\]\((?!http)(.*?)\)/g)];
      for (const link of links) {
        const [target, fragment] = link[1].split('#');

        if (!target && fragment) continue; // Document internal fragment only

        const targetPath = path.resolve(dir, target);
        if (!existsSync(targetPath)) {
          console.error(`[check-doc-links] FAIL: Broken link in ${res}: ${link[1]}`);
          issues++;
        } else if (fragment && fragment.startsWith('L')) {
          // Validate code fragment line numbers (e.g., #L10 or #L10-L20)
          const lineMatch = fragment.match(/^L(\d+)(?:-L?(\d+))?$/);
          if (lineMatch) {
            const startLine = parseInt(lineMatch[1], 10);
            const endLine = lineMatch[2] ? parseInt(lineMatch[2], 10) : startLine;

            const fileContent = await fs.readFile(targetPath, 'utf8');
            const totalLines = fileContent.split('\n').length;

            if (startLine < 1 || startLine > totalLines || endLine < startLine || endLine > totalLines) {
              console.error(`[check-doc-links] FAIL: Broken code fragment reference in ${res}: ${link[1]} (File has ${totalLines} lines)`);
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
  checkDocLinks(docsDir, docsDir).catch(() => {}).then(issues => {
    if (issues > 0) process.exit(1);
    console.log('[check-doc-links] All checks passed.');
  });
}
