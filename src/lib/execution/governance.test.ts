// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach } from 'vitest';
import {
  GovernanceManager,
  InMemoryGovernanceStore,
  ExecutionQueueItem,
  QueueStatus,
  QueueReasonCode,
} from './index';

describe('GovernanceManager', () => {
  let store: InMemoryGovernanceStore;
  let manager: GovernanceManager;

  beforeEach(() => {
    store = new InMemoryGovernanceStore();
    manager = new GovernanceManager(store);
  });

  describe('policy gates', () => {
    it('should pass when all policy gates pass', () => {
      store.setPolicyGates([
        {
          id: 'gate-1',
          name: 'test-policy',
          version: '1.0.0',
          enabled: true,
          policyVersion: '1.0.0',
          evaluate: () => true,
        },
      ]);

      const decision = manager.evaluatePolicyGates({} as ExecutionQueueItem);
      expect(decision.allowed).toBe(true);
    });

    it('should block when policy gate rejects', () => {
      store.setPolicyGates([
        {
          id: 'gate-1',
          name: 'test-policy',
          version: '1.0.0',
          enabled: true,
          policyVersion: '1.0.0',
          evaluate: () => false,
        },
      ]);

      const decision = manager.evaluatePolicyGates({} as ExecutionQueueItem);
      expect(decision.allowed).toBe(false);
      expect(decision.reasonCode).toBe(QueueReasonCode.POLICY_VIOLATION);
    });

    it('should block when policy gate throws', () => {
      store.setPolicyGates([
        {
          id: 'gate-1',
          name: 'test-policy',
          version: '1.0.0',
          enabled: true,
          policyVersion: '1.0.0',
          evaluate: () => {
            throw new Error('Evaluation failed');
          },
        },
      ]);

      const decision = manager.evaluatePolicyGates({} as ExecutionQueueItem);
      expect(decision.allowed).toBe(false);
      expect(decision.reasonCode).toBe(QueueReasonCode.POLICY_VIOLATION);
    });

    it('should skip disabled policy gates', () => {
      store.setPolicyGates([
        {
          id: 'gate-1',
          name: 'test-policy',
          version: '1.0.0',
          enabled: false,
          policyVersion: '1.0.0',
          evaluate: () => false,
        },
      ]);

      const decision = manager.evaluatePolicyGates({} as ExecutionQueueItem);
      expect(decision.allowed).toBe(true);
    });

    it('should block when policy gate is expired', () => {
      store.setPolicyGates([
        {
          id: 'gate-1',
          name: 'test-policy',
          version: '1.0.0',
          enabled: true,
          policyVersion: '1.0.0',
          expiresAt: new Date(Date.now() - 1000).toISOString(),
          evaluate: () => true,
        },
      ]);

      const decision = manager.evaluatePolicyGates({} as ExecutionQueueItem);
      expect(decision.allowed).toBe(false);
      expect(decision.reasonCode).toBe(QueueReasonCode.POLICY_EXPIRED);
    });
  });

  describe('approval gates', () => {
    it('should pass when all required approval gates are granted', () => {
      store.setApprovalGates([
        {
          id: 'gate-1',
          name: 'test-approval',
          required: true,
          granted: true,
          grantedBy: 'operator-1',
          grantedAt: new Date().toISOString(),
        },
      ]);

      const decision = manager.evaluateApprovalGates({} as ExecutionQueueItem);
      expect(decision.allowed).toBe(true);
    });

    it('should block when required approval is not granted', () => {
      store.setApprovalGates([
        {
          id: 'gate-1',
          name: 'test-approval',
          required: true,
          granted: false,
        },
      ]);

      const decision = manager.evaluateApprovalGates({} as ExecutionQueueItem);
      expect(decision.allowed).toBe(false);
      expect(decision.reasonCode).toBe(QueueReasonCode.APPROVAL_REQUIRED);
    });

    it('should block when approval is denied', () => {
      store.setApprovalGates([
        {
          id: 'gate-1',
          name: 'test-approval',
          required: true,
          granted: false,
          deniedBy: 'operator-1',
          deniedAt: new Date().toISOString(),
          deniedReason: 'Insufficient permissions',
        },
      ]);

      const decision = manager.evaluateApprovalGates({} as ExecutionQueueItem);
      expect(decision.allowed).toBe(false);
      expect(decision.reasonCode).toBe(QueueReasonCode.APPROVAL_DENIED);
    });

    it('should skip non-required approval gates', () => {
      store.setApprovalGates([
        {
          id: 'gate-1',
          name: 'test-approval',
          required: false,
          granted: false,
        },
      ]);

      const decision = manager.evaluateApprovalGates({} as ExecutionQueueItem);
      expect(decision.allowed).toBe(true);
    });

    it('should block when approval gate is expired', () => {
      store.setApprovalGates([
        {
          id: 'gate-1',
          name: 'test-approval',
          required: true,
          granted: true,
          grantedBy: 'operator-1',
          grantedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() - 1000).toISOString(),
        },
      ]);

      const decision = manager.evaluateApprovalGates({} as ExecutionQueueItem);
      expect(decision.allowed).toBe(false);
      expect(decision.reasonCode).toBe(QueueReasonCode.APPROVAL_EXPIRED);
    });
  });

  describe('trust gates', () => {
    it('should pass when all trust gates are verified', () => {
      store.setTrustGates([
        {
          id: 'gate-1',
          name: 'test-trust',
          minimumTrustLevel: 'high',
          verified: true,
          verifiedAt: new Date().toISOString(),
        },
      ]);

      const decision = manager.evaluateTrustGates({} as ExecutionQueueItem);
      expect(decision.allowed).toBe(true);
    });

    it('should block when trust gate is not verified', () => {
      store.setTrustGates([
        {
          id: 'gate-1',
          name: 'test-trust',
          minimumTrustLevel: 'high',
          verified: false,
        },
      ]);

      const decision = manager.evaluateTrustGates({} as ExecutionQueueItem);
      expect(decision.allowed).toBe(false);
      expect(decision.reasonCode).toBe(QueueReasonCode.TRUST_INSUFFICIENT);
    });

    it('should block when trust gate is revoked', () => {
      store.setTrustGates([
        {
          id: 'gate-1',
          name: 'test-trust',
          minimumTrustLevel: 'high',
          verified: true,
          revokedAt: new Date().toISOString(),
          revokedReason: 'Security violation',
        },
      ]);

      const decision = manager.evaluateTrustGates({} as ExecutionQueueItem);
      expect(decision.allowed).toBe(false);
      expect(decision.reasonCode).toBe(QueueReasonCode.TRUST_REVOKED);
    });

    it('should block when trust gate is expired', () => {
      store.setTrustGates([
        {
          id: 'gate-1',
          name: 'test-trust',
          minimumTrustLevel: 'high',
          verified: true,
          verifiedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() - 1000).toISOString(),
        },
      ]);

      const decision = manager.evaluateTrustGates({} as ExecutionQueueItem);
      expect(decision.allowed).toBe(false);
      expect(decision.reasonCode).toBe(QueueReasonCode.TRUST_EXPIRED);
    });
  });

  describe('degraded state', () => {
    it('should block when system is degraded', () => {
      store.setDegradedState({
        isDegraded: true,
        reason: QueueReasonCode.SYSTEM_UNHEALTHY,
        since: new Date().toISOString(),
        affectedOperations: ['enqueue', 'dequeue'],
      });

      const decision = manager.checkDegradedState();
      expect(decision.allowed).toBe(false);
      expect(decision.reasonCode).toBe(QueueReasonCode.SYSTEM_UNHEALTHY);
    });

    it('should allow when system is healthy', () => {
      store.setDegradedState(null);

      const decision = manager.checkDegradedState();
      expect(decision.allowed).toBe(true);
    });

    it('should block specific operations in degraded mode', () => {
      store.setDegradedState({
        isDegraded: true,
        reason: QueueReasonCode.DEGRADED_MODE,
        since: new Date().toISOString(),
        affectedOperations: ['enqueue'],
      });

      expect(manager.isOperationAllowed('enqueue')).toBe(false);
      expect(manager.isOperationAllowed('dequeue')).toBe(true);
    });
  });

  describe('evaluateAll', () => {
    it('should block on degraded state first', () => {
      store.setDegradedState({
        isDegraded: true,
        reason: QueueReasonCode.SYSTEM_UNHEALTHY,
        since: new Date().toISOString(),
        affectedOperations: [],
      });

      const decision = manager.evaluateAll({} as ExecutionQueueItem);
      expect(decision.allowed).toBe(false);
      expect(decision.reasonCode).toBe(QueueReasonCode.SYSTEM_UNHEALTHY);
    });

    it('should block on policy gate failure', () => {
      store.setPolicyGates([
        {
          id: 'gate-1',
          name: 'test-policy',
          version: '1.0.0',
          enabled: true,
          policyVersion: '1.0.0',
          evaluate: () => false,
        },
      ]);

      const decision = manager.evaluateAll({} as ExecutionQueueItem);
      expect(decision.allowed).toBe(false);
      expect(decision.reasonCode).toBe(QueueReasonCode.POLICY_VIOLATION);
    });

    it('should pass when all gates pass', () => {
      store.setPolicyGates([
        {
          id: 'gate-1',
          name: 'test-policy',
          version: '1.0.0',
          enabled: true,
          policyVersion: '1.0.0',
          evaluate: () => true,
        },
      ]);
      store.setApprovalGates([
        {
          id: 'gate-1',
          name: 'test-approval',
          required: true,
          granted: true,
          grantedBy: 'operator-1',
          grantedAt: new Date().toISOString(),
        },
      ]);
      store.setTrustGates([
        {
          id: 'gate-1',
          name: 'test-trust',
          minimumTrustLevel: 'high',
          verified: true,
          verifiedAt: new Date().toISOString(),
        },
      ]);

      const decision = manager.evaluateAll({} as ExecutionQueueItem);
      expect(decision.allowed).toBe(true);
    });
  });
});
