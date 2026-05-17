// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Fixture generators for deterministic evidence, replay, and test scenarios.
 *
 * Produces:
 * - Deterministic seeded fixtures
 * - Replay fixtures
 * - Degraded-state fixtures
 * - Queue/lease fixtures
 * - Trust conflict fixtures
 * - Policy deny fixtures
 *
 * All fixtures use deterministic timestamps and seeded pseudo-random generation.
 * No routing, execution lifecycle, orchestration, retries, remote execution, or daemon behavior.
 */

import { createHash } from "node:crypto";

import type { OperationalEvent, OperationalEventCategory } from "./operational-memory";
import type { DegradedState } from "./types";
import type { ExecutionLease, ExecutionQueueItem } from "../execution/types";
import { QueueStatus, ExecutionState, LeaseStatus } from "../execution/types";
import { QueueReasonCode } from "../execution/reason-codes";
import { deterministicSerialize } from "./serde";
import { buildReplayEnvelope } from "./replay";
import type { ReplayEnvelope } from "./replay";

export interface FixtureSeed {
  seed: string;
  baseTimestamp: string;
  count: number;
}

export const DEFAULT_FIXTURE_SEED: FixtureSeed = {
  seed: "fixture-default",
  baseTimestamp: "2026-05-09T12:00:00Z",
  count: 5,
};

export interface SeededFixtureResult {
  seed: FixtureSeed;
  events: OperationalEvent[];
  envelope: ReplayEnvelope;
  manifestHash: string;
}

function seededRandom(seed: string, index: number): number {
  const hash = createHash("sha256").update(`${seed}:${index}`).digest("hex");
  return parseInt(hash.slice(0, 8), 16) / 0xffffffff;
}

function deterministicTimestamp(base: string, offsetSeconds: number): string {
  const baseMs = Date.parse(base);
  return new Date(baseMs + offsetSeconds * 1000).toISOString();
}

const CATEGORIES: OperationalEventCategory[] = [
  "receipt",
  "policy_outcome",
  "degraded_state_trigger",
  "degraded_state",
  "scheduler_outcome",
  "operator_override",
  "runtime_action",
  "execution_plan_created",
  "execution_plan_phase_transition",
  "execution_approval_requested",
  "execution_plan_approved",
  "execution_plan_rejected",
  "execution_authorization_granted",
  "execution_authorization_denied",
  "execution_policy_snapshot_recorded",
  "execution_trust_snapshot_recorded",
  "execution_replay_validation_succeeded",
  "execution_replay_validation_failed",
  "diagnostics_snapshot",
  "replay_metadata",
];

export function generateSeededFixture(input: Partial<FixtureSeed> = {}): SeededFixtureResult {
  const seed = { ...DEFAULT_FIXTURE_SEED, ...input };
  const events: OperationalEvent[] = [];

  for (let i = 0; i < seed.count; i++) {
    const category = CATEGORIES[Math.floor(seededRandom(seed.seed, i * 3) * CATEGORIES.length)];
    const ts = deterministicTimestamp(seed.baseTimestamp, i * 10);
    const requestId = `req-${createHash("sha256").update(`${seed.seed}:req:${i}`).digest("base64url").slice(0, 12)}`;
    const eventId = `op-${createHash("sha256").update(`${seed.seed}:event:${i}`).digest("base64url").slice(0, 16)}`;

    events.push({
      eventId,
      occurredAt: ts,
      sequence: i,
      category,
      source: "fixture-generator",
      provenance: { requestId, actor: "fixture" },
      replayRef: { lineage: ["fixture", seed.seed, `seq-${i}`], replayVersion: "1" },
      payload: { sequence: i, category, fixtureSeed: seed.seed, generatedIndex: i },
    });
  }

  const envelope = buildReplayEnvelope(events, seed.baseTimestamp);
  const manifestHash = createHash("sha256").update(deterministicSerialize({ seed: seed.seed, count: seed.count, eventIds: events.map((e) => e.eventId) })).digest("hex");

  return { seed, events, envelope, manifestHash };
}

export interface ReplayFixtureOptions {
  eventCount: number;
  baseTimestamp: string;
  includeGovernance: boolean;
  includeDiagnostics: boolean;
  includeDegraded: boolean;
  includeApprovals: boolean;
  includeDegradedStateTrigger: boolean;
}

