// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const scripts = [
  'check-claims.mjs',
  'check-doc-links.mjs',
  'check-status-matrix.mjs',
  'check-no-theatre.mjs',
  'check-fixtures-redacted.mjs',
  'check-spdx-docs.mjs',
  'check-proofpack.mjs',
  'check-doc-index.mjs'
];

async function runScript(script) {
  return new Promise((resolve, reject) => {
    console.log(`\n=== Running ${script} ===`);
    const proc = spawn('node', [path.join(__dirname, script)], { stdio: 'inherit' });
    proc.on('close', code => {
      if (code !== 0) {
        reject(new Error(`${script} failed with exit code ${code}`));
      } else {
        resolve();
      }
    });
  });
}

async function main() {
  for (const script of scripts) {
    try {
      await runScript(script);
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  }
  console.log('\n[review:all] All checks passed successfully.');
}

main();
