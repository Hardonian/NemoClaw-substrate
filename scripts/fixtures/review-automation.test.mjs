// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import { checkClaims } from '../scripts/review/check-claims.mjs';
import { checkStatusMatrix, ALLOWED_LABELS } from '../scripts/review/check-status-matrix.mjs';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runTests() {
  console.log('Running review automation tests...');

  const testDocsDir = path.resolve(__dirname, '../.tmp-test-docs');
  await fs.mkdir(testDocsDir, { recursive: true });
  await fs.writeFile(path.join(testDocsDir, 'bad-claim.md'), 'This is 100% foolproof and unhackable.', 'utf8');
  await fs.writeFile(path.join(testDocsDir, 'good-doc.md'), 'This is a stable system.', 'utf8');

  let issues = await checkClaims(testDocsDir);
  assert.strictEqual(issues, 1, 'Claim checker should catch unsupported words');

  await fs.writeFile(path.join(testDocsDir, 'bad-status.md'), '| Status: magic |', 'utf8');
  issues = await checkStatusMatrix(testDocsDir);
  assert.strictEqual(issues, 1, 'Status checker should reject invalid labels');

  assert.ok(ALLOWED_LABELS.includes('stable'));

  await fs.rm(testDocsDir, { recursive: true, force: true });
  console.log('All tests passed.');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