const DEFAULT_REPLAY_OPTIONS: ReplayFixtureOptions = {
  eventCount: 20,
  baseTimestamp: "2026-05-09T12:00:00Z",
  includeGovernance: true,
  includeDiagnostics: true,
  includeDegraded: true,
  includeApprovals: true,
  includeDegradedStateTrigger: true,
};

export interface ReplayFixtureResult {
  events: OperationalEvent[];
  envelope: ReplayEnvelope;
  governanceCount: number;
  diagnosticsCount: number;
  degradedCount: number;
  approvalCount: number;
  degradedStateTriggerCount: number;
}

export function generateReplayFixture(input: Partial<ReplayFixtureOptions> = {}): ReplayFixtureResult {
  const opts = { ...DEFAULT_REPLAY_OPTIONS, ...input };
  const seed = `replay-${opts.baseTimestamp}`;
  const events: OperationalEvent[] = [];

  const governanceCategories: OperationalEventCategory[] = [
    "execution_plan_created",
    "execution_plan_approved",
    "execution_plan_rejected",
    "execution_authorization_granted",
    "execution_authorization_denied",
    "execution_policy_snapshot_recorded",
    "execution_trust_snapshot_recorded",
    "execution_replay_validation_succeeded",
    "execution_replay_validation_failed",
  ];
  const diagnosticsCategories: OperationalEventCategory[] = ["diagnostics_snapshot", "replay_metadata"];
  const degradedCategories: OperationalEventCategory[] = ["degraded_state"];
  const approvalCategories: OperationalEventCategory[] = [
    "execution_approval_requested",
    "execution_plan_approved",
    "execution_plan_rejected",
  ];
  const degradedStateTriggerCategories: OperationalEventCategory[] = ["degraded_state_trigger"];

  let seq = 0;
  for (let i = 0; i < opts.eventCount; i++) {
    const r = seededRandom(seed, i);
    let category: OperationalEventCategory = "receipt";

    if (opts.includeGovernance && r < 0.3) {
      category = governanceCategories[Math.floor(seededRandom(seed, i * 7 + 1) * governanceCategories.length)];
    } else if (opts.includeDiagnostics && r < 0.45) {
      category = diagnosticsCategories[Math.floor(seededRandom(seed, i * 7 + 2) * diagnosticsCategories.length)];
    } else if (opts.includeDegraded && r < 0.55) {
      category = degradedCategories[0];
    } else if (opts.includeApprovals && r < 0.7) {
      category = approvalCategories[Math.floor(seededRandom(seed, i * 7 + 3) * approvalCategories.length)];
    } else if (opts.includeDegradedStateTrigger && r < 0.8) {
      category = degradedStateTriggerCategories[0];
    } else {
      category = CATEGORIES[Math.floor(seededRandom(seed, i * 7 + 4) * CATEGORIES.length)];
    }

    const ts = deterministicTimestamp(opts.baseTimestamp, i * 5);
    const eventId = `op-replay-${createHash("sha256").update(`${seed}:${i}`).digest("base64url").slice(0, 12)}`;
    const payload: Record<string, unknown> = { sequence: i, category };

    if (category === "degraded_state") {
      payload.degraded = generateDegradedState(i, opts.baseTimestamp);
    }
    if (category === "degraded_state_trigger") {
      payload.degraded_state_trigger = { attempt: i, reason: `fixture-degraded_state_trigger-${i}`, target: `node-fixture-${i}` };
    }
    if (category.includes("approval")) {
      payload.approvalId = `approval-fixture-${i}`;
    }
    if (category.includes("plan")) {
      payload.planId = `plan-fixture-${i}`;
    }

    events.push({
      eventId,
      occurredAt: ts,
      sequence: seq++,
      category,
      source: "replay-fixture",
      provenance: { requestId: `req-replay-${i}`, actor: "replay-fixture" },
      replayRef: { lineage: ["replay-fixture", seed, `seq-${i}`], replayVersion: "1" },
      payload,
    });
  }

  const envelope = buildReplayEnvelope(events, opts.baseTimestamp);
  const governanceCount = events.filter((e) => e.category.includes("execution_") || e.category.includes("authorization_")).length;
  const diagnosticsCount = events.filter((e) => diagnosticsCategories.includes(e.category)).length;
  const degradedCount = events.filter((e) => e.category === "degraded_state").length;
  const approvalCount = events.filter((e) => approvalCategories.includes(e.category)).length;
  const degradedStateTriggerCount = events.filter((e) => e.category === "degraded_state_trigger").length;

  return { events, envelope, governanceCount, diagnosticsCount, degradedCount, approvalCount, degradedStateTriggerCount };
}

