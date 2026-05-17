// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { ExecutionQueueItem, QueueStatus } from './types';
import { QueueReasonCode } from './reason-codes';
import { QueueDecision } from './queue-decision';

export interface QueuePredicate {
  name: string;
  evaluate: (item: ExecutionQueueItem) => QueueDecision;
}

export interface QueueStore {
  get(id: string): ExecutionQueueItem | undefined;
  set(item: ExecutionQueueItem): void;
  delete(id: string): void;
  getAll(): ExecutionQueueItem[];
}

export class ExecutionQueue {
  private store: QueueStore;
  private predicates: QueuePredicate[] = [];
  private nextPosition = 1;

  constructor(store: QueueStore) {
    this.store = store;
  }

  addPredicate(predicate: QueuePredicate): void {
    this.predicates.push(predicate);
  }

  enqueue(item: ExecutionQueueItem): QueueDecision {
    const existing = this.store.get(item.id);
    if (existing) {
      return QueueDecision.block(
        QueueReasonCode.VALIDATION_FAILED,
        `Item ${item.id} is already in the queue with status ${existing.status}`,
      );
    }

    if (item.status !== QueueStatus.PENDING) {
      return QueueDecision.block(
        QueueReasonCode.VALIDATION_FAILED,
        `Item must be PENDING, got ${item.status}`,
      );
    }

    for (const predicate of this.predicates) {
      const decision = predicate.evaluate(item);
      if (!decision.allowed) {
        return decision;
      }
    }

    item.enqueuedAt = new Date().toISOString();
    item.queuePosition = this.nextPosition++;
    this.store.set(item);

    return QueueDecision.allow('Item enqueued successfully');
  }

  dequeue(): ExecutionQueueItem | undefined {
    const items = this.store
      .getAll()
      .filter((i) => i.status === QueueStatus.PENDING)
      .sort((a, b) => (a.queuePosition ?? 0) - (b.queuePosition ?? 0));

    if (items.length === 0) {
      return undefined;
    }

    const item = items[0];
    this.store.delete(item.id);
    return item;
  }

  getItems(): ExecutionQueueItem[] {
    return this.store.getAll();
  }

  getItem(id: string): ExecutionQueueItem | undefined {
    return this.store.get(id);
  }

  updateStatus(
    id: string,
    status: QueueStatus,
    reason?: QueueReasonCode,
  ): QueueDecision {
    const item = this.store.get(id);
    if (!item) {
      return QueueDecision.block(
        QueueReasonCode.INTERNAL_ERROR,
        `Item ${id} not found`,
      );
    }

    const transition = this.validateTransition(item.status, status);
    if (!transition.valid) {
      return QueueDecision.block(
        reason ?? QueueReasonCode.VALIDATION_FAILED,
        transition.reason || "",
      );
    }

    item.status = status;
    item.updatedAt = new Date().toISOString();

    if (status === QueueStatus.RUNNING) {
      item.startedAt = new Date().toISOString();
    } else if (
      status === QueueStatus.COMPLETED ||
      status === QueueStatus.FAILED ||
      status === QueueStatus.CANCELLED
    ) {
      item.completedAt = new Date().toISOString();
    }

    if (reason) {
      item.lastReason = reason;
    }

    this.store.set(item);
    return QueueDecision.allow(`Status transitioned to ${status}`);
  }

  getQueueLength(): number {
    return this.store
      .getAll()
      .filter((i) => i.status === QueueStatus.PENDING).length;
  }

  clear(): void {
    for (const item of this.store.getAll()) {
      this.store.delete(item.id);
    }
    this.nextPosition = 1;
  }

  private validateTransition(
    from: QueueStatus,
    to: QueueStatus,
  ): { valid: boolean; reason?: string } {
    const validTransitions: Record<QueueStatus, QueueStatus[]> = {
      [QueueStatus.PENDING]: [QueueStatus.RUNNING, QueueStatus.CANCELLED],
      [QueueStatus.QUEUED]: [
        QueueStatus.PENDING,
        QueueStatus.RUNNING,
        QueueStatus.CANCELLED,
      ],
      [QueueStatus.RUNNING]: [
        QueueStatus.COMPLETED,
        QueueStatus.FAILED,
        QueueStatus.CANCELLED,
      ],
      [QueueStatus.COMPLETED]: [],
      [QueueStatus.FAILED]: [],
      [QueueStatus.CANCELLED]: [],
      [QueueStatus.BLOCKED]: [QueueStatus.PENDING, QueueStatus.CANCELLED],
    };

    const allowed = validTransitions[from] ?? [];
    if (!allowed.includes(to)) {
      return {
        valid: false,
        reason: `Invalid transition from ${from} to ${to}`,
      };
    }

    return { valid: true };
  }
}
