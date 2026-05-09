// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach } from 'vitest';
import { LeaseManager, LeaseStatus, ExecutionLease, QueueReasonCode } from './index';

function createTestLease(overrides?: Partial<ExecutionLease>): ExecutionLease {
  return {
    id: 'lease-1',
    executionId: 'exec-1',
    ownerId: 'owner-1',
    acquiredAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 300000).toISOString(),
    status: LeaseStatus.ACTIVE,
    version: 1,
    ...overrides,
  };
}

describe('LeaseManager', () => {
  let store: any;
  let manager: LeaseManager;

  beforeEach(() => {
    const leases = new Map<string, ExecutionLease>();
    store = {
      get: (id: string) => leases.get(id),
      set: (lease: ExecutionLease) => leases.set(lease.id, lease),
      delete: (id: string) => leases.delete(id),
      getAll: () => Array.from(leases.values()),
    };
    manager = new LeaseManager(store, {
      defaultLeaseDurationMs: 300000,
      maxRenewalCount: 3,
      renewalDurationMs: 60000,
    });
  });

  describe('lease acquisition', () => {
    it('should acquire a new lease', () => {
      const result = manager.acquire('exec-1', 'owner-1');

      expect(result.success).toBe(true);
      expect(result.lease).toBeDefined();
      expect(result.lease?.status).toBe(LeaseStatus.ACTIVE);
      expect(result.lease?.ownerId).toBe('owner-1');
    });

    it('should reject duplicate lease acquisition', () => {
      manager.acquire('exec-1', 'owner-1');
      const result = manager.acquire('exec-1', 'owner-2');

      expect(result.success).toBe(false);
      expect(result.reasonCode).toBe(QueueReasonCode.LEASE_CONFLICT);
    });

    it('should allow lease acquisition for different execution', () => {
      manager.acquire('exec-1', 'owner-1');
      const result = manager.acquire('exec-2', 'owner-2');

      expect(result.success).toBe(true);
    });
  });

  describe('lease expiry', () => {
    it('should detect and mark stale leases', () => {
      const result = manager.acquire('exec-1', 'owner-1');
      const lease = result.lease!;

      const staleLeases = manager.detectStaleLeases(new Date(Date.now() + 400000));

      expect(staleLeases).toHaveLength(1);
      expect(staleLeases[0].status).toBe(LeaseStatus.STALE);
    });

    it('should not mark active leases as stale', () => {
      manager.acquire('exec-1', 'owner-1');

      const staleLeases = manager.detectStaleLeases(new Date());

      expect(staleLeases).toHaveLength(0);
    });

    it('should report lease as invalid after expiry', () => {
      const result = manager.acquire('exec-1', 'owner-1');
      const lease = result.lease!;

      store.set({
        ...lease,
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      });

      const isValid = manager.isLeaseValid(lease.id);
      expect(isValid).toBe(false);
    });
  });

  describe('lease renewal', () => {
    it('should renew an active lease', () => {
      const result = manager.acquire('exec-1', 'owner-1');
      const lease = result.lease!;

      const renewalResult = manager.renew(lease.id, 'owner-1');

      expect(renewalResult.success).toBe(true);
      expect(renewalResult.lease?.version).toBe(2);
      expect(renewalResult.lease?.renewedAt).toBeDefined();
    });

    it('should reject renewal by wrong owner', () => {
      const result = manager.acquire('exec-1', 'owner-1');
      const lease = result.lease!;

      const renewalResult = manager.renew(lease.id, 'owner-2');

      expect(renewalResult.success).toBe(false);
      expect(renewalResult.reasonCode).toBe(QueueReasonCode.LEASE_CONFLICT);
    });

    it('should reject renewal of expired lease', () => {
      const result = manager.acquire('exec-1', 'owner-1');
      const lease = result.lease!;

      store.set({
        ...lease,
        status: LeaseStatus.EXPIRED,
      });

      const renewalResult = manager.renew(lease.id, 'owner-1');

      expect(renewalResult.success).toBe(false);
      expect(renewalResult.reasonCode).toBe(QueueReasonCode.LEASE_EXPIRED);
    });

    it('should reject renewal after max count reached', () => {
      const result = manager.acquire('exec-1', 'owner-1');
      let lease = result.lease!;

      manager.renew(lease.id, 'owner-1');
      manager.renew(lease.id, 'owner-1');
      const renewalResult = manager.renew(lease.id, 'owner-1');

      expect(renewalResult.success).toBe(false);
      expect(renewalResult.reasonCode).toBe(QueueReasonCode.RETRY_POLICY_EXHAUSTED);
    });
  });

  describe('lease release', () => {
    it('should release an active lease', () => {
      const result = manager.acquire('exec-1', 'owner-1');
      const lease = result.lease!;

      const releaseResult = manager.release(lease.id, 'owner-1');

      expect(releaseResult.success).toBe(true);
      const released = manager.getLease(lease.id);
      expect(released?.status).toBe(LeaseStatus.RELEASED);
      expect(released?.releasedAt).toBeDefined();
    });

    it('should reject release by wrong owner', () => {
      const result = manager.acquire('exec-1', 'owner-1');
      const lease = result.lease!;

      const releaseResult = manager.release(lease.id, 'owner-2');

      expect(releaseResult.success).toBe(false);
      expect(releaseResult.reasonCode).toBe(QueueReasonCode.LEASE_CONFLICT);
    });
  });

  describe('stale ownership handling', () => {
    it('should detect stale leases and prevent operations', () => {
      const result = manager.acquire('exec-1', 'owner-1');
      const lease = result.lease!;

      manager.detectStaleLeases(new Date(Date.now() + 400000));

      const renewalResult = manager.renew(lease.id, 'owner-1');
      expect(renewalResult.success).toBe(false);
      expect(renewalResult.reasonCode).toBe(QueueReasonCode.LEASE_EXPIRED);
    });

    it('should allow re-acquisition after lease becomes stale', () => {
      manager.acquire('exec-1', 'owner-1');
      manager.detectStaleLeases(new Date(Date.now() + 400000));

      const result = manager.acquire('exec-1', 'owner-2');
      expect(result.success).toBe(true);
    });
  });

  describe('active lease lookup', () => {
    it('should return active lease for execution', () => {
      manager.acquire('exec-1', 'owner-1');

      const active = manager.getActiveLease('exec-1');
      expect(active).toBeDefined();
      expect(active?.ownerId).toBe('owner-1');
    });

    it('should return undefined for execution without active lease', () => {
      const active = manager.getActiveLease('exec-1');
      expect(active).toBeUndefined();
    });

    it('should not return expired leases as active', () => {
      const result = manager.acquire('exec-1', 'owner-1');
      store.set({ ...result.lease!, status: LeaseStatus.EXPIRED });

      const active = manager.getActiveLease('exec-1');
      expect(active).toBeUndefined();
    });
  });
});
