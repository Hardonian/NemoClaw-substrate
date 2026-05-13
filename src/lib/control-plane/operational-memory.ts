// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import * as fs from "fs";
import * as path from "path";
import { deterministicSerialize } from "./serde";
import type { ExecutionApproval, ExecutionAuthorizationResult, ExecutionPlan } from "./execution-plans";
import type { DegradedState, ExecutionReceipt, PolicyDecision, SchedulingDecision } from "./types";
import { redactSecurityPayload } from "../security/security-policy";

export type OperationalEventCategory =
  | "receipt"
  | "policy_outcome"
  | "degraded_state_trigger"
  | "degraded_state"
  | "scheduler_outcome"
  | "operator_override"
  | "runtime_action"
  | "telemetry_probe_started"
  | "telemetry_probe_succeeded"
  | "telemetry_probe_failed"
  | "telemetry_parse_succeeded"
  | "telemetry_parse_partial"
  | "telemetry_parse_failed"
  | "telemetry_unavailable"
  | "telemetry_stale"
  | "telemetry_conflict_detected"
  | "telemetry_registry_update_applied"
  | "telemetry_registry_update_skipped"
  | "worker_identity_observed"
  | "capability_claim_recorded"
  | "capability_attestation_observed"
  | "capability_attestation_conflict"
  | "worker_trust_elevated"
  | "worker_trust_denied"
  | "worker_trust_revoked"
  | "worker_attestation_expired"
  | "execution_plan_created"
  | "execution_plan_blocked"
  | "execution_plan_cancelled"
  | "execution_plan_phase_transition"
  | "execution_approval_requested"
  | "execution_plan_approved"
  | "execution_plan_rejected"
  | "execution_plan_revoked"
  | "execution_plan_expired"
  | "execution_authorization_granted"
  | "execution_authorization_denied"
  | "execution_policy_snapshot_recorded"
  | "execution_trust_snapshot_recorded"
  | "execution_replay_validation_succeeded"
  | "execution_replay_validation_failed"
  | "queue_item_queued"
  | "queue_item_leased"
  | "queue_item_expired"
  | "queue_conflict_detected"
  | "lease_acquired"
  | "lease_expired"
  | "lease_revoked"
  | "lease_conflict_detected"
  | "execution_started"
  | "execution_completed"
  | "execution_failed"
  | "execution_cancelled"
  | "execution_blocked"
  | "proofpack_generated"
  | "proofpack_validation_failed"
  | "diagnostics_snapshot"
  | "replay_metadata";

export interface OperationalEvent {
  eventId: string;
  occurredAt: string;
  sequence: number;
  category: OperationalEventCategory;
  source: string;
  provenance: { requestId?: string; receiptId?: string; sandboxName?: string; actor?: string };
  replayRef?: { lineage: string[]; replayVersion: string };
  payload: Record<string, unknown>;
}

export interface OperationalMemoryStore {
  append(event: OperationalEvent): void;
  list(): OperationalEvent[];
  clear(): void;
}

export class InMemoryOperationalStore implements OperationalMemoryStore {
  private readonly events: OperationalEvent[] = [];
  append(event: OperationalEvent): void { this.events.push(event); }
  list(): OperationalEvent[] { return [...this.events].sort((a, b) => a.sequence - b.sequence); }
  clear(): void { this.events.length = 0; }
}

export interface OperationalMemoryPersistenceAdapter {
  write(events: OperationalEvent[]): Promise<void>;
}

export interface FileOperationalMemoryStoreOptions {
  filePath: string;
  flushIntervalMs?: number;
  maxFileSizeBytes?: number;
  onWarn?: (message: string) => void;
}

