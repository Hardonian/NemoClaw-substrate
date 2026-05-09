// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { deterministicSerialize } from "./serde";
import type { DegradedState, ExecutionReceipt, PolicyDecision, SchedulingDecision } from "./types";

export type OperationalEventCategory =
  | "receipt"
  | "policy_outcome"
  | "fallback"
  | "degraded_state"
  | "scheduler_outcome"
  | "operator_override"
  | "runtime_action"
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

export class OperationalMemoryLog {
  private sequence = 0;
  constructor(private readonly store: OperationalMemoryStore = new InMemoryOperationalStore()) {}

  append(input: Omit<OperationalEvent, "eventId" | "sequence">): OperationalEvent {
    const sequence = this.sequence++;
    const stable = { ...input, sequence };
    const eventId = `op-${Buffer.from(deterministicSerialize(stable)).toString("base64url").slice(0, 20)}`;
    const event: OperationalEvent = { ...stable, eventId };
    this.store.append(event);
    return event;
  }

  list(): OperationalEvent[] { return this.store.list(); }
}

export function buildEventsFromReceipt(receipt: ExecutionReceipt, source = "runtime-seam"): OperationalEvent[] {
  const log = new OperationalMemoryLog();
  const out: OperationalEvent[] = [];
  out.push(log.append({ occurredAt: receipt.createdAt, category: "receipt", source, provenance: { requestId: receipt.requestId, receiptId: receipt.receiptId }, replayRef: receipt.provenance, payload: { receipt } }));
  if (receipt.policyDecision) {
    out.push(log.append({ occurredAt: receipt.createdAt, category: "policy_outcome", source, provenance: { requestId: receipt.requestId, receiptId: receipt.receiptId }, replayRef: receipt.provenance, payload: { policyDecision: receipt.policyDecision as PolicyDecision } }));
  }
  if (receipt.schedulingDecision) {
    out.push(log.append({ occurredAt: receipt.createdAt, category: "scheduler_outcome", source, provenance: { requestId: receipt.requestId, receiptId: receipt.receiptId }, replayRef: receipt.provenance, payload: { schedulingDecision: receipt.schedulingDecision as SchedulingDecision } }));
  }
  receipt.degradedEvents.forEach((d: DegradedState) => out.push(log.append({ occurredAt: d.timestamp, category: "degraded_state", source, provenance: { requestId: receipt.requestId, receiptId: receipt.receiptId }, replayRef: receipt.provenance, payload: { degraded: d } })));
  receipt.fallbackAttempts.forEach((f) => out.push(log.append({ occurredAt: f.at, category: "fallback", source, provenance: { requestId: receipt.requestId, receiptId: receipt.receiptId }, replayRef: receipt.provenance, payload: { fallback: f } })));
  receipt.operatorOverrides.forEach((o) => out.push(log.append({ occurredAt: o.at, category: "operator_override", source, provenance: { requestId: receipt.requestId, receiptId: receipt.receiptId, actor: o.actor }, replayRef: receipt.provenance, payload: { override: o } })));
  return out;
}
