// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import { checkClaims } from '../scripts/review/check-claims.mjs';
import { checkStatusMatrix, ALLOWED_LABELS } from '../scripts/review/check-status-matrix.mjs';
import { promises as fs, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv/dist/2020.js';
import ajvFormats from 'ajv-formats';

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

  console.log('Checking generated fixtures against JSON schemas...');
  const ajv = new Ajv({ strict: false, allErrors: true });
  const addFormats = ajvFormats.default || ajvFormats;
  addFormats(ajv);

  const schemasDir = path.resolve(__dirname, '../../schemas');
  const fixturesDir = path.resolve(__dirname, '../../fixtures/generated');

  const schemasToTest = [
    { schema: 'receipt.schema.json', fixture: 'receipt.json' },
    { schema: 'replay-envelope.schema.json', fixture: 'replay-envelope.json' },
    { schema: 'proofpack.schema.json', fixture: 'proofpack.json' }
  ];

  for (const { schema, fixture } of schemasToTest) {
    const schemaPath = path.join(schemasDir, schema);
    const fixturePath = path.join(fixturesDir, fixture);

    if (existsSync(schemaPath) && existsSync(fixturePath)) {
      const schemaData = JSON.parse(await fs.readFile(schemaPath, 'utf8'));
      const fixtureData = JSON.parse(await fs.readFile(fixturePath, 'utf8'));
      const validate = ajv.compile(schemaData);
      const valid = validate(fixtureData);
      assert.ok(valid, `Fixture ${fixture} failed schema ${schema} validation: ${JSON.stringify(validate.errors)}`);
      console.log(`  - ${fixture} conforms to ${schema}`);
    }
  }

  await fs.rm(testDocsDir, { recursive: true, force: true });
  console.log('All tests passed.');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
