// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

const SEED = '42';

function hashId(prefix, str) {
  const hash = crypto.createHash('sha256').update(SEED + str).digest('hex').substring(0, 12);
  return `${prefix}-${hash}`;
}

async function writeFixture(dir, filename, data) {
  const target = path.join(dir, filename);
  await fs.writeFile(target, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`[generate-fixtures] Wrote ${target}`);
}

async function generate() {
  const args = process.argv.slice(2);
  let outputDir = path.resolve('./fixtures/generated');
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' && i + 1 < args.length) {
      outputDir = path.resolve(args[i + 1]);
      i++;
    }
  }

  await fs.mkdir(outputDir, { recursive: true });

  const timestamp = '2026-05-09T12:00:00.000Z';

  const receipt = {
    receiptId: hashId('rcpt', 'receipt-1'),
    type: 'ExecutionReceipt',
    timestamp,
    redacted: true,
    steps: [
      { stepId: 'step-1', status: 'SUCCESS' }
    ]
  };

  const replayEnvelope = {
    envelopeId: hashId('env', 'replay-1'),
    type: 'ReplayEnvelope',
    timestamp,
    redacted: true,
    receiptId: receipt.receiptId,
    verified: true
  };

  const diagnostics = {
    diagnosticId: hashId('diag', 'diag-1'),
    type: 'Diagnostics',
    timestamp,
    redacted: true,
    health: 'OK',
    components: { database: 'UP' }
  };

  const telemetry = {
    telemetryId: hashId('tel', 'tel-1'),
    type: 'Telemetry',
    timestamp,
    redacted: true,
    metrics: { cpu: 45, memory: 512 }
  };

  const trustAttestation = {
    attestationId: hashId('trust', 'trust-1'),
    type: 'TrustDecision',
    timestamp,
    redacted: true,
    decision: 'ALLOW',
    reason: 'Policy matched'
  };

  const degradedState = {
    stateId: hashId('state', 'degraded-1'),
    type: 'DegradedState',
    timestamp,
    redacted: true,
    status: 'DEGRADED',
    unavailable: false,
    degraded: true
  };

  const proofpackManifestContent = {
    id: hashId('proof', 'proofpack-1'),
    type: 'Proofpack',
    timestamp,
    redacted: true,
    receipts: [receipt.receiptId],
    trustDecisions: [trustAttestation.attestationId],
    runId: 'run-1',
    planId: 'plan-1'
  };

  const manifestHash = crypto.createHash('sha256').update(JSON.stringify(proofpackManifestContent)).digest('hex').substring(0, 16);
  const proofpack = { ...proofpackManifestContent, manifestHash };

  const queueLease = {
    leaseId: hashId('lease', 'lease-1'),
    type: 'QueueLease',
    timestamp,
    redacted: true,
    status: 'ACTIVE'
  };

  const executionPlan = {
    planId: 'plan-1',
    type: 'ExecutionPlan',
    timestamp,
    redacted: true,
    tasks: []
  };

  await writeFixture(outputDir, 'receipt.json', receipt);
  await writeFixture(outputDir, 'replay-envelope.json', replayEnvelope);
  await writeFixture(outputDir, 'diagnostics.json', diagnostics);
  await writeFixture(outputDir, 'telemetry.json', telemetry);
  await writeFixture(outputDir, 'trust-attestation.json', trustAttestation);
  await writeFixture(outputDir, 'degraded-state.json', degradedState);
  await writeFixture(outputDir, 'proofpack.json', proofpack);
  await writeFixture(outputDir, 'queue-lease.json', queueLease);
  await writeFixture(outputDir, 'execution-plan.json', executionPlan);

  console.log('[generate-fixtures] Done.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generate().catch(console.error);
}
export { generate };
