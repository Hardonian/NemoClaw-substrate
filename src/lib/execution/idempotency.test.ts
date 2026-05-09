// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach } from 'vitest';
import { IdempotencyManager, IdempotencyRecord, IdempotencyStatus, QueueReasonCode } from './index';

function createTestRecord(overrides?: Partial<IdempotencyRecord>): IdempotencyRecord {
  return {
    idempotencyKey: 'key-1',
    executionId: 'exec-1',
    status: IdempotencyStatus.PENDING,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('IdempotencyManager', () => {
  let store: any;
  let manager: IdempotencyManager;

  beforeEach(() => {
    const records = new Map<string, IdempotencyRecord>();
    store = {
      get: (key: string) => records.get(key),
      set: (record: IdempotencyRecord) => records.set(record.idempotencyKey, record),
      delete: (key: string) => records.delete(key),
      getAll: () => Array.from(records.values()),
    };
    manager = new IdempotencyManager(store);
  });

  describe('duplicate execution rejection', () => {
    it('should reject duplicate completed execution', () => {
      manager.checkOrSet('key-1', 'exec-1');
      manager.complete('key-1', 'hash-1');

      const result = manager.checkOrSet('key-1', 'exec-2');

      expect(result.isNew).toBe(false);
      expect(result.reasonCode).toBe(QueueReasonCode.DUPLICATE_EXECUTION);
    });

    it('should reject duplicate pending execution', () => {
      manager.checkOrSet('key-1', 'exec-1');

      const result = manager.checkOrSet('key-1', 'exec-2');

      expect(result.isNew).toBe(false);
      expect(result.reasonCode).toBe(QueueReasonCode.IDEMPOTENCY_KEY_CONFLICT);
    });

    it('should allow first execution', () => {
      const result = manager.checkOrSet('key-1', 'exec-1');

      expect(result.isNew).toBe(true);
      expect(result.reasonCode).toBeUndefined();
    });
  });

  describe('replay-safe dedupe', () => {
    it('should allow same key after failed execution expires', () => {
      manager.checkOrSet('key-1', 'exec-1');
      manager.fail('key-1');

      const record = manager.getRecord('key-1');
      expect(record?.status).toBe(IdempotencyStatus.FAILED);
      expect(manager.isDuplicate('key-1')).toBe(true);
    });

    it('should mark records as non-duplicate when expired', () => {
      store.set(createTestRecord({ status: IdempotencyStatus.EXPIRED }));

      expect(manager.isDuplicate('key-1')).toBe(false);
    });
  });

  describe('deterministic execution identity', () => {
    it('should track execution ID with idempotency key', () => {
      manager.checkOrSet('key-1', 'exec-1');

      const record = manager.getRecord('key-1');
      expect(record?.executionId).toBe('exec-1');
    });

    it('should store completion hash for result verification', () => {
      manager.checkOrSet('key-1', 'exec-1');
      manager.complete('key-1', 'result-hash-123');

      const record = manager.getRecord('key-1');
      expect(record?.resultHash).toBe('result-hash-123');
      expect(record?.status).toBe(IdempotencyStatus.COMPLETED);
    });
  });

  describe('completion', () => {
    it('should mark pending record as completed', () => {
      manager.checkOrSet('key-1', 'exec-1');

      const result = manager.complete('key-1', 'hash-1');

      expect(result.success).toBe(true);
      const record = manager.getRecord('key-1');
      expect(record?.status).toBe(IdempotencyStatus.COMPLETED);
      expect(record?.completedAt).toBeDefined();
    });

    it('should reject completion of non-existent record', () => {
      const result = manager.complete('non-existent', 'hash-1');

      expect(result.success).toBe(false);
    });

    it('should reject double completion', () => {
      manager.checkOrSet('key-1', 'exec-1');
      manager.complete('key-1', 'hash-1');

      const result = manager.complete('key-1', 'hash-2');

      expect(result.success).toBe(false);
      expect(result.reasonCode).toBe(QueueReasonCode.DUPLICATE_EXECUTION);
    });
  });

  describe('failure', () => {
    it('should mark pending record as failed', () => {
      manager.checkOrSet('key-1', 'exec-1');

      const result = manager.fail('key-1');

      expect(result.success).toBe(true);
      const record = manager.getRecord('key-1');
      expect(record?.status).toBe(IdempotencyStatus.FAILED);
    });

    it('should not allow completion after failure', () => {
      manager.checkOrSet('key-1', 'exec-1');
      manager.fail('key-1');

      const result = manager.complete('key-1', 'hash-1');

      expect(result.success).toBe(false);
      expect(result.reasonCode).toBe(QueueReasonCode.DUPLICATE_EXECUTION);
    });
  });

  describe('stale record cleanup', () => {
    it('should expire stale pending records', () => {
      const oldRecord = createTestRecord({
        idempotencyKey: 'old-key',
        createdAt: new Date(Date.now() - 200000).toISOString(),
      });
      store.set(oldRecord);

      const expiredCount = manager.expireStaleRecords(100000);

      expect(expiredCount).toBe(1);
      expect(manager.getRecord('old-key')?.status).toBe(IdempotencyStatus.EXPIRED);
    });

    it('should not expire recent records', () => {
      manager.checkOrSet('key-1', 'exec-1');

      const expiredCount = manager.expireStaleRecords(100000);

      expect(expiredCount).toBe(0);
      expect(manager.getRecord('key-1')?.status).toBe(IdempotencyStatus.PENDING);
    });
  });
});
