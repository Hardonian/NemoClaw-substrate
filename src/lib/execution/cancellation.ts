// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Deterministic cancellation manager.
 * Provides cancellation request, acknowledge, deny, expire, and replay-visible events.
 * All transitions are explicit and fail closed.
 */

import {
  ExecutionCancellation,
  CancellationStatus,
  QueueStatus,
} from './types';
import { QueueReasonCode } from './reason-codes';

export interface CancellationStore {
  get(id: string): ExecutionCancellation | undefined;
  set(cancellation: ExecutionCancellation): void;
  delete(id: string): void;
  getAll(): ExecutionCancellation[];
  getByExecutionId(executionId: string): ExecutionCancellation | undefined;
}

export class CancellationManager {
  private store: CancellationStore;

  constructor(store: CancellationStore) {
    this.store = store;
  }

  request(
    executionId: string,
    requestedBy: string,
    expiresAt?: string,
  ): ExecutionCancellation {
    const existing = this.store.getByExecutionId(executionId);
    if (existing && existing.status === CancellationStatus.REQUESTED) {
      return existing;
    }

    const cancellation: ExecutionCancellation = {
      id: `cancel-${executionId}-${Date.now()}`,
      executionId,
      requestedBy,
      requestedAt: new Date().toISOString(),
      status: CancellationStatus.REQUESTED,
      expiresAt,
    };

    this.store.set(cancellation);
    return cancellation;
  }

  acknowledge(
    cancellationId: string,
    acknowledgedBy: string,
  ): { success: boolean; cancellation?: ExecutionCancellation; reasonCode?: QueueReasonCode; message: string } {
    const cancellation = this.store.get(cancellationId);
    if (!cancellation) {
      return {
        success: false,
        reasonCode: QueueReasonCode.INTERNAL_ERROR,
        message: `Cancellation ${cancellationId} not found`,
      };
    }

    if (cancellation.status !== CancellationStatus.REQUESTED) {
      return {
        success: false,
        reasonCode: QueueReasonCode.CANCELLATION_DENIED,
        message: `Cancellation is already ${cancellation.status}`,
      };
    }

    cancellation.status = CancellationStatus.ACKNOWLEDGED;
    cancellation.acknowledgedAt = new Date().toISOString();
    cancellation.acknowledgedBy = acknowledgedBy;

    this.store.set(cancellation);

    return {
      success: true,
      cancellation,
      message: 'Cancellation acknowledged',
    };
  }

  deny(
    cancellationId: string,
    deniedBy: string,
    deniedReason: QueueReasonCode,
  ): { success: boolean; cancellation?: ExecutionCancellation; reasonCode?: QueueReasonCode; message: string } {
    const cancellation = this.store.get(cancellationId);
    if (!cancellation) {
      return {
        success: false,
        reasonCode: QueueReasonCode.INTERNAL_ERROR,
        message: `Cancellation ${cancellationId} not found`,
      };
    }

    if (cancellation.status !== CancellationStatus.REQUESTED) {
      return {
        success: false,
        reasonCode: QueueReasonCode.CANCELLATION_DENIED,
        message: `Cancellation is already ${cancellation.status}`,
      };
    }

    cancellation.status = CancellationStatus.DENIED;
    cancellation.deniedAt = new Date().toISOString();
    cancellation.deniedBy = deniedBy;
    cancellation.deniedReason = deniedReason;

    this.store.set(cancellation);

    return {
      success: true,
      cancellation,
      message: 'Cancellation denied',
    };
  }

  expire(
    cancellationId: string,
  ): { success: boolean; cancellation?: ExecutionCancellation; reasonCode?: QueueReasonCode; message: string } {
    const cancellation = this.store.get(cancellationId);
    if (!cancellation) {
      return {
        success: false,
        reasonCode: QueueReasonCode.INTERNAL_ERROR,
        message: `Cancellation ${cancellationId} not found`,
      };
    }

    if (cancellation.status !== CancellationStatus.REQUESTED) {
      return {
        success: false,
        reasonCode: QueueReasonCode.CANCELLATION_EXPIRED,
        message: `Cancellation is already ${cancellation.status}`,
      };
    }

    cancellation.status = CancellationStatus.EXPIRED;

    this.store.set(cancellation);

    return {
      success: true,
      cancellation,
      message: 'Cancellation expired',
    };
  }

  getExpiredCancellations(now: Date = new Date()): ExecutionCancellation[] {
    return this.store
      .getAll()
      .filter((c) => {
        if (c.status !== CancellationStatus.REQUESTED) {
          return false;
        }
        if (!c.expiresAt) {
          return false;
        }
        return new Date(c.expiresAt) < now;
      });
  }

  getCancellation(cancellationId: string): ExecutionCancellation | undefined {
    return this.store.get(cancellationId);
  }

  getCancellationForExecution(
    executionId: string,
  ): ExecutionCancellation | undefined {
    return this.store.getByExecutionId(executionId);
  }

  getAllCancellations(): ExecutionCancellation[] {
    return this.store.getAll();
  }

  shouldCancelExecution(
    executionId: string,
    currentStatus: QueueStatus,
  ): boolean {
    const cancellation = this.store.getByExecutionId(executionId);
    if (!cancellation) {
      return false;
    }

    if (cancellation.status !== CancellationStatus.ACKNOWLEDGED) {
      return false;
    }

    if (
      currentStatus === QueueStatus.COMPLETED ||
      currentStatus === QueueStatus.FAILED ||
      currentStatus === QueueStatus.CANCELLED
    ) {
      return false;
    }

    return true;
  }
}
