// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * CI gate: verifies that committed fixtures match the output of the generator.
 *
 * Saves current fixture hashes, regenerates with pinned seed, compares.
 * Restores originals if mismatch found (to avoid dirty working tree).
 *
 * Usage: npx tsx scripts/check-fixtures.ts
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { createHash } from "crypto";

const FIXTURES_DIR = path.resolve(__dirname, "..", "fixtures", "generated");
const PINNED_SEED = "42";

function hashFile(filePath: string): string {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function main(): void {
  console.log("Checking fixture determinism against generator output...");

  // Save hashes of current committed fixtures
  const committedFiles = fs.readdirSync(FIXTURES_DIR).filter((f) => f.endsWith(".json")).sort();
  const beforeHashes = new Map<string, string>();
  const beforeContents = new Map<string, string>();
  for (const file of committedFiles) {
    const filePath = path.join(FIXTURES_DIR, file);
    beforeHashes.set(file, hashFile(filePath));
    beforeContents.set(file, fs.readFileSync(filePath, "utf8"));
  }

  // Regenerate fixtures with pinned seed
  const { generateSeededFixture, generateReplayFixture, generateDegradedFixture, generateQueueLeaseFixture, generateTrustConflictFixture, generatePolicyDenyFixture } = require("../src/lib/control-plane/fixture-generators");
  const { deterministicSerialize } = require("../src/lib/control-plane/serde");

  const seedStr = PINNED_SEED;
  const seededResult = generateSeededFixture({ seed: seedStr, baseTimestamp: "2026-05-09T12:00:00Z", count: 10 });
  const replayResult = generateReplayFixture({ eventCount: 20, baseTimestamp: "2026-05-09T12:00:00Z", includeGovernance: true, includeDiagnostics: true, includeDegraded: true, includeApprovals: true, includeDegradedStateTrigger: true });
  const degradedResult = generateDegradedFixture({ count: 10, baseTimestamp: "2026-05-09T12:00:00Z", severityMix: true });
  const queueLeaseResult = generateQueueLeaseFixture({ itemCount: 10, leaseCount: 5, baseTimestamp: "2026-05-09T12:00:00Z", includeCompleted: true, includeFailed: true, includeCancelled: true, includeExpiredLeases: true, includeReleasedLeases: true });
  const trustResult = generateTrustConflictFixture({ conflictCount: 5, baseTimestamp: "2026-05-09T12:00:00Z" });
  const policyResult = generatePolicyDenyFixture({ denyCount: 5, baseTimestamp: "2026-05-09T12:00:00Z" });

  const stableStringify = (v: unknown) => deterministicSerialize(v) + "\n";

  const fixtures = [
    { name: "seeded-events.json", data: { seed: seededResult.seed, events: seededResult.events, manifestHash: seededResult.manifestHash } },
    { name: "replay-events.json", data: { events: replayResult.events, envelope: replayResult.envelope, counts: { governance: replayResult.governanceCount, diagnostics: replayResult.diagnosticsCount, degraded: replayResult.degradedCount, approvals: replayResult.approvalCount, degradedStateTriggers: replayResult.degradedStateTriggerCount } } },
    { name: "degraded-states.json", data: { states: degradedResult.states, events: degradedResult.events, envelope: degradedResult.envelope } },
    { name: "queue-lease.json", data: { items: queueLeaseResult.items, leases: queueLeaseResult.leases } },
    { name: "trust-conflicts.json", data: { events: trustResult.events, envelope: trustResult.envelope, conflictCount: trustResult.conflictCount } },
    { name: "policy-denies.json", data: { events: policyResult.events, envelope: policyResult.envelope, denyCount: policyResult.denyCount } },
    { name: "diagnostics.json", data: { events: seededResult.events.filter((e: { category: string }) => e.category === "diagnostics_snapshot" || e.category === "replay_metadata"), envelope: seededResult.envelope } },
    { name: "receipt.json", data: { events: seededResult.events.filter((e: { category: string }) => e.category === "receipt"), manifestHash: seededResult.manifestHash } },
    { name: "replay-envelope.json", data: { envelope_id: createHash("sha256").update(seedStr).digest("hex").slice(0, 12), version: "1.0.0", events: replayResult.envelope.events.map((e: { category: string; eventId: string; occurredAt: string }, i: number) => ({ type: i === 0 ? "start" : i === replayResult.envelope.events.length - 1 ? "end" : "event", category: e.category, eventId: e.eventId, timestamp: e.occurredAt })) } },
  ];

  // Compare hashes without writing
  let failed = false;
  const generatedFiles = fixtures.map((f) => f.name).sort();

  if (committedFiles.length !== generatedFiles.length) {
    console.error(`FAILED: Committed fixtures (${committedFiles.length}) != generated fixtures (${generatedFiles.length})`);
    process.exit(1);
  }

  for (const fixture of fixtures) {
    const generatedContent = stableStringify(fixture.data);
    const committedContent = beforeContents.get(fixture.name) ?? "";
    if (generatedContent !== committedContent) {
      console.error(`FAILED: ${fixture.name} does not match generator output`);
      failed = true;
    }
  }

  if (failed) {
    console.error("\nFix by running: npm run generate-fixtures");
    process.exit(1);
  }

  console.log(`OK: All ${committedFiles.length} fixtures match generator output (seed=${PINNED_SEED}).`);
}

main();