export interface DegradedFixtureOptions {
  count: number;
  baseTimestamp: string;
  severityMix: boolean;
}

const DEFAULT_DEGRADED_OPTIONS: DegradedFixtureOptions = {
  count: 10,
  baseTimestamp: "2026-05-09T12:00:00Z",
  severityMix: true,
};

const DEGRADED_CATEGORIES: Array<{ category: DegradedState["category"]; reasonCode: DegradedState["reasonCode"]; subsystem: string }> = [
  { category: "constrained", reasonCode: "node_missing", subsystem: "compute-node" },
  { category: "degraded", reasonCode: "heartbeat_stale", subsystem: "heartbeat-monitor" },
  { category: "unavailable", reasonCode: "transport_unreachable", subsystem: "transport-layer" },
  { category: "partial_capability", reasonCode: "capability_missing", subsystem: "capability-registry" },
  { category: "approval_blocked", reasonCode: "approval_required", subsystem: "approval-gate" },
  { category: "stale", reasonCode: "unknown_error", subsystem: "cache-layer" },
  { category: "unreachable", reasonCode: "transport_unreachable", subsystem: "network-policy" },
  { category: "unknown", reasonCode: "unknown_error", subsystem: "unknown-subsystem" },
];

export function generateDegradedState(index: number, baseTimestamp: string): DegradedState {
  const r = seededRandom("degraded", index);
  const template = DEGRADED_CATEGORIES[Math.floor(r * DEGRADED_CATEGORIES.length)];
  const severities: DegradedState["severity"][] = ["info", "warning", "error", "critical"];
  const severity = severities[Math.floor(seededRandom("degraded-sev", index) * severities.length)];
  const ts = deterministicTimestamp(baseTimestamp, index * 30);

  return {
    category: template.category,
    reason: `fixture-degraded-${index}`,
    affectedSubsystem: template.subsystem,
    severity,
    reasonCode: template.reasonCode,
    explanation: `Fixture degraded state ${index}: ${template.subsystem} is ${template.category}`,
    sourceComponent: "fixture-generator",
    timestamp: ts,
    recoverySuggestion: `Recover ${template.subsystem} from fixture state ${index}`,
  };
}

export function generateDegradedFixture(input: Partial<DegradedFixtureOptions> = {}): { states: DegradedState[]; events: OperationalEvent[]; envelope: ReplayEnvelope } {
  const opts = { ...DEFAULT_DEGRADED_OPTIONS, ...input };
  const states: DegradedState[] = [];
  const events: OperationalEvent[] = [];

  for (let i = 0; i < opts.count; i++) {
    const state = generateDegradedState(i, opts.baseTimestamp);
    states.push(state);

    const eventId = `op-degraded-${createHash("sha256").update(`degraded-fixture:${i}`).digest("base64url").slice(0, 12)}`;
    const ts = deterministicTimestamp(opts.baseTimestamp, i * 30);

    events.push({
      eventId,
      occurredAt: ts,
      sequence: i,
      category: "degraded_state",
      source: "degraded-fixture",
      provenance: { actor: "degraded-fixture" },
      replayRef: { lineage: ["degraded-fixture", `seq-${i}`], replayVersion: "1" },
      payload: { degraded: state },
    });
  }

  const envelope = buildReplayEnvelope(events, opts.baseTimestamp);
  return { states, events, envelope };
}

export interface QueueLeaseFixtureOptions {
  itemCount: number;
  leaseCount: number;
  baseTimestamp: string;
  includeCompleted: boolean;
  includeFailed: boolean;
  includeCancelled: boolean;
  includeExpiredLeases: boolean;
  includeReleasedLeases: boolean;
}

const DEFAULT_QUEUE_LEASE_OPTIONS: QueueLeaseFixtureOptions = {
  itemCount: 10,
  leaseCount: 5,
  baseTimestamp: "2026-05-09T12:00:00Z",
  includeCompleted: true,
  includeFailed: true,
  includeCancelled: true,
  includeExpiredLeases: true,
  includeReleasedLeases: true,
};

export interface QueueLeaseFixtureResult {
  items: ExecutionQueueItem[];
  leases: ExecutionLease[];
}

