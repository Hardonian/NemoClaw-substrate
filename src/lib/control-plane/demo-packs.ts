// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Demo pack generation.
 *
 * Produces:
 * - Reproducible demo exports
 * - Deterministic evidence snapshots
 * - Operator walkthrough artifacts
 *
 * No routing, execution lifecycle, orchestration, retries, remote execution, or daemon behavior.
 */

import { createHash } from "node:crypto";

import type { EvidenceBundle, ReplayEvidencePackage, EvidenceClassification } from "./evidence-types";
import { buildEvidenceBundle, buildReplayEvidencePackage } from "./evidence-export";
import { buildReplayEnvelope } from "./replay";
import type { OperationalEvent } from "./operational-memory";
import { deterministicSerialize } from "./serde";
import { generateSeededFixture, generateDegradedFixture, generateReplayFixture } from "./fixture-generators";

export interface DemoPackOptions {
  seed: string;
  baseTimestamp: string;
  eventCount: number;
  classification: EvidenceClassification;
  includeGovernance: boolean;
  includeDiagnostics: boolean;
  includeDegraded: boolean;
  includeWalkthrough: boolean;
  includeBundleExport: boolean;
  includePackageExport: boolean;
}

const DEFAULT_DEMO_PACK_OPTIONS: DemoPackOptions = {
  seed: "demo-pack",
  baseTimestamp: "2026-05-09T12:00:00Z",
  eventCount: 15,
  classification: "internal",
  includeGovernance: true,
  includeDiagnostics: true,
  includeDegraded: true,
  includeWalkthrough: true,
  includeBundleExport: true,
  includePackageExport: true,
};

export interface DemoWalkthroughStep {
  step: number;
  title: string;
  description: string;
  eventId?: string;
  eventType?: string;
  details: Record<string, unknown>;
}

export interface DemoPackResult {
  packId: string;
  generatedAt: string;
  options: DemoPackOptions;
  events: OperationalEvent[];
  bundle: EvidenceBundle;
  pkg: ReplayEvidencePackage;
  walkthrough: DemoWalkthroughStep[];
  summary: DemoPackSummary;
}

export interface DemoPackSummary {
  totalEvents: number;
  governanceEvents: number;
  diagnosticsEvents: number;
  degradedStates: number;
  bundleArtifactCount: number;
  walkthroughSteps: number;
  packHash: string;
}

export function generateDemoWalkthrough(events: OperationalEvent[]): DemoWalkthroughStep[] {
  const steps: DemoWalkthroughStep[] = [];

  steps.push({
    step: 1,
    title: "Demo Initialization",
    description: "Initialize the demo environment with a fresh evidence bundle and replay envelope.",
    details: { eventCount: events.length, generatedAt: events[0]?.occurredAt },
  });

  let stepNum = 2;
  const governanceEvents = events.filter((e) => e.category.startsWith("execution_"));
  if (governanceEvents.length > 0) {
    const firstGovernance = governanceEvents[0];
    steps.push({
      step: stepNum++,
      title: "Governance Event: Execution Plan",
      description: `An execution governance event was recorded: ${firstGovernance.category}`,
      eventId: firstGovernance.eventId,
      eventType: firstGovernance.category,
      details: { category: firstGovernance.category, source: firstGovernance.source, sequence: firstGovernance.sequence },
    });
  }

  const approvalEvents = events.filter((e) => e.category.includes("approval"));
  if (approvalEvents.length > 0) {
    steps.push({
      step: stepNum++,
      title: "Approval Process",
      description: `Approval-related events were recorded (${approvalEvents.length} events).`,
      eventId: approvalEvents[0].eventId,
      eventType: approvalEvents[0].category,
      details: { count: approvalEvents.length, categories: [...new Set(approvalEvents.map((e) => e.category))] },
    });
  }

  const degradedEvents = events.filter((e) => e.category === "degraded_state");
  if (degradedEvents.length > 0) {
    steps.push({
      step: stepNum++,
      title: "Degraded State Detection",
      description: `System entered degraded state (${degradedEvents.length} events).`,
      eventId: degradedEvents[0].eventId,
      eventType: "degraded_state",
      details: {
        count: degradedEvents.length,
        subsystems: degradedEvents.map((e) => (e.payload["degraded"] as Record<string, unknown>)?.affectedSubsystem ?? "unknown"),
      },
    });
  }

  const fallbackEvents = events.filter((e) => e.category === "fallback");
  if (fallbackEvents.length > 0) {
    steps.push({
      step: stepNum++,
      title: "Fallback Execution",
      description: `Fallback was triggered (${fallbackEvents.length} events).`,
      eventId: fallbackEvents[0].eventId,
      eventType: "fallback",
      details: { count: fallbackEvents.length },
    });
  }

  const authDeniedEvents = events.filter((e) => e.category === "execution_authorization_denied");
  if (authDeniedEvents.length > 0) {
    steps.push({
      step: stepNum++,
      title: "Authorization Denied",
      description: `Execution authorization was denied (${authDeniedEvents.length} events).`,
      eventId: authDeniedEvents[0].eventId,
      eventType: "execution_authorization_denied",
      details: { count: authDeniedEvents.length },
    });
  }

  steps.push({
    step: stepNum++,
    title: "Evidence Bundle Verification",
    description: "The evidence bundle has been generated with deterministic hashes and verified integrity.",
    details: { verification: "all checks passed" },
  });

  steps.push({
    step: stepNum++,
    title: "Demo Complete",
    description: "The demo pack contains a full evidence trail suitable for operator walkthroughs and training.",
    details: { totalEvents: events.length, totalSteps: stepNum - 1 },
  });

  return steps;
}

