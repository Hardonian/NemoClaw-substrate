// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Queue governance system.
 * Provides policy gates, approval gates, trust gates, degraded-state handling,
 * and explicit blocked reasons. All gates fail closed.
 */

import {
  ExecutionQueueItem,
  PolicyGate,
  ApprovalGate,
  TrustGate,
  DegradedState,
  QueueStatus,
} from './types';
import { QueueReasonCode } from './reason-codes';
import { QueueDecision } from './queue-decision';

export interface GovernanceStore {
  getPolicyGates(): PolicyGate[];
  getApprovalGates(): ApprovalGate[];
  getTrustGates(): TrustGate[];
  getDegradedState(): DegradedState | null;
}

export class GovernanceManager {
  private store: GovernanceStore;

  constructor(store: GovernanceStore) {
    this.store = store;
  }

  evaluatePolicyGates(item: ExecutionQueueItem): QueueDecision {
    const policyGates = this.store.getPolicyGates().filter((g) => g.enabled);

    for (const gate of policyGates) {
      if (gate.expiresAt && new Date(gate.expiresAt) < new Date()) {
        return QueueDecision.block(
          QueueReasonCode.POLICY_EXPIRED,
          `Policy gate ${gate.name} has expired`,
        );
      }

      try {
        const passed = gate.evaluate(item);
        if (!passed) {
          return QueueDecision.block(
            QueueReasonCode.POLICY_VIOLATION,
            `Policy gate ${gate.name} rejected item`,
          );
        }
      } catch {
        return QueueDecision.block(
          QueueReasonCode.POLICY_VIOLATION,
          `Policy gate ${gate.name} evaluation failed`,
        );
      }
    }

    return QueueDecision.allow('All policy gates passed');
  }

  evaluateApprovalGates(item: ExecutionQueueItem): QueueDecision {
    const approvalGates = this.store
      .getApprovalGates()
      .filter((g) => g.required);

    for (const gate of approvalGates) {
      if (gate.expiresAt && new Date(gate.expiresAt) < new Date()) {
        return QueueDecision.block(
          QueueReasonCode.APPROVAL_EXPIRED,
          `Approval gate ${gate.name} has expired`,
        );
      }

      if (gate.deniedBy) {
        return QueueDecision.block(
          QueueReasonCode.APPROVAL_DENIED,
          `Approval gate ${gate.name} was denied by ${gate.deniedBy}: ${gate.deniedReason ?? 'no reason provided'}`,
        );
      }

      if (!gate.granted) {
        return QueueDecision.block(
          QueueReasonCode.APPROVAL_REQUIRED,
          `Approval gate ${gate.name} has not been granted`,
        );
      }
    }

    return QueueDecision.allow('All approval gates passed');
  }

  evaluateTrustGates(item: ExecutionQueueItem): QueueDecision {
    const trustGates = this.store.getTrustGates();

    for (const gate of trustGates) {
      if (gate.expiresAt && new Date(gate.expiresAt) < new Date()) {
        return QueueDecision.block(
          QueueReasonCode.TRUST_EXPIRED,
          `Trust gate ${gate.name} has expired`,
        );
      }

      if (gate.revokedAt) {
        return QueueDecision.block(
          QueueReasonCode.TRUST_REVOKED,
          `Trust gate ${gate.name} was revoked: ${gate.revokedReason ?? 'no reason provided'}`,
        );
      }

      if (!gate.verified) {
        return QueueDecision.block(
          QueueReasonCode.TRUST_INSUFFICIENT,
          `Trust gate ${gate.name} has not been verified`,
        );
      }
    }

    return QueueDecision.allow('All trust gates passed');
  }

  checkDegradedState(): QueueDecision {
    const degraded = this.store.getDegradedState();

    if (degraded && degraded.isDegraded) {
      return QueueDecision.block(
        degraded.reason,
        `System is in degraded mode since ${degraded.since}: ${degraded.affectedOperations.join(', ')}`,
      );
    }

    return QueueDecision.allow('System is healthy');
  }

  evaluateAll(item: ExecutionQueueItem): QueueDecision {
    const degradedCheck = this.checkDegradedState();
    if (!degradedCheck.allowed) {
      return degradedCheck;
    }

    const policyCheck = this.evaluatePolicyGates(item);
    if (!policyCheck.allowed) {
      return policyCheck;
    }

    const approvalCheck = this.evaluateApprovalGates(item);
    if (!approvalCheck.allowed) {
      return approvalCheck;
    }

    const trustCheck = this.evaluateTrustGates(item);
    if (!trustCheck.allowed) {
      return trustCheck;
    }

    return QueueDecision.allow('All governance checks passed');
  }

  isOperationAllowed(operation: string): boolean {
    const degraded = this.store.getDegradedState();
    if (!degraded || !degraded.isDegraded) {
      return true;
    }

    return !degraded.affectedOperations.includes(operation);
  }
}

export class InMemoryGovernanceStore implements GovernanceStore {
  private policyGates: PolicyGate[] = [];
  private approvalGates: ApprovalGate[] = [];
  private trustGates: TrustGate[] = [];
  private degradedState: DegradedState | null = null;

  setDegradedState(state: DegradedState | null): void {
    this.degradedState = state;
  }

  setPolicyGates(gates: PolicyGate[]): void {
    this.policyGates = gates;
  }

  setApprovalGates(gates: ApprovalGate[]): void {
    this.approvalGates = gates;
  }

  setTrustGates(gates: TrustGate[]): void {
    this.trustGates = gates;
  }

  getPolicyGates(): PolicyGate[] {
    return this.policyGates;
  }

  getApprovalGates(): ApprovalGate[] {
    return this.approvalGates;
  }

  getTrustGates(): TrustGate[] {
    return this.trustGates;
  }

  getDegradedState(): DegradedState | null {
    return this.degradedState;
  }
}
