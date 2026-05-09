// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach } from 'vitest';
import { ReceiptManager, InMemoryReceiptStore, ReceiptType } from './index';

describe('ReceiptManager', () => {
  let store: InMemoryReceiptStore;
  let manager: ReceiptManager;

  beforeEach(() => {
    store = new InMemoryReceiptStore();
    manager = new ReceiptManager(store);
  });

  describe('receipt creation', () => {
    it('should create a receipt with unique ID', () => {
      const receipt1 = manager.createReceipt(ReceiptType.QUEUE_ENQUEUE, 'exec-1', {});
      const receipt2 = manager.createReceipt(ReceiptType.QUEUE_ENQUEUE, 'exec-1', {});

      expect(receipt1.receiptId).not.toBe(receipt2.receiptId);
    });

    it('should store receipt data', () => {
      const receipt = manager.createReceipt(ReceiptType.QUEUE_ENQUEUE, 'exec-1', {
        queuePosition: 1,
      });

      expect(receipt.type).toBe(ReceiptType.QUEUE_ENQUEUE);
      expect(receipt.executionId).toBe('exec-1');
      expect(receipt.data.queuePosition).toBe(1);
    });

    it('should store optional signature', () => {
      const receipt = manager.createReceipt(
        ReceiptType.QUEUE_ENQUEUE,
        'exec-1',
        {},
        'sig-123',
      );

      expect(receipt.signature).toBe('sig-123');
    });
  });

  describe('queue receipts', () => {
    it('should record queue enqueue', () => {
      const receipt = manager.recordQueueEnqueue('exec-1', 1);

      expect(receipt.type).toBe(ReceiptType.QUEUE_ENQUEUE);
      expect(receipt.executionId).toBe('exec-1');
      expect(receipt.data.queuePosition).toBe(1);
    });

    it('should record queue dequeue', () => {
      const receipt = manager.recordQueueDequeue('exec-1', 1);

      expect(receipt.type).toBe(ReceiptType.QUEUE_DEQUEUE);
      expect(receipt.data.queuePosition).toBe(1);
    });

    it('should record queue status change', () => {
      const receipt = manager.recordQueueStatusChange(
        'exec-1',
        'pending',
        'running',
        'lease_acquired',
      );

      expect(receipt.type).toBe(ReceiptType.QUEUE_STATUS_CHANGE);
      expect(receipt.data.fromStatus).toBe('pending');
      expect(receipt.data.toStatus).toBe('running');
      expect(receipt.data.reason).toBe('lease_acquired');
    });
  });

  describe('lease receipts', () => {
    it('should record lease acquire', () => {
      const receipt = manager.recordLeaseAcquire(
        'exec-1',
        'lease-1',
        'owner-1',
        '2026-01-01T00:00:00Z',
      );

      expect(receipt.type).toBe(ReceiptType.LEASE_ACQUIRE);
      expect(receipt.data.leaseId).toBe('lease-1');
      expect(receipt.data.ownerId).toBe('owner-1');
    });

    it('should record lease renew', () => {
      const receipt = manager.recordLeaseRenew(
        'exec-1',
        'lease-1',
        'owner-1',
        '2026-01-01T00:00:00Z',
        2,
      );

      expect(receipt.type).toBe(ReceiptType.LEASE_RENEW);
      expect(receipt.data.renewalCount).toBe(2);
    });

    it('should record lease release', () => {
      const receipt = manager.recordLeaseRelease('exec-1', 'lease-1', 'owner-1');

      expect(receipt.type).toBe(ReceiptType.LEASE_RELEASE);
    });

    it('should record lease expire', () => {
      const receipt = manager.recordLeaseExpire('exec-1', 'lease-1', 'owner-1');

      expect(receipt.type).toBe(ReceiptType.LEASE_EXPIRE);
    });
  });

  describe('ownership receipts', () => {
    it('should record ownership acquire', () => {
      const receipt = manager.recordOwnershipAcquire(
        'exec-1',
        'owner-1',
        'lease-1',
      );

      expect(receipt.type).toBe(ReceiptType.OWNERSHIP_ACQUIRE);
      expect(receipt.data.ownerId).toBe('owner-1');
      expect(receipt.data.leaseId).toBe('lease-1');
    });

    it('should record ownership release', () => {
      const receipt = manager.recordOwnershipRelease(
        'exec-1',
        'owner-1',
        'completed',
      );

      expect(receipt.type).toBe(ReceiptType.OWNERSHIP_RELEASE);
      expect(receipt.data.reason).toBe('completed');
    });

    it('should record ownership transfer', () => {
      const receipt = manager.recordOwnershipTransfer(
        'exec-1',
        'owner-1',
        'owner-2',
        'lease-1',
        'lease_expired',
      );

      expect(receipt.type).toBe(ReceiptType.OWNERSHIP_TRANSFER);
      expect(receipt.data.fromOwnerId).toBe('owner-1');
      expect(receipt.data.toOwnerId).toBe('owner-2');
    });
  });

  describe('cancellation receipts', () => {
    it('should record cancellation request', () => {
      const receipt = manager.recordCancellationRequest(
        'exec-1',
        'cancel-1',
        'user-1',
      );

      expect(receipt.type).toBe(ReceiptType.CANCELLATION_REQUEST);
      expect(receipt.data.requestedBy).toBe('user-1');
    });

    it('should record cancellation acknowledge', () => {
      const receipt = manager.recordCancellationAcknowledge(
        'exec-1',
        'cancel-1',
        'operator-1',
      );

      expect(receipt.type).toBe(ReceiptType.CANCELLATION_ACKNOWLEDGE);
      expect(receipt.data.acknowledgedBy).toBe('operator-1');
    });

    it('should record cancellation deny', () => {
      const receipt = manager.recordCancellationDeny(
        'exec-1',
        'cancel-1',
        'operator-1',
        'not_applicable',
      );

      expect(receipt.type).toBe(ReceiptType.CANCELLATION_DENY);
      expect(receipt.data.deniedReason).toBe('not_applicable');
    });
  });

  describe('idempotency receipts', () => {
    it('should record idempotency check', () => {
      const receipt = manager.recordIdempotencyCheck('exec-1', 'key-1', true);

      expect(receipt.type).toBe(ReceiptType.IDEMPOTENCY_CHECK);
      expect(receipt.data.isNew).toBe(true);
    });

    it('should record idempotency duplicate', () => {
      const receipt = manager.recordIdempotencyDuplicate(
        'exec-2',
        'key-1',
        'exec-1',
      );

      expect(receipt.type).toBe(ReceiptType.IDEMPOTENCY_DUPLICATE);
      expect(receipt.data.originalExecutionId).toBe('exec-1');
    });
  });

  describe('execution history', () => {
    it('should return receipts ordered by timestamp', () => {
      manager.createReceipt(ReceiptType.QUEUE_ENQUEUE, 'exec-1', {});
      manager.createReceipt(ReceiptType.LEASE_ACQUIRE, 'exec-1', {});
      manager.createReceipt(ReceiptType.CANCELLATION_REQUEST, 'exec-1', {});

      const history = manager.getExecutionHistory('exec-1');

      expect(history).toHaveLength(3);
      expect(history[0].type).toBe(ReceiptType.QUEUE_ENQUEUE);
      expect(history[1].type).toBe(ReceiptType.LEASE_ACQUIRE);
      expect(history[2].type).toBe(ReceiptType.CANCELLATION_REQUEST);
    });

    it('should return empty history for unknown execution', () => {
      const history = manager.getExecutionHistory('non-existent');
      expect(history).toHaveLength(0);
    });
  });

  describe('receipts by type', () => {
    it('should filter receipts by type', () => {
      manager.createReceipt(ReceiptType.QUEUE_ENQUEUE, 'exec-1', {});
      manager.createReceipt(ReceiptType.LEASE_ACQUIRE, 'exec-1', {});
      manager.createReceipt(ReceiptType.QUEUE_ENQUEUE, 'exec-2', {});

      const queueReceipts = manager.getReceiptsByType(ReceiptType.QUEUE_ENQUEUE);
      expect(queueReceipts).toHaveLength(2);
    });
  });
});
