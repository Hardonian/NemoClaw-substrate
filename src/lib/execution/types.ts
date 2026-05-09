// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { QueueReasonCode } from './reason-codes';

/**
 * Core type definitions for deterministic execution queue substrate.
 * All types are designed for replay-safe, deterministic state transitions.
 */

// ============================================================================
// Queue Status and Execution States
// ============================================================================

export enum QueueStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  BLOCKED = 'blocked',
}

export enum ExecutionState {
  INITIALIZED = 'initialized',
  WAITING = 'waiting',
  ACQUIRED = 'acquired',
  EXECUTING = 'executing',
  TERMINATED = 'terminated',
  EXPIRED = 'expired',
}

// ============================================================================
// Execution Queue Item
// ============================================================================

export interface ExecutionQueueItem {
  id: string;
  executionId: string;
  idempotencyKey?: string;
  status: QueueStatus;
  executionState: ExecutionState;
  priority: number;
  queuePosition?: number;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  enqueuedAt?: string;
  startedAt?: string;
  completedAt?: string;
  leaseId?: string;
  owner?: string;
  lastReason?: QueueReasonCode;
  cancellationRequested?: boolean;
  retryCount: number;
  maxRetries: number;
  policyVersion?: string;
  trustLevel?: string;
  approvalRequired: boolean;
  approvalGranted?: boolean;
}

// ============================================================================
// Lease Types
// ============================================================================

export interface ExecutionLease {
  id: string;
  executionId: string;
  ownerId: string;
  acquiredAt: string;
  expiresAt: string;
  renewedAt?: string;
  releasedAt?: string;
  status: LeaseStatus;
  version: number;
  metadata?: Record<string, unknown>;
}

export enum LeaseStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  RELEASED = 'released',
  REVOKED = 'revoked',
  STALE = 'stale',
}

export interface LeaseAcquisitionResult {
  success: boolean;
  lease?: ExecutionLease;
  reasonCode?: QueueReasonCode;
  message: string;
}

export interface LeaseRenewalResult {
  success: boolean;
  lease?: ExecutionLease;
  reasonCode?: QueueReasonCode;
  message: string;
}

// ============================================================================
// Ownership Types
// ============================================================================

export interface ExecutionOwnership {
  executionId: string;
  ownerId: string;
  leaseId: string;
  acquiredAt: string;
  releasedAt?: string;
  status: OwnershipStatus;
  transferHistory: OwnershipTransfer[];
}

export enum OwnershipStatus {
  ACTIVE = 'active',
  TRANSFERRED = 'transferred',
  RELEASED = 'released',
  EXPIRED = 'expired',
}

export interface OwnershipTransfer {
  fromOwnerId: string;
  toOwnerId: string;
  transferredAt: string;
  reason: QueueReasonCode | string;
  leaseId: string;
}

// ============================================================================
// Cancellation Types
// ============================================================================

export interface ExecutionCancellation {
  id: string;
  executionId: string;
  requestedBy: string;
  requestedAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  deniedAt?: string;
  deniedBy?: string;
  deniedReason?: QueueReasonCode;
  status: CancellationStatus;
  expiresAt?: string;
}

export enum CancellationStatus {
  REQUESTED = 'requested',
  ACKNOWLEDGED = 'acknowledged',
  DENIED = 'denied',
  EXPIRED = 'expired',
}

// ============================================================================
// Retry Policy Types
// ============================================================================

export interface ExecutionRetryPolicy {
  maxRetries: number;
  retryDelaysMs: number[];
  retryableStatuses: QueueStatus[];
  backoffMultiplier?: number;
  maxDelayMs?: number;
}

export const DEFAULT_RETRY_POLICY: ExecutionRetryPolicy = {
  maxRetries: 0,
  retryDelaysMs: [],
  retryableStatuses: [],
};

// ============================================================================
// Idempotency Types
// ============================================================================

export interface IdempotencyRecord {
  idempotencyKey: string;
  executionId: string;
  status: IdempotencyStatus;
  createdAt: string;
  completedAt?: string;
  resultHash?: string;
  metadata?: Record<string, unknown>;
}

