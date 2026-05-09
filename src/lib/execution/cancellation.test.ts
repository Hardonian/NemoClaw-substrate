// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CancellationManager,
  ExecutionCancellation,
  CancellationStatus,
  QueueStatus,
  QueueReasonCode,
} from './index';

function createTestCancellation(overrides?: Partial<ExecutionCancellation>): ExecutionCancellation {
  return {
    id: 'cancel-1',
    executionId: 'exec-1',
    requestedBy: 'user-1',
    requestedAt: new Date().toISOString(),
    status: CancellationStatus.REQUESTED,
    ...overrides,
  };
}

describe('CancellationManager', () => {
  let store: any;
  let manager: CancellationManager;

  beforeEach(() => {
    const cancellations = new Map<string, ExecutionCancellation>();
    const byExecutionId = new Map<string, ExecutionCancellation>();
    store = {
      get: (id: string) => cancellations.get(id),
      set: (c: ExecutionCancellation) => {
        cancellations.set(c.id, c);
        byExecutionId.set(c.executionId, c);
      },
      delete: (id: string) => {
        cancellations.delete(id);
        const c = byExecutionId.get('exec-1');
        if (c && c.id === id) {
          byExecutionId.delete('exec-1');
        }
      },
      getAll: () => Array.from(cancellations.values()),
      getByExecutionId: (executionId: string) => byExecutionId.get(executionId),
    };
    manager = new CancellationManager(store);
  });

  describe('cancellation request', () => {
    it('should create a cancellation request', () => {
      const cancellation = manager.request('exec-1', 'user-1');

      expect(cancellation.status).toBe(CancellationStatus.REQUESTED);
      expect(cancellation.executionId).toBe('exec-1');
      expect(cancellation.requestedBy).toBe('user-1');
    });

    it('should return existing request if one already exists', () => {
      const first = manager.request('exec-1', 'user-1');
      const second = manager.request('exec-1', 'user-2');

      expect(first.id).toBe(second.id);
    });
  });

  describe('cancellation acknowledgement', () => {
    it('should acknowledge a pending cancellation', () => {
      const cancellation = manager.request('exec-1', 'user-1');

      const result = manager.acknowledge(cancellation.id, 'operator-1');

      expect(result.success).toBe(true);
      expect(result.cancellation?.status).toBe(CancellationStatus.ACKNOWLEDGED);
      expect(result.cancellation?.acknowledgedBy).toBe('operator-1');
    });

    it('should reject acknowledgement of non-existent cancellation', () => {
      const result = manager.acknowledge('non-existent', 'operator-1');

      expect(result.success).toBe(false);
    });

    it('should reject acknowledgement of already acknowledged cancellation', () => {
      const cancellation = manager.request('exec-1', 'user-1');
      manager.acknowledge(cancellation.id, 'operator-1');

      const result = manager.acknowledge(cancellation.id, 'operator-2');

      expect(result.success).toBe(false);
    });
  });

  describe('cancellation denial', () => {
    it('should deny a pending cancellation', () => {
      const cancellation = manager.request('exec-1', 'user-1');

      const result = manager.deny(cancellation.id, 'operator-1', QueueReasonCode.APPROVAL_DENIED);

      expect(result.success).toBe(true);
      expect(result.cancellation?.status).toBe(CancellationStatus.DENIED);
      expect(result.cancellation?.deniedReason).toBe(QueueReasonCode.APPROVAL_DENIED);
    });

    it('should reject denial of already denied cancellation', () => {
      const cancellation = manager.request('exec-1', 'user-1');
      manager.deny(cancellation.id, 'operator-1', QueueReasonCode.APPROVAL_DENIED);

      const result = manager.deny(cancellation.id, 'operator-2', QueueReasonCode.APPROVAL_DENIED);

      expect(result.success).toBe(false);
    });
  });

  describe('cancellation expiry', () => {
    it('should expire a pending cancellation', () => {
      const cancellation = manager.request('exec-1', 'user-1');

      const result = manager.expire(cancellation.id);

      expect(result.success).toBe(true);
      expect(result.cancellation?.status).toBe(CancellationStatus.EXPIRED);
    });

    it('should detect expired cancellations by time', () => {
      const cancellation = manager.request(
        'exec-1',
        'user-1',
        new Date(Date.now() - 1000).toISOString(),
      );

      const expired = manager.getExpiredCancellations(new Date());

      expect(expired).toHaveLength(1);
      expect(expired[0].id).toBe(cancellation.id);
    });

    it('should not detect non-expired cancellations', () => {
      manager.request(
        'exec-1',
        'user-1',
        new Date(Date.now() + 60000).toISOString(),
      );

      const expired = manager.getExpiredCancellations(new Date());

      expect(expired).toHaveLength(0);
    });

    it('should not detect cancellations without expiry time', () => {
      manager.request('exec-1', 'user-1');

      const expired = manager.getExpiredCancellations(new Date());

      expect(expired).toHaveLength(0);
    });
  });

  describe('cancellation lineage', () => {
    it('should track full cancellation lifecycle', () => {
      const cancellation = manager.request('exec-1', 'user-1');
      expect(cancellation.status).toBe(CancellationStatus.REQUESTED);

      const ackResult = manager.acknowledge(cancellation.id, 'operator-1');
      expect(ackResult.success).toBe(true);
      expect(ackResult.cancellation?.status).toBe(CancellationStatus.ACKNOWLEDGED);

      const record = manager.getCancellation(cancellation.id);
      expect(record?.requestedAt).toBeDefined();
      expect(record?.acknowledgedAt).toBeDefined();
    });

    it('should provide execution-level cancellation lookup', () => {
      manager.request('exec-1', 'user-1');

      const found = manager.getCancellationForExecution('exec-1');
      expect(found).toBeDefined();
      expect(found?.executionId).toBe('exec-1');
    });
  });

  describe('shouldCancelExecution', () => {
    it('should return true for acknowledged cancellation on running execution', () => {
      manager.request('exec-1', 'user-1');
      const cancellation = store.getByExecutionId('exec-1');
      manager.acknowledge(cancellation.id, 'operator-1');

      const shouldCancel = manager.shouldCancelExecution('exec-1', QueueStatus.RUNNING);
      expect(shouldCancel).toBe(true);
    });

    it('should return false for non-acknowledged cancellation', () => {
      manager.request('exec-1', 'user-1');

      const shouldCancel = manager.shouldCancelExecution('exec-1', QueueStatus.RUNNING);
      expect(shouldCancel).toBe(false);
    });

    it('should return false for completed execution', () => {
      manager.request('exec-1', 'user-1');
      const cancellation = store.getByExecutionId('exec-1');
      manager.acknowledge(cancellation.id, 'operator-1');

      const shouldCancel = manager.shouldCancelExecution('exec-1', QueueStatus.COMPLETED);
      expect(shouldCancel).toBe(false);
    });

    it('should return false for failed execution', () => {
      manager.request('exec-1', 'user-1');
      const cancellation = store.getByExecutionId('exec-1');
      manager.acknowledge(cancellation.id, 'operator-1');

      const shouldCancel = manager.shouldCancelExecution('exec-1', QueueStatus.FAILED);
      expect(shouldCancel).toBe(false);
    });

    it('should return false for already cancelled execution', () => {
      manager.request('exec-1', 'user-1');
      const cancellation = store.getByExecutionId('exec-1');
      manager.acknowledge(cancellation.id, 'operator-1');

      const shouldCancel = manager.shouldCancelExecution('exec-1', QueueStatus.CANCELLED);
      expect(shouldCancel).toBe(false);
    });

    it('should return false when no cancellation exists', () => {
      const shouldCancel = manager.shouldCancelExecution('exec-1', QueueStatus.RUNNING);
      expect(shouldCancel).toBe(false);
    });
  });
});