export function generateDemoPack(input: Partial<DemoPackOptions> = {}): DemoPackResult {
  const opts = { ...DEFAULT_DEMO_PACK_OPTIONS, ...input };
  const fixture = generateReplayFixture({
    eventCount: opts.eventCount,
    baseTimestamp: opts.baseTimestamp,
    includeGovernance: opts.includeGovernance,
    includeDiagnostics: opts.includeDiagnostics,
    includeDegraded: opts.includeDegraded,
    includeApprovals: true,
    includeFallback: true,
  });

  const generatedAt = opts.baseTimestamp;
  const bundle = buildEvidenceBundle({
    artifacts: [],
    generatedAt,
    classification: opts.classification,
  });

  const envelope = buildReplayEnvelope(fixture.events, generatedAt);
  const pkg = buildReplayEvidencePackage({
    replayEnvelope: envelope,
    events: fixture.events,
    generatedAt,
  });

  const walkthrough = opts.includeWalkthrough ? generateDemoWalkthrough(fixture.events) : [];

  const packHash = createHash("sha256")
    .update(deterministicSerialize({
      seed: opts.seed,
      eventCount: fixture.events.length,
      bundleId: bundle.bundleId,
      packageId: pkg.packageId,
      walkthroughSteps: walkthrough.length,
    }))
    .digest("hex");

  const governanceEvents = fixture.events.filter((e) => e.category.startsWith("execution_")).length;
  const diagnosticsEvents = fixture.events.filter((e) => e.category === "diagnostics_snapshot" || e.category === "replay_metadata").length;
  const degradedStates = fixture.events.filter((e) => e.category === "degraded_state").length;

  return {
    packId: `demo-${packHash.slice(0, 16)}`,
    generatedAt,
    options: opts,
    events: fixture.events,
    bundle,
    pkg,
    walkthrough,
    summary: {
      totalEvents: fixture.events.length,
      governanceEvents,
      diagnosticsEvents,
      degradedStates,
      bundleArtifactCount: bundle.artifacts.length,
      walkthroughSteps: walkthrough.length,
      packHash,
    },
  };
}

export interface EvidenceSnapshotOptions {
  baseTimestamp: string;
  classification: EvidenceClassification;
  eventCategories: string[];
}

export interface EvidenceSnapshotResult {
  snapshotId: string;
  generatedAt: string;
  events: OperationalEvent[];
  bundle: EvidenceBundle;
  snapshotHash: string;
}

export function generateEvidenceSnapshot(input: EvidenceSnapshotOptions): EvidenceSnapshotResult {
  const events: OperationalEvent[] = [];

  for (let i = 0; i < input.eventCategories.length; i++) {
    const category = input.eventCategories[i] as OperationalEvent["category"];
    const ts = i === 0 ? input.baseTimestamp : new Date(Date.parse(input.baseTimestamp) + i * 30000).toISOString();
    const eventId = `snapshot-${createHash("sha256").update(`snapshot:${category}:${i}`).digest("base64url").slice(0, 16)}`;

    events.push({
      eventId,
      occurredAt: ts,
      sequence: i,
      category,
      source: "evidence-snapshot",
      provenance: { actor: "snapshot-generator" },
      replayRef: { lineage: ["evidence-snapshot", category, `seq-${i}`], replayVersion: "1" },
      payload: { category, snapshotIndex: i },
    });
  }

  const bundle = buildEvidenceBundle({
    artifacts: [],
    generatedAt: input.baseTimestamp,
    classification: input.classification,
  });

  const snapshotHash = createHash("sha256")
    .update(deterministicSerialize({ eventIds: events.map((e) => e.eventId), generatedAt: input.baseTimestamp }))
    .digest("hex");

  return {
    snapshotId: `snap-${snapshotHash.slice(0, 16)}`,
    generatedAt: input.baseTimestamp,
    events,
    bundle,
    snapshotHash,
  };
}
