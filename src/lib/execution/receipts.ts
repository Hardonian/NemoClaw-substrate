// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Deterministic receipts and events system.
 * Provides queue, lease, ownership, cancellation, and idempotency receipts.
 * All receipts are replay-visible and cryptographically signable.
 */

import { QueueReceipt, ReceiptType } from './types';

export interface ReceiptStore {
  add(receipt: QueueReceipt): void;
  getByExecutionId(executionId: string): QueueReceipt[];
  getByType(type: ReceiptType): QueueReceipt[];
  getAll(): QueueReceipt[];
}

export class ReceiptManager {
  private store: ReceiptStore;

  constructor(store: ReceiptStore) {
    this.store = store;
  }

  createReceipt(
    type: ReceiptType,
    executionId: string,
    data: Record<string, unknown>,
    signature?: string,
  ): QueueReceipt {
    const receipt: QueueReceipt = {
      receiptId: `receipt-${type}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type,
      executionId,
      timestamp: new Date().toISOString(),
      data,
      signature,
    };

    this.store.add(receipt);
    return receipt;
  }

  recordQueueEnqueue(
    executionId: string,
    queuePosition: number,
    signature?: string,
  ): QueueReceipt {
    return this.createReceipt(
      ReceiptType.QUEUE_ENQUEUE,
      executionId,
      { queuePosition },
      signature,
    );
  }

  recordQueueDequeue(
    executionId: string,
    queuePosition: number,
    signature?: string,
  ): QueueReceipt {
    return this.createReceipt(
      ReceiptType.QUEUE_DEQUEUE,
      executionId,
      { queuePosition },
      signature,
    );
  }

  recordQueueStatusChange(
    executionId: string,
    fromStatus: string,
    toStatus: string,
    reason?: string,
    signature?: string,
  ): QueueReceipt {
    return this.createReceipt(
      ReceiptType.QUEUE_STATUS_CHANGE,
      executionId,
      { fromStatus, toStatus, reason },
      signature,
    );
  }

  recordLeaseAcquire(
    executionId: string,
    leaseId: string,
    ownerId: string,
    expiresAt: string,
    signature?: string,
  ): QueueReceipt {
    return this.createReceipt(
      ReceiptType.LEASE_ACQUIRE,
      executionId,
      { leaseId, ownerId, expiresAt },
      signature,
    );
  }

  recordLeaseRenew(
    executionId: string,
    leaseId: string,
    ownerId: string,
    newExpiresAt: string,
    renewalCount: number,
    signature?: string,
  ): QueueReceipt {
    return this.createReceipt(
      ReceiptType.LEASE_RENEW,
      executionId,
      { leaseId, ownerId, newExpiresAt, renewalCount },
      signature,
    );
  }

  recordLeaseRelease(
    executionId: string,
    leaseId: string,
    ownerId: string,
    signature?: string,
  ): QueueReceipt {
    return this.createReceipt(
      ReceiptType.LEASE_RELEASE,
      executionId,
      { leaseId, ownerId },
      signature,
    );
  }

  recordLeaseExpire(
    executionId: string,
    leaseId: string,
    ownerId: string,
    signature?: string,
  ): QueueReceipt {
    return this.createReceipt(
      ReceiptType.LEASE_EXPIRE,
      executionId,
      { leaseId, ownerId },
      signature,
    );
  }

  recordOwnershipAcquire(
    executionId: string,
    ownerId: string,
    leaseId: string,
    signature?: string,
  ): QueueReceipt {
    return this.createReceipt(
      ReceiptType.OWNERSHIP_ACQUIRE,
      executionId,
      { ownerId, leaseId },
      signature,
    );
  }

  recordOwnershipRelease(
    executionId: string,
    ownerId: string,
    reason: string,
    signature?: string,
  ): QueueReceipt {
    return this.createReceipt(
      ReceiptType.OWNERSHIP_RELEASE,
      executionId,
      { ownerId, reason },
      signature,
    );
  }

  recordOwnershipTransfer(
    executionId: string,
    fromOwnerId: string,
    toOwnerId: string,
    leaseId: string,
    reason: string,
    signature?: string,
  ): QueueReceipt {
    return this.createReceipt(
      ReceiptType.OWNERSHIP_TRANSFER,
      executionId,
      { fromOwnerId, toOwnerId, leaseId, reason },
      signature,
    );
  }

  recordCancellationRequest(
    executionId: string,
    cancellationId: string,
    requestedBy: string,
    signature?: string,
  ): QueueReceipt {
    return this.createReceipt(
      ReceiptType.CANCELLATION_REQUEST,
      executionId,
      { cancellationId, requestedBy },
      signature,
    );
  }

  recordCancellationAcknowledge(
    executionId: string,
    cancellationId: string,
    acknowledgedBy: string,
    signature?: string,
  ): QueueReceipt {
    return this.createReceipt(
      ReceiptType.CANCELLATION_ACKNOWLEDGE,
      executionId,
      { cancellationId, acknowledgedBy },
      signature,
    );
  }

  recordCancellationDeny(
    executionId: string,
    cancellationId: string,
    deniedBy: string,
    deniedReason: string,
    signature?: string,
  ): QueueReceipt {
    return this.createReceipt(
      ReceiptType.CANCELLATION_DENY,
      executionId,
      { cancellationId, deniedBy, deniedReason },
      signature,
    );
  }

  recordIdempotencyCheck(
    executionId: string,
    idempotencyKey: string,
    isNew: boolean,
    signature?: string,
  ): QueueReceipt {
    return this.createReceipt(
      ReceiptType.IDEMPOTENCY_CHECK,
      executionId,
      { idempotencyKey, isNew },
      signature,
    );
  }

  recordIdempotencyDuplicate(
    executionId: string,
    idempotencyKey: string,
    originalExecutionId: string,
    signature?: string,
  ): QueueReceipt {
    return this.createReceipt(
      ReceiptType.IDEMPOTENCY_DUPLICATE,
      executionId,
      { idempotencyKey, originalExecutionId },
      signature,
    );
  }

  getExecutionHistory(executionId: string): QueueReceipt[] {
    return this.store
      .getByExecutionId(executionId)
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
  }

  getReceiptsByType(type: ReceiptType): QueueReceipt[] {
    return this.store.getByType(type);
  }

  getAllReceipts(): QueueReceipt[] {
    return this.store.getAll();
  }
}

export class InMemoryReceiptStore implements ReceiptStore {
  private receipts: QueueReceipt[] = [];

  add(receipt: QueueReceipt): void {
    this.receipts.push(receipt);
  }

  getByExecutionId(executionId: string): QueueReceipt[] {
    return this.receipts.filter((r) => r.executionId === executionId);
  }

  getByType(type: ReceiptType): QueueReceipt[] {
    return this.receipts.filter((r) => r.type === type);
  }

  getAll(): QueueReceipt[] {
    return this.receipts;
  }
}
