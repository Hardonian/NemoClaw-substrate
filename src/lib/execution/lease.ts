// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Deterministic lease manager.
 * Provides lease acquisition, expiry, renewal, release, and stale lease detection.
 * All transitions are deterministic and fail closed. No hidden retries, no daemon workers.
 */

import {
  ExecutionLease,
  LeaseStatus,
  LeaseAcquisitionResult,
  LeaseRenewalResult,
} from './types';
import { QueueReasonCode } from './reason-codes';

export interface LeaseStore {
  get(id: string): ExecutionLease | undefined;
  set(lease: ExecutionLease): void;
  delete(id: string): void;
  getAll(): ExecutionLease[];
}

export interface LeaseConfig {
  defaultLeaseDurationMs: number;
  maxRenewalCount: number;
  renewalDurationMs: number;
}

export const DEFAULT_LEASE_CONFIG: LeaseConfig = {
  defaultLeaseDurationMs: 300_000, // 5 minutes
  maxRenewalCount: 3,
  renewalDurationMs: 60_000, // 1 minute
};

export class LeaseManager {
  private store: LeaseStore;
  private config: LeaseConfig;

  constructor(store: LeaseStore, config: Partial<LeaseConfig> = {}) {
    this.store = store;
    this.config = { ...DEFAULT_LEASE_CONFIG, ...config };
  }

  acquire(
    executionId: string,
    ownerId: string,
  ): LeaseAcquisitionResult {
    const existing = this.store
      .getAll()
      .find(
        (l) =>
          l.executionId === executionId &&
          l.status === LeaseStatus.ACTIVE,
      );

    if (existing) {
      return {
        success: false,
        reasonCode: QueueReasonCode.LEASE_CONFLICT,
        message: `Active lease ${existing.id} already exists for execution ${executionId}`,
      };
    }

    const now = new Date();
    const lease: ExecutionLease = {
      id: `lease-${executionId}-${Date.now()}`,
      executionId,
      ownerId,
      acquiredAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + this.config.defaultLeaseDurationMs).toISOString(),
      status: LeaseStatus.ACTIVE,
      version: 1,
    };

    this.store.set(lease);

    return {
      success: true,
      lease,
      message: 'Lease acquired successfully',
    };
  }

  renew(leaseId: string, ownerId: string): LeaseRenewalResult {
    const lease = this.store.get(leaseId);
    if (!lease) {
      return {
        success: false,
        reasonCode: QueueReasonCode.LEASE_EXPIRED,
        message: `Lease ${leaseId} not found`,
      };
    }

    if (lease.ownerId !== ownerId) {
      return {
        success: false,
        reasonCode: QueueReasonCode.LEASE_CONFLICT,
        message: `Owner ${ownerId} does not match lease owner ${lease.ownerId}`,
      };
    }

    if (lease.status !== LeaseStatus.ACTIVE) {
      return {
        success: false,
        reasonCode: QueueReasonCode.LEASE_EXPIRED,
        message: `Lease is not active (status: ${lease.status})`,
      };
    }

    if (lease.version >= this.config.maxRenewalCount) {
      return {
        success: false,
        reasonCode: QueueReasonCode.RETRY_POLICY_EXHAUSTED,
        message: `Maximum renewal count (${this.config.maxRenewalCount}) reached`,
      };
    }

    const now = new Date();
    lease.renewedAt = now.toISOString();
    lease.expiresAt = new Date(now.getTime() + this.config.renewalDurationMs).toISOString();
    lease.version += 1;

    this.store.set(lease);

    return {
      success: true,
      lease,
      message: 'Lease renewed successfully',
    };
  }

  release(leaseId: string, ownerId: string): { success: boolean; reasonCode?: QueueReasonCode; message: string } {
    const lease = this.store.get(leaseId);
    if (!lease) {
      return {
        success: false,
        reasonCode: QueueReasonCode.LEASE_EXPIRED,
        message: `Lease ${leaseId} not found`,
      };
    }

    if (lease.ownerId !== ownerId) {
      return {
        success: false,
        reasonCode: QueueReasonCode.LEASE_CONFLICT,
        message: `Owner ${ownerId} does not match lease owner ${lease.ownerId}`,
      };
    }

    if (lease.status !== LeaseStatus.ACTIVE) {
      return {
        success: false,
        reasonCode: QueueReasonCode.LEASE_EXPIRED,
        message: `Lease is not active (status: ${lease.status})`,
      };
    }

    lease.status = LeaseStatus.RELEASED;
    lease.releasedAt = new Date().toISOString();

    this.store.set(lease);

    return {
      success: true,
      message: 'Lease released successfully',
    };
  }

  expire(leaseId: string): { success: boolean; reasonCode?: QueueReasonCode; message: string } {
    const lease = this.store.get(leaseId);
    if (!lease) {
      return {
        success: false,
        reasonCode: QueueReasonCode.LEASE_EXPIRED,
        message: `Lease ${leaseId} not found`,
      };
    }

    if (lease.status !== LeaseStatus.ACTIVE) {
      return {
        success: false,
        reasonCode: QueueReasonCode.LEASE_EXPIRED,
        message: `Lease is already ${lease.status}`,
      };
    }

    lease.status = LeaseStatus.EXPIRED;

    this.store.set(lease);

    return {
      success: true,
      message: 'Lease expired successfully',
    };
  }

  detectStaleLeases(now: Date = new Date()): ExecutionLease[] {
    const staleLeases: ExecutionLease[] = [];

    for (const lease of this.store.getAll()) {
      if (lease.status === LeaseStatus.ACTIVE) {
        const expiresAt = new Date(lease.expiresAt);
        if (expiresAt < now) {
          lease.status = LeaseStatus.STALE;
          this.store.set(lease);
          staleLeases.push(lease);
        }
      }
    }

    return staleLeases;
  }

  getActiveLease(executionId: string): ExecutionLease | undefined {
    return this.store
      .getAll()
      .find(
        (l) =>
          l.executionId === executionId &&
          l.status === LeaseStatus.ACTIVE,
      );
  }

  isLeaseValid(leaseId: string, now: Date = new Date()): boolean {
    const lease = this.store.get(leaseId);
    if (!lease) {
      return false;
    }

    if (lease.status !== LeaseStatus.ACTIVE) {
      return false;
    }

    const expiresAt = new Date(lease.expiresAt);
    return expiresAt >= now;
  }

  getLease(leaseId: string): ExecutionLease | undefined {
    return this.store.get(leaseId);
  }

  getAllLeases(): ExecutionLease[] {
    return this.store.getAll();
  }
}
