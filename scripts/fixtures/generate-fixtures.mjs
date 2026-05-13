// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { promises as fs, existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

// A deterministic random number generator for fixture generation
function seededRandom(seed) {
  let x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

function generateDeterministicId(seedStr) {
  return crypto.createHash('sha256').update(seedStr).digest('hex').substring(0, 12);
}

function redact(value) {
  return value ? '[REDACTED]' : undefined;
}

function generateReceiptFixture(seed) {
  return {
    receiptId: `rcpt-${generateDeterministicId(`receipt-${seed}`)}`,
    type: 'execution_step',
    runId: `run-${generateDeterministicId(`run-${seed}`)}`,
    planId: `plan-${generateDeterministicId(`plan-${seed}`)}`,
    stepId: `step-${generateDeterministicId(`step-${seed}`)}`,
    timestamp: "2026-05-12T12:00:00.000Z",
    reasonCode: "policy_approved",
    data: {
      action: "sandbox_create",
      result: "success"
    },
    correlationId: `corr-${generateDeterministicId(`corr-${seed}`)}`,
    signature: redact(true)
  };
}

function generateReplayEnvelopeFixture(seed) {
  return {
    replayId: `replay-${generateDeterministicId(`replay-${seed}`)}`,
    originalRunId: `run-${generateDeterministicId(`run-${seed}`)}`,
    originalPlanId: `plan-${generateDeterministicId(`plan-${seed}`)}`,
    replayedAt: "2026-05-12T12:05:00.000Z",
    originalReceipts: [
      `rcpt-${generateDeterministicId(`receipt-${seed}-1`)}`,
      `rcpt-${generateDeterministicId(`receipt-${seed}-2`)}`
    ],
    replayedReceipts: [
      `rcpt-${generateDeterministicId(`replay-receipt-${seed}-1`)}`,
      `rcpt-${generateDeterministicId(`replay-receipt-${seed}-2`)}`
    ],
    driftDetected: false,
    driftDetails: [],
    consistent: true
  };
}

function generateDiagnosticsFixture(seed) {
  return {
    diagId: `diag-${generateDeterministicId(`diag-${seed}`)}`,
    systemHealth: "ok",
    components: {
      sandbox: "active",
      router: "active",
      policyEngine: "active"
    },
    memoryUsageMb: Math.floor(seededRandom(seed) * 100) + 50,
    cpuPercent: Math.floor(seededRandom(seed + 1) * 30) + 5,
    uptimeSecs: Math.floor(seededRandom(seed + 2) * 86400) + 3600,
    timestamp: "2026-05-12T12:00:00.000Z"
  };
}

function generateTelemetryFixture(seed) {
  return {
    telemetryId: `telem-${generateDeterministicId(`telem-${seed}`)}`,
    runId: `run-${generateDeterministicId(`run-${seed}`)}`,
    timestamp: "2026-05-12T12:00:00.000Z",
    metrics: {
      requestCount: Math.floor(seededRandom(seed) * 1000) + 100,
      errorRate: parseFloat((seededRandom(seed + 1) * 0.05).toFixed(4)),
      latencyP50Ms: Math.floor(seededRandom(seed + 2) * 200) + 50,
      latencyP99Ms: Math.floor(seededRandom(seed + 3) * 500) + 200
    },
    redacted: true
  };
}

function generateTrustAttestationFixture(seed) {
  return {
    decisionId: `trust-${generateDeterministicId(`trust-${seed}`)}`,
    runId: `run-${generateDeterministicId(`run-${seed}`)}`,
    planId: `plan-${generateDeterministicId(`plan-${seed}`)}`,
    allowed: true,
    reasonCode: "trust_threshold_met",
    message: "Trust level sufficient for requested operation",
    decidedAt: "2026-05-12T12:00:00.000Z",
    decidedBy: "policy_engine",
    policyVersion: "1.0.0",
    trustLevel: "high",
    approvalRequired: false,
    approvalGranted: false,
    metadata: {
      evaluator: "canonical_policy",
      redacted: true
    }
  };
}

function generateDegradedStateFixture(seed) {
  return [
    {
      id: `degraded-${generateDeterministicId(`degraded-${seed}-1`)}`,
      state: "ok",
      detail: "All components operational",
      timestamp: "2026-05-12T12:00:00.000Z"
    },
    {
      id: `degraded-${generateDeterministicId(`degraded-${seed}-2`)}`,
      state: "unavailable",
      detail: "Component explicitly unavailable",
      unavailable: true,
      timestamp: "2026-05-12T12:01:00.000Z"
    },
    {
      id: `degraded-${generateDeterministicId(`degraded-${seed}-3`)}`,
      state: "degraded",
      detail: "Operating in degraded mode: policy_guard active",
      degraded: true,
      reasonCode: "policy_guard",
      timestamp: "2026-05-12T12:02:00.000Z"
    }
  ];
}

function generateProofpackFixture(seed) {
  return {
    proofpackId: `proof-${generateDeterministicId(`proof-${seed}`)}`,
    runId: `run-${generateDeterministicId(`run-${seed}`)}`,
    planId: `plan-${generateDeterministicId(`plan-${seed}`)}`,
    manifestHash: generateDeterministicId(`manifest-${seed}`),
    receipts: [
      `rcpt-${generateDeterministicId(`proof-receipt-${seed}-1`)}`,
      `rcpt-${generateDeterministicId(`proof-receipt-${seed}-2`)}`
    ],
    trustDecisions: [
      `trust-${generateDeterministicId(`proof-trust-${seed}`)}`
    ],
    attestations: [
      `attest-${generateDeterministicId(`proof-attest-${seed}`)}`
    ],
    createdAt: "2026-05-12T12:00:00.000Z",
    redacted: true
  };
}

function generateQueueLeaseFixture(seed) {
  return {
    queueId: `queue-${generateDeterministicId(`queue-${seed}`)}`,
    runId: `run-${generateDeterministicId(`run-${seed}`)}`,
    leases: [
      {
        leaseId: `lease-${generateDeterministicId(`lease-${seed}-1`)}`,
        stepId: `step-${generateDeterministicId(`step-${seed}-1`)}`,
        status: "acquired",
        acquiredAt: "2026-05-12T12:00:00.000Z",
        expiresAt: "2026-05-12T12:05:00.000Z"
      },
      {
        leaseId: `lease-${generateDeterministicId(`lease-${seed}-2`)}`,
        stepId: `step-${generateDeterministicId(`step-${seed}-2`)}`,
        status: "released",
        acquiredAt: "2026-05-12T12:00:00.000Z",
        releasedAt: "2026-05-12T12:01:00.000Z"
      }
    ],
    timestamp: "2026-05-12T12:00:00.000Z"
  };
}

function generateExecutionPlanFixture(seed) {
  return {
    planId: `plan-${generateDeterministicId(`plan-${seed}`)}`,
    name: "Demo Execution Plan",
    description: "Deterministic execution plan fixture for review",
    status: "completed",
    steps: [
      {
        stepId: `step-${generateDeterministicId(`step-${seed}-1`)}`,
        planId: `plan-${generateDeterministicId(`plan-${seed}`)}`,
        name: "Initialize sandbox",
        status: "completed",
        payload: { action: "sandbox_create" },
        retryCount: 0,
        maxRetries: 3,
        createdAt: "2026-05-12T11:59:00.000Z",
        updatedAt: "2026-05-12T12:00:00.000Z",
        startedAt: "2026-05-12T11:59:30.000Z",
        completedAt: "2026-05-12T12:00:00.000Z"
      },
      {
        stepId: `step-${generateDeterministicId(`step-${seed}-2`)}`,
        planId: `plan-${generateDeterministicId(`plan-${seed}`)}`,
        name: "Run policy evaluation",
        status: "completed",
        payload: { action: "policy_evaluate" },
        retryCount: 0,
        maxRetries: 3,
        createdAt: "2026-05-12T12:00:00.000Z",
        updatedAt: "2026-05-12T12:00:30.000Z",
        startedAt: "2026-05-12T12:00:05.000Z",
        completedAt: "2026-05-12T12:00:30.000Z"
      }
    ],
    policy: {
      policyId: `policy-${generateDeterministicId(`policy-${seed}`)}`,
      version: "1.0.0",
      enabled: true
    },
    createdAt: "2026-05-12T11:58:00.000Z",
    updatedAt: "2026-05-12T12:00:30.000Z",
    startedAt: "2026-05-12T11:59:00.000Z",
    completedAt: "2026-05-12T12:00:30.000Z"
  };
}

async function writeFixtures() {
  const args = process.argv.slice(2);
  let outputDir = './fixtures/generated';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' && i + 1 < args.length) {
      outputDir = args[i + 1];
      i++;
    }
  }

  const fixtureDir = path.resolve(outputDir);
  await fs.mkdir(fixtureDir, { recursive: true });

  const seed = 42;

  const fixtures = [
    { name: 'receipt.json', fn: () => generateReceiptFixture(seed) },
    { name: 'replay-envelope.json', fn: () => generateReplayEnvelopeFixture(seed) },
    { name: 'diagnostics.json', fn: () => generateDiagnosticsFixture(seed) },
    { name: 'telemetry.json', fn: () => generateTelemetryFixture(seed) },
    { name: 'trust-attestation.json', fn: () => generateTrustAttestationFixture(seed) },
    { name: 'degraded-state.json', fn: () => generateDegradedStateFixture(seed) },
    { name: 'proofpack.json', fn: () => generateProofpackFixture(seed) },
    { name: 'queue-lease.json', fn: () => generateQueueLeaseFixture(seed) },
    { name: 'execution-plan.json', fn: () => generateExecutionPlanFixture(seed) },
  ];

  for (const fixture of fixtures) {
    const data = fixture.fn();
    await fs.writeFile(path.join(fixtureDir, fixture.name), JSON.stringify(data, null, 2));
  }

  console.log(`[generate-fixtures] Generated ${fixtures.length} deterministic fixtures in ${fixtureDir}`);
}

writeFixtures().catch(err => {
  console.error(err);
  process.exit(1);
});