export enum IdempotencyStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

// ============================================================================
// Queue Governance Types
// ============================================================================

export interface PolicyGate {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  policyVersion: string;
  expiresAt?: string;
  evaluate: (item: ExecutionQueueItem) => boolean;
}

export interface ApprovalGate {
  id: string;
  name: string;
  required: boolean;
  granted: boolean;
  grantedBy?: string;
  grantedAt?: string;
  deniedBy?: string;
  deniedAt?: string;
  deniedReason?: string;
  expiresAt?: string;
}

export interface TrustGate {
  id: string;
  name: string;
  minimumTrustLevel: string;
  verified: boolean;
  verifiedAt?: string;
  revokedAt?: string;
  revokedReason?: string;
  expiresAt?: string;
}

export interface DegradedState {
  isDegraded: boolean;
  reason: QueueReasonCode;
  since: string;
  affectedOperations: string[];
}

// ============================================================================
// Receipt Types
// ============================================================================

export interface QueueReceipt {
  receiptId: string;
  type: ReceiptType;
  executionId: string;
  timestamp: string;
  data: Record<string, unknown>;
  signature?: string;
}

export enum ReceiptType {
  QUEUE_ENQUEUE = 'queue_enqueue',
  QUEUE_DEQUEUE = 'queue_dequeue',
  QUEUE_STATUS_CHANGE = 'queue_status_change',
  LEASE_ACQUIRE = 'lease_acquire',
  LEASE_RENEW = 'lease_renew',
  LEASE_RELEASE = 'lease_release',
  LEASE_EXPIRE = 'lease_expire',
  OWNERSHIP_TRANSFER = 'ownership_transfer',
  OWNERSHIP_ACQUIRE = 'ownership_acquire',
  OWNERSHIP_RELEASE = 'ownership_release',
  CANCELLATION_REQUEST = 'cancellation_request',
  CANCELLATION_ACKNOWLEDGE = 'cancellation_acknowledge',
  CANCELLATION_DENY = 'cancellation_deny',
  IDEMPOTENCY_CHECK = 'idempotency_check',
  IDEMPOTENCY_DUPLICATE = 'idempotency_duplicate',
}

// ============================================================================
// Validation
// ============================================================================

export function validateQueueItem(item: Partial<ExecutionQueueItem>): string[] {
  const errors: string[] = [];

  if (!item.id) {
    errors.push('id is required');
  }
  if (!item.executionId) {
    errors.push('executionId is required');
  }
  if (!item.status) {
    errors.push('status is required');
  }
  if (typeof item.priority !== 'number') {
    errors.push('priority must be a number');
  }
  if (!item.payload || typeof item.payload !== 'object') {
    errors.push('payload is required and must be an object');
  }
  if (typeof item.retryCount !== 'number') {
    errors.push('retryCount must be a number');
  }
  if (typeof item.maxRetries !== 'number') {
    errors.push('maxRetries must be a number');
  }

  return errors;
}

export function validateLease(lease: Partial<ExecutionLease>): string[] {
  const errors: string[] = [];

  if (!lease.id) {
    errors.push('id is required');
  }
  if (!lease.executionId) {
    errors.push('executionId is required');
  }
  if (!lease.ownerId) {
    errors.push('ownerId is required');
  }
  if (!lease.acquiredAt) {
    errors.push('acquiredAt is required');
  }
  if (!lease.expiresAt) {
    errors.push('expiresAt is required');
  }
  if (!lease.status) {
    errors.push('status is required');
  }
  if (typeof lease.version !== 'number') {
    errors.push('version must be a number');
  }

  return errors;
}

export function validateIdempotencyRecord(
  record: Partial<IdempotencyRecord>,
): string[] {
  const errors: string[] = [];

  if (!record.idempotencyKey) {
    errors.push('idempotencyKey is required');
  }
  if (!record.executionId) {
    errors.push('executionId is required');
  }
  if (!record.status) {
    errors.push('status is required');
  }
  if (!record.createdAt) {
    errors.push('createdAt is required');
  }

  return errors;
}
