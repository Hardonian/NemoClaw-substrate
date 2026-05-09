// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Deterministic idempotency system.
 * Provides execution idempotency keys, duplicate execution rejection,
 * replay-safe deduplication, and deterministic execution identity.
 * No silent duplicates, no hidden retries.
 */

import { IdempotencyRecord, IdempotencyStatus } from './types';
import { QueueReasonCode } from './reason-codes';

export interface IdempotencyStore {
  get(key: string): IdempotencyRecord | undefined;
  set(record: IdempotencyRecord): void;
  delete(key: string): void;
  getAll(): IdempotencyRecord[];
}

export class IdempotencyManager {
  private store: IdempotencyStore;

  constructor(store: IdempotencyStore) {
    this.store = store;
  }

  checkOrSet(
    idempotencyKey: string,
    executionId: string,
  ): { isNew: boolean; existingRecord?: IdempotencyRecord; reasonCode?: QueueReasonCode; message: string } {
    const existing = this.store.get(idempotencyKey);

    if (existing) {
      if (existing.status === IdempotencyStatus.COMPLETED) {
        return {
          isNew: false,
          existingRecord: existing,
          reasonCode: QueueReasonCode.DUPLICATE_EXECUTION,
          message: `Execution already completed with idempotency key ${idempotencyKey}`,
        };
      }

      if (existing.status === IdempotencyStatus.PENDING) {
        return {
          isNew: false,
          existingRecord: existing,
          reasonCode: QueueReasonCode.IDEMPOTENCY_KEY_CONFLICT,
          message: `Idempotency key ${idempotencyKey} is already in use by pending execution ${existing.executionId}`,
        };
      }

      if (existing.status === IdempotencyStatus.FAILED) {
        return {
          isNew: false,
          existingRecord: existing,
          reasonCode: QueueReasonCode.IDEMPOTENCY_KEY_CONFLICT,
          message: `Idempotency key ${idempotencyKey} was used by failed execution ${existing.executionId}`,
        };
      }
    }

    const record: IdempotencyRecord = {
      idempotencyKey,
      executionId,
      status: IdempotencyStatus.PENDING,
      createdAt: new Date().toISOString(),
    };

    this.store.set(record);

    return {
      isNew: true,
      message: 'Idempotency key registered successfully',
    };
  }

  complete(
    idempotencyKey: string,
    resultHash?: string,
  ): { success: boolean; reasonCode?: QueueReasonCode; message: string } {
    const record = this.store.get(idempotencyKey);
    if (!record) {
      return {
        success: false,
        reasonCode: QueueReasonCode.INTERNAL_ERROR,
        message: `Idempotency record not found for key ${idempotencyKey}`,
      };
    }

    if (record.status === IdempotencyStatus.COMPLETED) {
      return {
        success: false,
        reasonCode: QueueReasonCode.DUPLICATE_EXECUTION,
        message: `Idempotency key ${idempotencyKey} already completed`,
      };
    }

    if (record.status === IdempotencyStatus.FAILED) {
      return {
        success: false,
        reasonCode: QueueReasonCode.DUPLICATE_EXECUTION,
        message: `Idempotency key ${idempotencyKey} was already marked as failed`,
      };
    }

    record.status = IdempotencyStatus.COMPLETED;
    record.completedAt = new Date().toISOString();
    record.resultHash = resultHash;

    this.store.set(record);

    return {
      success: true,
      message: 'Idempotency record marked as completed',
    };
  }

  fail(
    idempotencyKey: string,
  ): { success: boolean; reasonCode?: QueueReasonCode; message: string } {
    const record = this.store.get(idempotencyKey);
    if (!record) {
      return {
        success: false,
        reasonCode: QueueReasonCode.INTERNAL_ERROR,
        message: `Idempotency record not found for key ${idempotencyKey}`,
      };
    }

    if (record.status === IdempotencyStatus.COMPLETED) {
      return {
        success: false,
        reasonCode: QueueReasonCode.DUPLICATE_EXECUTION,
        message: `Idempotency key ${idempotencyKey} already completed, cannot mark as failed`,
      };
    }

    record.status = IdempotencyStatus.FAILED;
    record.completedAt = new Date().toISOString();

    this.store.set(record);

    return {
      success: true,
      message: 'Idempotency record marked as failed',
    };
  }

  getRecord(idempotencyKey: string): IdempotencyRecord | undefined {
    return this.store.get(idempotencyKey);
  }

  isDuplicate(idempotencyKey: string): boolean {
    const record = this.store.get(idempotencyKey);
    return record !== undefined && record.status !== IdempotencyStatus.EXPIRED;
  }

  getAllRecords(): IdempotencyRecord[] {
    return this.store.getAll();
  }

  expireStaleRecords(maxAgeMs: number, now: Date = new Date()): number {
    let expiredCount = 0;

    for (const record of this.store.getAll()) {
      if (record.status === IdempotencyStatus.PENDING) {
        const createdAt = new Date(record.createdAt);
        if (now.getTime() - createdAt.getTime() > maxAgeMs) {
          record.status = IdempotencyStatus.EXPIRED;
          this.store.set(record);
          expiredCount++;
        }
      }
    }

    return expiredCount;
  }
}
