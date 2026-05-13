// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { promises as fs } from 'fs';
import path from 'path';

async function smokeTestOperatorCli() {
  console.log('[operator-cli-smoke] Running operator CLI smoke tests in demo mode...');

  const args = process.argv.slice(2);
  let fixtureDir = path.resolve('./fixtures/generated');
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--fixture-dir' && i + 1 < args.length) {
      fixtureDir = path.resolve(args[i + 1]);
      i++;
    }
  }

  try {
    await fs.access(fixtureDir);
  } catch (e) {
    console.error(`[operator-cli-smoke] Fixtures not found at ${fixtureDir}. Run generate-fixtures.mjs first.`);
    process.exit(1);
  }

  // Simulate parsing a receipt JSON
  const receiptPath = path.join(fixtureDir, 'receipt.json');
  const receiptStr = await fs.readFile(receiptPath, 'utf8');
  const receipt = JSON.parse(receiptStr);

  if (!receipt.receiptId || !receipt.type) {
    console.error('[operator-cli-smoke] Failed: Receipt fixture missing required fields.');
    process.exit(1);
  }

  if (receiptStr.includes('sk-') || receiptStr.includes('ghp_') || receiptStr.includes('nvapi-')) {
    console.error('[operator-cli-smoke] Failed: Receipt fixture appears to contain unredacted secrets.');
    process.exit(1);
  }

  // Simulate a table output sanity check
  console.log('[operator-cli-smoke] Validating table output simulation...');
  console.log('------------------------------------------------------------');
  console.log('| RECEIPT ID            | TYPE            | TIMESTAMP           |');
  console.log('------------------------------------------------------------');
  const ts = receipt.timestamp || 'N/A';
  console.log(`| ${receipt.receiptId.padEnd(21)} | ${receipt.type.padEnd(15)} | ${ts.padEnd(19)} |`);
  console.log('------------------------------------------------------------');

  // Validate all generated fixtures exist and are parseable
  const expectedFiles = [
    'receipt.json',
    'replay-envelope.json',
    'diagnostics.json',
    'telemetry.json',
    'trust-attestation.json',
    'degraded-state.json',
    'proofpack.json',
    'queue-lease.json',
    'execution-plan.json',
  ];

  for (const file of expectedFiles) {
    const filePath = path.join(fixtureDir, file);
    try {
      const content = await fs.readFile(filePath, 'utf8');
      JSON.parse(content);
    } catch (e) {
      console.error(`[operator-cli-smoke] Failed: ${file} is missing or invalid JSON.`);
      process.exit(1);
    }
  }

  console.log('[operator-cli-smoke] All smoke tests passed.');
}

smokeTestOperatorCli().catch(err => {
  console.error(err);
  process.exit(1);
});