export class FileOperationalMemoryStore implements OperationalMemoryStore, OperationalMemoryPersistenceAdapter {
  private readonly events: OperationalEvent[] = [];
  private readonly filePath: string;
  private readonly flushIntervalMs: number;
  private readonly maxFileSizeBytes: number;
  private readonly onWarn: (message: string) => void;
  private pendingWrites: OperationalEvent[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private nextSequence = 0;

  constructor(options: FileOperationalMemoryStoreOptions) {
    this.filePath = options.filePath;
    this.flushIntervalMs = options.flushIntervalMs ?? 100;
    this.maxFileSizeBytes = options.maxFileSizeBytes ?? 10 * 1024 * 1024;
    this.onWarn = options.onWarn ?? ((m: string) => process.stderr.write(`[operational-memory] ${m}\n`));
  }

  async initialize(): Promise<void> {
    this.events.length = 0;
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, "", { encoding: "utf8" });
      return;
    }
    const content = fs.readFileSync(this.filePath, "utf8");
    const lines = content.split("\n");
    let maxSeq = -1;
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line.length === 0) continue;
      try {
        const event = JSON.parse(line) as OperationalEvent;
        if (event && typeof event.sequence === "number" && event.eventId && event.category) {
          this.events.push(event);
          if (event.sequence > maxSeq) maxSeq = event.sequence;
        } else {
          this.onWarn(`Skipping malformed entry: missing required fields`);
        }
      } catch {
        this.onWarn(`Skipping malformed JSONL line: ${line.slice(0, 80)}...`);
      }
    }
    this.nextSequence = maxSeq + 1;
    this.events.sort((a, b) => a.sequence - b.sequence);
  }

  append(event: OperationalEvent): void {
    this.events.push(event);
    this.pendingWrites.push(event);
    if (this.pendingWrites.length >= 1) {
      this.scheduleFlush();
    }
  }

  list(): OperationalEvent[] {
    return [...this.events].sort((a, b) => a.sequence - b.sequence);
  }

  clear(): void {
    this.events.length = 0;
    this.pendingWrites.length = 0;
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, "", { encoding: "utf8" });
    }
  }

  async flush(): Promise<void> {
    if (this.pendingWrites.length === 0) return;
    const toWrite = [...this.pendingWrites];
    this.pendingWrites.length = 0;
    const serialized = toWrite.map((e) => deterministicSerialize(e)).join("\n") + "\n";
    const tmpPath = this.filePath + ".tmp";
    fs.appendFileSync(this.filePath, serialized, { encoding: "utf8" });
    const size = fs.statSync(this.filePath).size;
    if (size > this.maxFileSizeBytes) {
      await this.compact();
    }
  }

  async write(events: OperationalEvent[]): Promise<void> {
    for (const event of events) {
      this.append(event);
    }
    await this.flush();
  }

  async compact(): Promise<void> {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
    const snapshot = this.list();
    if (snapshot.length === 0) {
      fs.writeFileSync(this.filePath, "", { encoding: "utf8" });
      return;
    }
    const tmpPath = this.filePath + ".tmp";
    const serialized = snapshot.map((e) => deterministicSerialize(e)).join("\n") + "\n";
    fs.writeFileSync(tmpPath, serialized, { encoding: "utf8" });
    fs.renameSync(tmpPath, this.filePath);
  }

  get size(): number {
    return this.events.length;
  }

  get currentSequence(): number {
    return this.nextSequence;
  }

  nextSeq(): number {
    return this.nextSequence++;
  }

  private scheduleFlush(): void {
    if (this.flushTimer !== null) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flush().catch(() => {});
    }, this.flushIntervalMs);
  }
}

export class OperationalMemoryLog {
  private sequence = 0;
  constructor(private readonly store: OperationalMemoryStore = new InMemoryOperationalStore()) {}

  append(input: Omit<OperationalEvent, "eventId" | "sequence">): OperationalEvent {
    const sequence = this.sequence++;
    const stable = { ...input, payload: redactSecurityPayload(input.payload), sequence };
    const eventId = `op-${Buffer.from(deterministicSerialize(stable)).toString("base64url").slice(0, 20)}`;
    const event: OperationalEvent = { ...stable, eventId };
    this.store.append(event);
    return event;
  }

  list(): OperationalEvent[] { return this.store.list(); }
}

export function createOperationalMemoryLog(store?: OperationalMemoryStore): OperationalMemoryLog {
  return new OperationalMemoryLog(store);
}

