// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ExecutionQueue,
  QueueStatus,
  ExecutionQueueItem,
  QueueReasonCode,
  QueueDecision,
} from './index';
import { InMemoryGovernanceStore, GovernanceManager } from './governance';

function createTestQueueItem(overrides?: Partial<ExecutionQueueItem>): ExecutionQueueItem {
  return {
    id: 'test-item-1',
    executionId: 'exec-1',
    status: QueueStatus.PENDING,
    executionState: 'initialized' as any,
    priority: 1,
    payload: { test: true },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    retryCount: 0,
    maxRetries: 0,
    approvalRequired: false,
    ...overrides,
  };
}

describe('ExecutionQueue', () => {
  let store: any;
  let queue: ExecutionQueue;

  beforeEach(() => {
    const items = new Map<string, ExecutionQueueItem>();
    store = {
      get: (id: string) => items.get(id),
      set: (item: ExecutionQueueItem) => items.set(item.id, item),
      delete: (id: string) => items.delete(id),
      getAll: () => Array.from(items.values()),
    };
    queue = new ExecutionQueue(store);
  });

  describe('enqueue', () => {
    it('should enqueue a valid item', () => {
      const item = createTestQueueItem();
      const result = queue.enqueue(item);

      expect(result.allowed).toBe(true);
      expect(item.enqueuedAt).toBeDefined();
      expect(item.queuePosition).toBe(1);
    });

    it('should reject items not in PENDING status', () => {
      const item = createTestQueueItem({ status: QueueStatus.RUNNING });
      const result = queue.enqueue(item);

      expect(result.allowed).toBe(false);
      expect(result.reasonCode).toBe(QueueReasonCode.VALIDATION_FAILED);
    });

    it('should assign sequential queue positions', () => {
      const item1 = createTestQueueItem({ id: 'item-1', executionId: 'exec-1' });
      const item2 = createTestQueueItem({ id: 'item-2', executionId: 'exec-2' });

      queue.enqueue(item1);
      queue.enqueue(item2);

      expect(item1.queuePosition).toBe(1);
      expect(item2.queuePosition).toBe(2);
    });
  });

  describe('dequeue', () => {
    it('should return the first pending item', () => {
      const item1 = createTestQueueItem({ id: 'item-1', executionId: 'exec-1' });
      const item2 = createTestQueueItem({ id: 'item-2', executionId: 'exec-2' });

      queue.enqueue(item1);
      queue.enqueue(item2);

      const dequeued = queue.dequeue();
      expect(dequeued?.id).toBe('item-1');
    });

    it('should return undefined when queue is empty', () => {
      expect(queue.dequeue()).toBeUndefined();
    });

    it('should not return non-pending items', () => {
      const item = createTestQueueItem({ status: QueueStatus.RUNNING });
      store.set(item);

      expect(queue.dequeue()).toBeUndefined();
    });
  });

  describe('status transitions', () => {
    it('should transition from PENDING to RUNNING', () => {
      const item = createTestQueueItem();
      queue.enqueue(item);

      const result = queue.updateStatus(item.id, QueueStatus.RUNNING);
      expect(result.allowed).toBe(true);
      expect(item.status).toBe(QueueStatus.RUNNING);
      expect(item.startedAt).toBeDefined();
    });

    it('should transition from RUNNING to COMPLETED', () => {
      const item = createTestQueueItem();
      queue.enqueue(item);
      queue.updateStatus(item.id, QueueStatus.RUNNING);

      const result = queue.updateStatus(item.id, QueueStatus.COMPLETED);
      expect(result.allowed).toBe(true);
      expect(item.status).toBe(QueueStatus.COMPLETED);
      expect(item.completedAt).toBeDefined();
    });

    it('should transition from RUNNING to FAILED', () => {
      const item = createTestQueueItem();
      queue.enqueue(item);
      queue.updateStatus(item.id, QueueStatus.RUNNING);

      const result = queue.updateStatus(item.id, QueueStatus.FAILED);
      expect(result.allowed).toBe(true);
      expect(item.status).toBe(QueueStatus.FAILED);
    });

    it('should prevent transition from COMPLETED to any state', () => {
      const item = createTestQueueItem();
      queue.enqueue(item);
      queue.updateStatus(item.id, QueueStatus.RUNNING);
      queue.updateStatus(item.id, QueueStatus.COMPLETED);

      const result = queue.updateStatus(item.id, QueueStatus.RUNNING);
      expect(result.allowed).toBe(false);
    });

    it('should prevent transition from FAILED to any state', () => {
      const item = createTestQueueItem();
      queue.enqueue(item);
      queue.updateStatus(item.id, QueueStatus.RUNNING);
      queue.updateStatus(item.id, QueueStatus.FAILED);

      const result = queue.updateStatus(item.id, QueueStatus.RUNNING);
      expect(result.allowed).toBe(false);
    });

    it('should transition from PENDING to CANCELLED', () => {
      const item = createTestQueueItem();
      queue.enqueue(item);

      const result = queue.updateStatus(item.id, QueueStatus.CANCELLED);
      expect(result.allowed).toBe(true);
      expect(item.status).toBe(QueueStatus.CANCELLED);
      expect(item.completedAt).toBeDefined();
    });

    it('should reject transition to non-existent item', () => {
      const result = queue.updateStatus('non-existent', QueueStatus.RUNNING);
      expect(result.allowed).toBe(false);
      expect(result.reasonCode).toBe(QueueReasonCode.INTERNAL_ERROR);
    });

    it('should record reason code on status change', () => {
      const item = createTestQueueItem();
      queue.enqueue(item);

      queue.updateStatus(item.id, QueueStatus.RUNNING, QueueReasonCode.LEASE_ACQUIRED);
      expect(item.lastReason).toBe(QueueReasonCode.LEASE_ACQUIRED);
    });
  });

  describe('deterministic queue ordering', () => {
    it('should maintain FIFO order by queue position', () => {
      const items = [
        createTestQueueItem({ id: 'item-1', executionId: 'exec-1' }),
        createTestQueueItem({ id: 'item-2', executionId: 'exec-2' }),
        createTestQueueItem({ id: 'item-3', executionId: 'exec-3' }),
      ];

      for (const item of items) {
        queue.enqueue(item);
      }

      expect(queue.dequeue()?.id).toBe('item-1');
      expect(queue.dequeue()?.id).toBe('item-2');
      expect(queue.dequeue()?.id).toBe('item-3');
    });

    it('should skip completed/failed/cancelled items when dequeuing', () => {
      const item1 = createTestQueueItem({ id: 'item-1', executionId: 'exec-1' });
      const item2 = createTestQueueItem({ id: 'item-2', executionId: 'exec-2' });
      const item3 = createTestQueueItem({ id: 'item-3', executionId: 'exec-3' });

      queue.enqueue(item1);
      queue.enqueue(item2);
      queue.enqueue(item3);

      queue.updateStatus(item1.id, QueueStatus.RUNNING);
      queue.updateStatus(item1.id, QueueStatus.COMPLETED);

      const dequeued = queue.dequeue();
      expect(dequeued?.id).toBe('item-2');
    });
  });

  describe('queue length', () => {
    it('should return correct queue length', () => {
      expect(queue.getQueueLength()).toBe(0);

      queue.enqueue(createTestQueueItem({ id: 'item-1', executionId: 'exec-1' }));
      queue.enqueue(createTestQueueItem({ id: 'item-2', executionId: 'exec-2' }));

      expect(queue.getQueueLength()).toBe(2);
    });

    it('should not count non-pending items', () => {
      const item = createTestQueueItem();
      queue.enqueue(item);
      queue.updateStatus(item.id, QueueStatus.RUNNING);

      expect(queue.getQueueLength()).toBe(0);
    });
  });

  describe('clear', () => {
    it('should remove all items and reset position counter', () => {
      queue.enqueue(createTestQueueItem({ id: 'item-1', executionId: 'exec-1' }));
      queue.enqueue(createTestQueueItem({ id: 'item-2', executionId: 'exec-2' }));

      queue.clear();

      expect(queue.getQueueLength()).toBe(0);
      expect(queue.getItems()).toHaveLength(0);

      const newItem = createTestQueueItem({ id: 'item-3', executionId: 'exec-3' });
      queue.enqueue(newItem);
      expect(newItem.queuePosition).toBe(1);
    });
  });

  describe('governance integration', () => {
    it('should block items when governance fails', () => {
      const governanceStore = new InMemoryGovernanceStore();
      governanceStore.setDegradedState({
        isDegraded: true,
        reason: QueueReasonCode.SYSTEM_UNHEALTHY,
        since: new Date().toISOString(),
        affectedOperations: ['enqueue'],
      });

      const governance = new GovernanceManager(governanceStore);
      queue.addPredicate({
        name: 'degraded-check',
        evaluate: () => governance.checkDegradedState(),
      });

      const item = createTestQueueItem();
      const result = queue.enqueue(item);

      expect(result.allowed).toBe(false);
      expect(result.reasonCode).toBe(QueueReasonCode.SYSTEM_UNHEALTHY);
    });

    it('should allow items when governance passes', () => {
      const governanceStore = new InMemoryGovernanceStore();
      const governance = new GovernanceManager(governanceStore);

      queue.addPredicate({
        name: 'governance-check',
        evaluate: () => governance.evaluateAll({} as any),
      });

      const item = createTestQueueItem();
      const result = queue.enqueue(item);

      expect(result.allowed).toBe(true);
    });
  });

  describe('replay-safe queue validation', () => {
    it('should reject duplicate enqueue attempts', () => {
      const item = createTestQueueItem();
      const result1 = queue.enqueue(item);
      expect(result1.allowed).toBe(true);

      const result2 = queue.enqueue(item);
      expect(result2.allowed).toBe(false);
      expect(result2.reasonCode).toBe(QueueReasonCode.VALIDATION_FAILED);
    });

    it('should handle idempotent status updates', () => {
      const item = createTestQueueItem();
      queue.enqueue(item);

      const result1 = queue.updateStatus(item.id, QueueStatus.RUNNING);
      expect(result1.allowed).toBe(true);

      const result2 = queue.updateStatus(item.id, QueueStatus.RUNNING);
      expect(result2.allowed).toBe(false);
    });
  });

  describe('hidden retry prevention', () => {
    it('should not retry failed items automatically', () => {
      const item = createTestQueueItem();
      queue.enqueue(item);
      queue.updateStatus(item.id, QueueStatus.RUNNING);
      queue.updateStatus(item.id, QueueStatus.FAILED);

      expect(item.status).toBe(QueueStatus.FAILED);
      expect(item.completedAt).toBeDefined();
      expect(queue.getQueueLength()).toBe(0);
    });

    it('should require explicit status change for retries', () => {
      const item = createTestQueueItem();
      queue.enqueue(item);
      queue.updateStatus(item.id, QueueStatus.RUNNING);
      queue.updateStatus(item.id, QueueStatus.FAILED);

      const result = queue.updateStatus(item.id, QueueStatus.RUNNING);
      expect(result.allowed).toBe(false);
    });
  });

  describe('degraded state assertions', () => {
    it('should block operations in degraded mode', () => {
      const governanceStore = new InMemoryGovernanceStore();
      governanceStore.setDegradedState({
        isDegraded: true,
        reason: QueueReasonCode.DEGRADED_MODE,
        since: new Date().toISOString(),
        affectedOperations: ['enqueue', 'dequeue'],
      });

      const governance = new GovernanceManager(governanceStore);

      expect(governance.isOperationAllowed('enqueue')).toBe(false);
      expect(governance.isOperationAllowed('dequeue')).toBe(false);
      expect(governance.isOperationAllowed('status')).toBe(true);
    });

    it('should allow operations in healthy state', () => {
      const governanceStore = new InMemoryGovernanceStore();
      const governance = new GovernanceManager(governanceStore);

      expect(governance.isOperationAllowed('enqueue')).toBe(true);
      expect(governance.isOperationAllowed('dequeue')).toBe(true);
    });
  });
});