export function generateQueueLeaseFixture(input: Partial<QueueLeaseFixtureOptions> = {}): QueueLeaseFixtureResult {
  const opts = { ...DEFAULT_QUEUE_LEASE_OPTIONS, ...input };
  const items: ExecutionQueueItem[] = [];
  const leases: ExecutionLease[] = [];

  for (let i = 0; i < opts.itemCount; i++) {
    const r = seededRandom("queue-lease", i);
    let status: QueueStatus = QueueStatus.PENDING;
    let executionState: ExecutionState = ExecutionState.INITIALIZED;

    if (r < 0.3) {
      status = QueueStatus.RUNNING;
      executionState = ExecutionState.EXECUTING;
    } else if (r < 0.45 && opts.includeCompleted) {
      status = QueueStatus.COMPLETED;
      executionState = ExecutionState.TERMINATED;
    } else if (r < 0.55 && opts.includeFailed) {
      status = QueueStatus.FAILED;
      executionState = ExecutionState.TERMINATED;
    } else if (r < 0.65 && opts.includeCancelled) {
      status = QueueStatus.CANCELLED;
      executionState = ExecutionState.TERMINATED;
    } else if (r < 0.75) {
      status = QueueStatus.QUEUED;
      executionState = ExecutionState.WAITING;
    } else if (r < 0.85) {
      status = QueueStatus.BLOCKED;
      executionState = ExecutionState.WAITING;
    }

    const ts = deterministicTimestamp(opts.baseTimestamp, i * 60);
    const itemId = `item-${createHash("sha256").update(`queue-fixture:${i}`).digest("base64url").slice(0, 12)}`;
    const executionId = `exec-${createHash("sha256").update(`exec-fixture:${i}`).digest("base64url").slice(0, 12)}`;

    items.push({
      id: itemId,
      executionId,
      idempotencyKey: `idemp-${i}`,
      status,
      executionState,
      priority: Math.floor(seededRandom("queue-priority", i) * 10),
      queuePosition: i + 1,
      payload: { fixtureIndex: i, category: status },
      metadata: { generated: "queue-lease-fixture", sequence: i },
      createdAt: ts,
      updatedAt: ts,
      enqueuedAt: status !== QueueStatus.PENDING ? ts : undefined,
      startedAt: status === QueueStatus.RUNNING ? ts : undefined,
      completedAt: [QueueStatus.COMPLETED, QueueStatus.FAILED, QueueStatus.CANCELLED].includes(status) ? ts : undefined,
      leaseId: i < opts.leaseCount ? `lease-fixture-${i}` : undefined,
      owner: i < opts.leaseCount ? `owner-fixture-${i}` : undefined,
      lastReason: QueueReasonCode.VALIDATION_FAILED,
      cancellationRequested: status === QueueStatus.CANCELLED,
      retryCount: status === QueueStatus.FAILED ? Math.floor(seededRandom("retry", i) * 3) : 0,
      maxRetries: 3,
      approvalRequired: seededRandom("approval", i) > 0.5,
      approvalGranted: seededRandom("approval-grant", i) > 0.6,
    });
  }

  for (let i = 0; i < opts.leaseCount; i++) {
    const r = seededRandom("lease-status", i);
    let status: LeaseStatus = LeaseStatus.ACTIVE;

    if (r < 0.3 && opts.includeExpiredLeases) {
      status = LeaseStatus.EXPIRED;
    } else if (r < 0.5 && opts.includeReleasedLeases) {
      status = LeaseStatus.RELEASED;
    } else if (r < 0.6) {
      status = LeaseStatus.STALE;
    }

    const ts = deterministicTimestamp(opts.baseTimestamp, i * 120);
    const leaseId = `lease-fixture-${i}`;
    const executionId = items[i]?.executionId ?? `exec-fixture-orphan-${i}`;

    leases.push({
      id: leaseId,
      executionId,
      ownerId: `owner-fixture-${i}`,
      acquiredAt: ts,
      expiresAt: deterministicTimestamp(opts.baseTimestamp, i * 120 + 300),
      renewedAt: status === LeaseStatus.ACTIVE ? deterministicTimestamp(opts.baseTimestamp, i * 120 + 60) : undefined,
      releasedAt: status === LeaseStatus.RELEASED ? ts : undefined,
      status,
      version: status === LeaseStatus.ACTIVE ? 1 : 2,
      metadata: { generated: "queue-lease-fixture", sequence: i },
    });
  }

  return { items, leases };
}

