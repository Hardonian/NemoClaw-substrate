// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { promises as fs } from 'fs';
import path from 'path';

const SECRET_REGEX = /(sk-[a-zA-Z0-9]{48}|gh[pousr]_[a-zA-Z0-9]{36}|xox[baprs]-[a-zA-Z0-9]{10,48}|nvapi-[a-zA-Z0-9_-]{40,}|AKIA[0-9A-Z]{16}|\b(?![a-f0-9]{40}\b)[a-zA-Z0-9+/]{40}\b)/g;

async function checkFixturesRedacted(dir) {
  let issues = 0;
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const res = path.resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git'].includes(entry.name)) continue;
      issues += await checkFixturesRedacted(res);
    } else if (entry.name.endsWith('.json')) {
      const content = await fs.readFile(res, 'utf8');
      const matches = content.match(SECRET_REGEX);
      if (matches) {
        console.error(`[check-fixtures-redacted] FAIL: Potential unredacted secret found in ${res}`);
        issues++;
      }
    }
  }
  return issues;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const fixturesDir = path.resolve(process.argv[2] || './fixtures');
  checkFixturesRedacted(fixturesDir).catch(() => {}).then(issues => {
    if (issues > 0) process.exit(1);
    console.log('[check-fixtures-redacted] All checks passed.');
  });
}
export { checkFixturesRedacted };
