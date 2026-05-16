// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Unified deterministic fixture generator.
 *
 * Regenerates every artifact under fixtures/generated/*.json from a single invocation.
 * Usage: npx tsx scripts/generate-fixtures.ts [--seed <number>]
 *
 * Acceptance:
 * - Two consecutive runs with same seed produce bitwise-identical output.
 * - Every output file is validated after generation (valid JSON, required fields present).
 * - No timestamps or non-deterministic values in output.
 */

import * as fs from "fs";
import * as path from "path";
import * as process from "process";
import { createHash } from "crypto";

import { deterministicSerialize } from "../src/lib/control-plane/serde";
import {
  generateSeededFixture,
  generateReplayFixture,
  generateDegradedFixture,
  generateQueueLeaseFixture,
  generateTrustConflictFixture,
  generatePolicyDenyFixture,
} from "../src/lib/control-plane/fixture-generators";

const FIXTURES_DIR = process.env.FIXTURES_OUTPUT_DIR
  ? path.resolve(process.env.FIXTURES_OUTPUT_DIR)
  : path.resolve(__dirname, "..", "fixtures", "generated");
const DEFAULT_SEED = 42;

interface FixtureSpec {
  name: string;
  requiredFields: string[];
  generate: () => unknown;
}

function parseArgs(): { seed: number } {
  const args = process.argv.slice(2);
  let seed = DEFAULT_SEED;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--seed" && args[i + 1]) {
      seed = parseInt(args[i + 1], 10);
      if (isNaN(seed)) {
        console.error(`Invalid seed value: ${args[i + 1]}`);
        process.exit(1);
      }
      i++;
    }
  }
  return { seed };
}

function stableJsonStringify(value: unknown): string {
  return deterministicSerialize(value);
}

function writeFixture(name: string, data: unknown): void {
  const filePath = path.join(FIXTURES_DIR, name);
  const content = stableJsonStringify(data) + "\n";
  fs.writeFileSync(filePath, content, "utf8");
  console.log(`  Wrote ${name} (${content.length} bytes)`);
}

function validateFixture(name: string, requiredFields: string[]): void {
  const filePath = path.join(FIXTURES_DIR, name);
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(content);
    for (const field of requiredFields) {
      if (!(field in data)) {
        console.error(`  FAILED validation: ${name} - missing required field "${field}"`);
        process.exit(1);
      }
    }
  } catch (e) {
    console.error(`  FAILED to read/parse: ${name} - ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }
}

function main(): void {
  const { seed } = parseArgs();
  const seedStr = String(seed);

  console.log(`Generating fixtures with seed=${seed}`);

  if (!fs.existsSync(FIXTURES_DIR)) {
    fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  }

  // Generate all fixtures using deterministic data
  const seededResult = generateSeededFixture({
    seed: seedStr,
    baseTimestamp: "2026-05-09T12:00:00Z",
    count: 10,
  });
  const replayResult = generateReplayFixture({
    eventCount: 20,
    baseTimestamp: "2026-05-09T12:00:00Z",
    includeGovernance: true,
    includeDiagnostics: true,
    includeDegraded: true,
    includeApprovals: true,
    includeDegradedStateTrigger: true,
  });
  const degradedResult = generateDegradedFixture({
    count: 10,
    baseTimestamp: "2026-05-09T12:00:00Z",
    severityMix: true,
  });
  const queueLeaseResult = generateQueueLeaseFixture({
    itemCount: 10,
    leaseCount: 5,
    baseTimestamp: "2026-05-09T12:00:00Z",
    includeCompleted: true,
    includeFailed: true,
    includeCancelled: true,
    includeExpiredLeases: true,
    includeReleasedLeases: true,
  });
  const trustResult = generateTrustConflictFixture({
    conflictCount: 5,
    baseTimestamp: "2026-05-09T12:00:00Z",
  });
  const policyResult = generatePolicyDenyFixture({
    denyCount: 5,
    baseTimestamp: "2026-05-09T12:00:00Z",
  });

  // Define all fixtures to generate
  const specs: FixtureSpec[] = [
    {
      name: "seeded-events.json",
      requiredFields: ["seed", "events", "manifestHash"],
      generate: () => ({
        seed: seededResult.seed,
        events: seededResult.events,
        manifestHash: seededResult.manifestHash,
      }),
    },
    {
      name: "replay-events.json",
      requiredFields: ["events", "envelope", "counts"],
      generate: () => ({
        events: replayResult.events,
        envelope: replayResult.envelope,
        counts: {
          governance: replayResult.governanceCount,
          diagnostics: replayResult.diagnosticsCount,
          degraded: replayResult.degradedCount,
          approvals: replayResult.approvalCount,
          degradedStateTriggers: replayResult.degradedStateTriggerCount,
        },
      }),
    },
    {
      name: "degraded-states.json",
      requiredFields: ["states", "events", "envelope"],
      generate: () => ({
        states: degradedResult.states,
        events: degradedResult.events,
        envelope: degradedResult.envelope,
      }),
    },
    {
      name: "queue-lease.json",
      requiredFields: ["items", "leases"],
      generate: () => ({
        items: queueLeaseResult.items,
        leases: queueLeaseResult.leases,
      }),
    },
    {
      name: "trust-conflicts.json",
      requiredFields: ["events", "envelope", "conflictCount"],
      generate: () => ({
        events: trustResult.events,
        envelope: trustResult.envelope,
        conflictCount: trustResult.conflictCount,
      }),
    },
    {
      name: "policy-denies.json",
      requiredFields: ["events", "envelope", "denyCount"],
      generate: () => ({
        events: policyResult.events,
        envelope: policyResult.envelope,
        denyCount: policyResult.denyCount,
      }),
    },
    {
      name: "diagnostics.json",
      requiredFields: ["events", "envelope"],
      generate: () => ({
        events: seededResult.events.filter((e) => e.category === "diagnostics_snapshot" || e.category === "replay_metadata"),
        envelope: seededResult.envelope,
      }),
    },
    {
      name: "receipt.json",
      requiredFields: ["events", "manifestHash"],
      generate: () => ({
        events: seededResult.events.filter((e) => e.category === "receipt"),
        manifestHash: seededResult.manifestHash,
      }),
    },
    {
      name: "replay-envelope.json",
      requiredFields: ["envelope_id", "version", "events"],
      generate: () => ({
        envelope_id: createHash("sha256").update(seedStr).digest("hex").slice(0, 12),
        version: "1.0.0",
        events: replayResult.envelope.events.map((e, i) => ({
          type: i === 0 ? "start" : i === replayResult.envelope.events.length - 1 ? "end" : "event",
          category: e.category,
          eventId: e.eventId,
          timestamp: e.occurredAt,
        })),
      }),
    },
  ];

  // Write all fixtures
  for (const spec of specs) {
    writeFixture(spec.name, spec.generate());
  }

  // Validate all generated fixtures
  console.log("\nValidating fixtures...");
  for (const spec of specs) {
    validateFixture(spec.name, spec.requiredFields);
  }

  console.log(`\nGenerated ${specs.length} fixtures with seed=${seed}`);
}

main();