export interface TrustConflictFixtureOptions {
  conflictCount: number;
  baseTimestamp: string;
}

const DEFAULT_TRUST_CONFLICT_OPTIONS: TrustConflictFixtureOptions = {
  conflictCount: 5,
  baseTimestamp: "2026-05-09T12:00:00Z",
};

export interface TrustConflictFixtureResult {
  events: OperationalEvent[];
  envelope: ReplayEnvelope;
  conflictCount: number;
}

export function generateTrustConflictFixture(input: Partial<TrustConflictFixtureOptions> = {}): TrustConflictFixtureResult {
  const opts = { ...DEFAULT_TRUST_CONFLICT_OPTIONS, ...input };
  const events: OperationalEvent[] = [];

  const conflictTypes = ["attestation_conflict", "trust_denied", "trust_revoked", "attestation_expired"] as const;

  for (let i = 0; i < opts.conflictCount; i++) {
    const conflictType = conflictTypes[i % conflictTypes.length];
    const ts = deterministicTimestamp(opts.baseTimestamp, i * 45);
    const workerId = `worker-conflict-${i}`;
    const eventId = `op-trust-conflict-${createHash("sha256").update(`trust-fixture:${i}`).digest("base64url").slice(0, 12)}`;

    const category: OperationalEventCategory =
      conflictType === "attestation_conflict"
        ? "capability_attestation_conflict"
        : conflictType === "trust_denied"
          ? "worker_trust_denied"
          : conflictType === "trust_revoked"
            ? "worker_trust_revoked"
            : "worker_attestation_expired";

    events.push({
      eventId,
      occurredAt: ts,
      sequence: i,
      category,
      source: "trust-conflict-fixture",
      provenance: { actor: "trust-fixture" },
      replayRef: { lineage: ["trust-conflict-fixture", workerId, `seq-${i}`], replayVersion: "1" },
      payload: {
        workerId,
        conflictType,
        reasonCode: `trust_${conflictType}`,
        fixtureIndex: i,
      },
    });
  }

  const envelope = buildReplayEnvelope(events, opts.baseTimestamp);
  return { events, envelope, conflictCount: events.length };
}

export interface PolicyDenyFixtureOptions {
  denyCount: number;
  baseTimestamp: string;
}

const DEFAULT_POLICY_DENY_OPTIONS: PolicyDenyFixtureOptions = {
  denyCount: 5,
  baseTimestamp: "2026-05-09T12:00:00Z",
};

export interface PolicyDenyFixtureResult {
  events: OperationalEvent[];
  envelope: ReplayEnvelope;
  denyCount: number;
}

export function generatePolicyDenyFixture(input: Partial<PolicyDenyFixtureOptions> = {}): PolicyDenyFixtureResult {
  const opts = { ...DEFAULT_POLICY_DENY_OPTIONS, ...input };
  const events: OperationalEvent[] = [];

  const denyReasons = ["policy_denied", "approval_required", "insufficient_trust", "attestation_conflict", "execution_intent_mismatch"];

  for (let i = 0; i < opts.denyCount; i++) {
    const reason = denyReasons[i % denyReasons.length];
    const ts = deterministicTimestamp(opts.baseTimestamp, i * 30);
    const planId = `plan-deny-${i}`;
    const eventId = `op-policy-deny-${createHash("sha256").update(`policy-fixture:${i}`).digest("base64url").slice(0, 12)}`;

    events.push({
      eventId,
      occurredAt: ts,
      sequence: i,
      category: "execution_authorization_denied",
      source: "policy-deny-fixture",
      provenance: { actor: "policy-fixture" },
      replayRef: { lineage: ["policy-deny-fixture", planId, `seq-${i}`], replayVersion: "1" },
      payload: {
        planId,
        reasonCode: reason,
        fixtureIndex: i,
        policyVersion: "1",
      },
    });

    events.push({
      eventId: `${eventId}-plan`,
      occurredAt: ts,
      sequence: i + 0.5,
      category: "execution_plan_rejected",
      source: "policy-deny-fixture",
      provenance: { actor: "policy-fixture" },
      replayRef: { lineage: ["policy-deny-fixture", planId, `seq-${i}-plan`], replayVersion: "1" },
      payload: {
        planId,
        reasonCode: reason,
        fixtureIndex: i,
      },
    });
  }

  const envelope = buildReplayEnvelope(events, opts.baseTimestamp);
  return { events, envelope, denyCount: events.length / 2 };
}
