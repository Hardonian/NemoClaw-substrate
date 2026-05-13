// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { promises as fs } from 'fs';
import path from 'path';

async function checkDocIndex() {
  const expectedFiles = [
    'docs/site-map.md',
    'docs/navigation-map.md'
  ];
  
  let issues = 0;
  for (const file of expectedFiles) {
    try {
      await fs.access(file);
    } catch (e) {
      console.error(`[check-doc-index] Missing required index file: ${file}`);
      issues++;
    }
  }
  
  if (issues > 0) {
    console.error(`[check-doc-index] Found ${issues} issues.`);
    process.exit(1);
  }
  
  console.log('[check-doc-index] All required doc indexes are present.');
}

checkDocIndex().catch(err => {
  console.error(err);
  process.exit(1);
});