export function buildEventsFromReceipt(receipt: ExecutionReceipt, source = "runtime-seam", existingLog?: OperationalMemoryLog): OperationalEvent[] {
  const log = existingLog ?? new OperationalMemoryLog();
  const out: OperationalEvent[] = [];
  out.push(log.append({ occurredAt: receipt.createdAt, category: "receipt", source, provenance: { requestId: receipt.requestId, receiptId: receipt.receiptId }, replayRef: receipt.provenance, payload: { receipt } }));
  if (receipt.policyDecision) {
    out.push(log.append({ occurredAt: receipt.createdAt, category: "policy_outcome", source, provenance: { requestId: receipt.requestId, receiptId: receipt.receiptId }, replayRef: receipt.provenance, payload: { policyDecision: receipt.policyDecision as PolicyDecision } }));
  }
  if (receipt.schedulingDecision) {
    out.push(log.append({ occurredAt: receipt.createdAt, category: "scheduler_outcome", source, provenance: { requestId: receipt.requestId, receiptId: receipt.receiptId }, replayRef: receipt.provenance, payload: { schedulingDecision: receipt.schedulingDecision as SchedulingDecision } }));
  }
  receipt.degradedEvents.forEach((d: DegradedState) => out.push(log.append({ occurredAt: d.timestamp, category: "degraded_state", source, provenance: { requestId: receipt.requestId, receiptId: receipt.receiptId }, replayRef: receipt.provenance, payload: { degraded: d } })));
  receipt.degradedStateTriggers.forEach((f) => out.push(log.append({ occurredAt: f.at, category: "degraded_state_trigger", source, provenance: { requestId: receipt.requestId, receiptId: receipt.receiptId }, replayRef: receipt.provenance, payload: { degraded_state_trigger: f } })));
  receipt.operatorOverrides.forEach((o) => out.push(log.append({ occurredAt: o.at, category: "operator_override", source, provenance: { requestId: receipt.requestId, receiptId: receipt.receiptId, actor: o.actor }, replayRef: receipt.provenance, payload: { override: o } })));
  return out;
}

export function buildExecutionPlanEvents(input: {
  plan: ExecutionPlan;
  source?: string;
  existingLog?: OperationalMemoryLog;
  approval?: ExecutionApproval;
  authorization?: ExecutionAuthorizationResult;
  replayValidation?: { ok: boolean; reasons: string[]; validatedAt: string };
}): OperationalEvent[] {
  const log = input.existingLog ?? new OperationalMemoryLog();
  const source = input.source ?? "execution-plans";
  const replayRef = input.plan.replayReference;
  const provenance = { requestId: input.plan.intent.requestId, actor: input.approval?.actor };
  const out: OperationalEvent[] = [];
  out.push(log.append({ occurredAt: input.plan.createdAt, category: "execution_plan_created", source, provenance, replayRef, payload: { planId: input.plan.planId, status: input.plan.status, intentHash: input.plan.intentHash, reasonCode: "plan_created" } }));
  out.push(log.append({ occurredAt: input.plan.policySnapshot.capturedAt, category: "execution_policy_snapshot_recorded", source, provenance, replayRef, payload: { planId: input.plan.planId, policySnapshotHash: input.plan.policySnapshotHash, reasonCode: input.plan.policySnapshot.policyReasonCode } }));
  out.push(log.append({ occurredAt: input.plan.trustSnapshot.capturedAt, category: "execution_trust_snapshot_recorded", source, provenance, replayRef, payload: { planId: input.plan.planId, trustSnapshotHash: input.plan.trustSnapshotHash, reasonCode: input.plan.trustSnapshot.workerTrustReasonCodes[0] ?? "trust_snapshot_recorded" } }));
  for (const transition of input.plan.transitions) {
    out.push(log.append({ occurredAt: transition.at, category: "execution_plan_phase_transition", source, provenance, replayRef, payload: { planId: input.plan.planId, phase: transition.phase, status: transition.status, reasonCode: transition.reasonCode, note: transition.note } }));
  }
  if (input.approval) {
    const category =
      input.approval.state === "approved"
        ? "execution_plan_approved"
        : input.approval.state === "rejected"
          ? "execution_plan_rejected"
          : input.approval.state === "revoked"
            ? "execution_plan_revoked"
            : input.approval.state === "expired"
              ? "execution_plan_expired"
              : "execution_approval_requested";
    out.push(log.append({ occurredAt: input.approval.decidedAt, category, source, provenance, replayRef, payload: { planId: input.plan.planId, approvalId: input.approval.approvalId, approvalState: input.approval.state, reasonCode: input.approval.reasonCode } }));
  }
  if (input.authorization) {
    out.push(log.append({ occurredAt: input.authorization.evaluatedAt, category: input.authorization.granted ? "execution_authorization_granted" : "execution_authorization_denied", source, provenance, replayRef, payload: { planId: input.plan.planId, authorizationLineageId: input.authorization.authorizationLineageId, reasonCode: input.authorization.reasonCodes[0] ?? "authorization_granted", reasonCodes: input.authorization.reasonCodes } }));
  }
  if (input.replayValidation) {
    out.push(log.append({ occurredAt: input.replayValidation.validatedAt, category: input.replayValidation.ok ? "execution_replay_validation_succeeded" : "execution_replay_validation_failed", source, provenance, replayRef, payload: { planId: input.plan.planId, reasonCode: input.replayValidation.reasons[0] ?? "authorization_granted", reasons: input.replayValidation.reasons } }));
  }
  return out;
}
