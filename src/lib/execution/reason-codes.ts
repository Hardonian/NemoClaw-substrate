// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Canonical reason codes for queue decisions.
 * All reason codes are deterministic and replay-safe.
 */
export enum QueueReasonCode {
  // Policy gates
  POLICY_VIOLATION = 'policy_violation',
  POLICY_EXPIRED = 'policy_expired',
  POLICY_MISSING = 'policy_missing',

  // Approval gates
  APPROVAL_REQUIRED = 'approval_required',
  APPROVAL_DENIED = 'approval_denied',
  APPROVAL_EXPIRED = 'approval_expired',
  APPROVAL_GRANTED = 'approval_granted',

  // Trust gates
  TRUST_INSUFFICIENT = 'trust_insufficient',
  TRUST_REVOKED = 'trust_revoked',
  TRUST_EXPIRED = 'trust_expired',
  TRUST_VERIFIED = 'trust_verified',

  // Degraded state
  DEGRADED_MODE = 'degraded_mode',
  SYSTEM_UNHEALTHY = 'system_unhealthy',
  CAPACITY_EXHAUSTED = 'capacity_exhausted',

  // Idempotency
  DUPLICATE_EXECUTION = 'duplicate_execution',
  IDEMPOTENCY_KEY_CONFLICT = 'idempotency_key_conflict',

  // Lease
  LEASE_EXPIRED = 'lease_expired',
  LEASE_STALE = 'lease_stale',
  LEASE_CONFLICT = 'lease_conflict',
  LEASE_ACQUIRED = 'lease_acquired',
  LEASE_RELEASED = 'lease_released',
  LEASE_RENEWED = 'lease_renewed',

  // Cancellation
  CANCELLATION_REQUESTED = 'cancellation_requested',
  CANCELLATION_ACKNOWLEDGED = 'cancellation_acknowledged',
  CANCELLATION_DENIED = 'cancellation_denied',
  CANCELLATION_EXPIRED = 'cancellation_expired',

  // Queue ordering
  QUEUE_FULL = 'queue_full',
  QUEUE_PRIORITY_VIOLATION = 'queue_priority_violation',

  // Retry
  RETRY_POLICY_EXHAUSTED = 'retry_policy_exhausted',
  RETRY_NOT_ALLOWED = 'retry_not_allowed',

  // General
  VALIDATION_FAILED = 'validation_failed',
  INTERNAL_ERROR = 'internal_error',
}
