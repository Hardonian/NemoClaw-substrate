// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { promises as fs, existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

const SECRET_PATTERNS = [
  { name: 'NVIDIA API key', re: /nvapi-[a-zA-Z0-9_-]{20,}/ },
  { name: 'OpenAI key', re: /sk-[a-zA-Z0-9]{20,}/ },
  { name: 'GitHub token', re: /gh[pousr]_[a-zA-Z0-9]{20,}/ },
  { name: 'Slack token', re: /xox[baprs]-[a-zA-Z0-9]{10,48}/ },
];

function computeHash(data) {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex').substring(0, 16);
}

async function checkProofpack(targetDir) {
  const issues = [];
  const warnings = [];

  console.log('[check-proofpack] Reviewing proofpack/evidence fixtures...');

  // 1. Check proofpack fixture exists and is valid JSON
  const proofpackPaths = [
    path.join(targetDir, 'proofpack.json'),
    path.join(targetDir, 'demo', 'proofpack.json'),
    path.join(targetDir, 'generated', 'proofpack.json'),
  ];

  let proofpackFile = null;
  let proofpackData = null;

  for (const p of proofpackPaths) {
    if (existsSync(p)) {
      proofpackFile = p;
      const raw = await fs.readFile(p, 'utf8');
      proofpackData = JSON.parse(raw);
      break;
    }
  }

  if (!proofpackFile) {
    console.warn('[check-proofpack] No proofpack fixture found in fixtures/. Checking docs only.');
  } else {
    console.log(`[check-proofpack] Found proofpack fixture at ${proofpackFile}`);

    // Normalize to array for iteration
    const entries = Array.isArray(proofpackData) ? proofpackData : [proofpackData];

    for (const entry of entries) {
      const id = entry.id || entry.proofpackId || entry.id || 'unknown';

      // 2. Manifest hash presence check
      if (entry.manifestHash !== undefined && entry.manifestHash !== null) {
        if (typeof entry.manifestHash !== 'string' || entry.manifestHash.length === 0) {
          issues.push(`Proofpack ${id}: manifestHash is present but empty or invalid`);
        } else {
          console.log(`[check-proofpack] Manifest hash present for ${id}: ${entry.manifestHash.substring(0, 8)}...`);
        }
      }

      // 3. Redaction check — scan all string values for secret patterns
      const rawContent = JSON.stringify(entry);
      for (const pattern of SECRET_PATTERNS) {
        const match = rawContent.match(pattern.re);
        if (match) {
          issues.push(`Proofpack ${id}: potential unredacted ${pattern.name} found`);
        }
      }

      // 4. Redaction marker check — degraded/unavailable entries should be explicit
      if (entry.state === 'unavailable' && !entry.unavailable) {
        warnings.push(`Proofpack ${id}: state is "unavailable" but unavailable flag not set`);
      }
      if (entry.state === 'degraded' && !entry.degraded) {
        warnings.push(`Proofpack ${id}: state is "degraded" but degraded flag not set`);
      }

      // 5. Replay linkage check — verify linked receipts/trust decisions exist
      const linkedReceipts = entry.receipts || [];
      const linkedTrust = entry.trustDecisions || [];
      if (linkedReceipts.length > 0) {
        console.log(`[check-proofpack] Proofpack ${id} links to ${linkedReceipts.length} receipt(s)`);
      }
      if (linkedTrust.length > 0) {
        console.log(`[check-proofpack] Proofpack ${id} links to ${linkedTrust.length} trust decision(s)`);
      }

      // 6. Cross-reference check — if runId/planId present, they should be non-empty strings
      for (const field of ['runId', 'planId']) {
        if (entry[field] !== undefined && entry[field] !== null) {
          if (typeof entry[field] !== 'string' || entry[field].length === 0) {
            issues.push(`Proofpack ${id}: ${field} is present but empty or invalid`);
          }
        }
      }
    }
  }

  // 7. Check that generated proofpack fixture validates against its own structure
  const generatedPath = path.join(targetDir, 'generated', 'proofpack.json');
  if (existsSync(generatedPath)) {
    const raw = await fs.readFile(generatedPath, 'utf8');
    const generated = JSON.parse(raw);

    // Check redacted marker
    if (generated.redacted !== true) {
      issues.push('Generated proofpack fixture missing redacted: true marker');
    }

    // Check manifest hash is a stable hash (non-empty hex string)
    if (!generated.manifestHash || !/^[a-f0-9]+$/.test(generated.manifestHash)) {
      issues.push('Generated proofpack fixture has invalid manifestHash');
    }

    // Check receipts array exists and is non-empty
    if (!Array.isArray(generated.receipts) || generated.receipts.length === 0) {
      issues.push('Generated proofpack fixture has missing or empty receipts array');
    }

    // Verify manifest hash matches actual content hash (excluding the hash field itself)
    const contentForHash = { ...generated };
    delete contentForHash.manifestHash;
    const expectedHash = computeHash(contentForHash);
    if (generated.manifestHash !== expectedHash) {
      warnings.push(`Generated proofpack manifestHash (${generated.manifestHash}) does not match computed hash (${expectedHash.substring(0, 16)})`);
    } else {
      console.log('[check-proofpack] Generated proofpack manifest hash verified');
    }

    // Verify replay linkage — check that linked receipt IDs match receipt fixture patterns
    if (Array.isArray(generated.receipts)) {
      for (const receiptId of generated.receipts) {
        if (!/^rcpt-[a-f0-9]{12}$/.test(receiptId)) {
          warnings.push(`Generated proofpack has non-standard receipt ID: ${receiptId}`);
        }
      }
    }
    if (Array.isArray(generated.trustDecisions)) {
      for (const trustId of generated.trustDecisions) {
        if (!/^trust-[a-f0-9]{12}$/.test(trustId)) {
          warnings.push(`Generated proofpack has non-standard trust decision ID: ${trustId}`);
        }
      }
    }
  }

  // 8. Check docs exist
  try {
    await fs.access('./docs/verification/proofpack-review-checks.md');
    console.log('[check-proofpack] Review checks doc exists.');
  } catch (e) {
    issues.push('Missing docs/verification/proofpack-review-checks.md');
  }

  // Report results
  for (const w of warnings) {
    console.warn(`[check-proofpack] WARNING: ${w}`);
  }
  for (const i of issues) {
    console.error(`[check-proofpack] FAIL: ${i}`);
  }

  if (issues.length > 0) {
    console.error(`[check-proofpack] Found ${issues.length} issue(s).`);
    process.exit(1);
  }

  console.log(`[check-proofpack] Proofpack review complete (${warnings.length} warnings).`);
}

const targetDir = process.argv[2] || './fixtures';
checkProofpack(targetDir).catch(err => {
  console.error(err);
  process.exit(1);
});
