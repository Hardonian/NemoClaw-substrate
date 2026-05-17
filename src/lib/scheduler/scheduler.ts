// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Daemon scheduler substrate implementation.
 *
 * Implements a daemon-safe scheduler model with:
 * - Scheduler lifecycle
 * - Heartbeat monitoring
 * - Lease ownership
 * - Stop/shutdown semantics
 * - Lock/lease validation
 * - Stale daemon detection
 * - Deterministic scheduling loop boundaries
 *
 * Hard rule: No daemon starts by default.
 */

import { isDaemonSchedulerEnabled } from "../orchestration/types";
import {
  OrchestrationReasonCode,
  OrchestrationDecision,
  OrchestrationReceipt,
  ReceiptType,
} from "../orchestration/types";

// ============================================================================
// Types
// ============================================================================

export enum DaemonStatus {
  STOPPED = "stopped",
  STARTING = "starting",
  RUNNING = "running",
  STOPPING = "stopping",
  STALE = "stale",
  FAILED = "failed",
}

export interface DaemonDescriptor {
  daemonId: string;
  name: string;
  status: DaemonStatus;
  startedAt?: string;
  stoppedAt?: string;
  lastHeartbeatAt?: string;
  heartbeatIntervalMs: number;
  staleThresholdMs: number;
  leaseId?: string;
  leaseAcquiredAt?: string;
  leaseExpiresAt?: string;
  metadata?: Record<string, unknown>;
}

export interface SchedulerLease {
  leaseId: string;
  daemonId: string;
  acquiredAt: string;
  expiresAt: string;
  renewedAt?: string;
  releasedAt?: string;
  status: LeaseStatus;
  version: number;
}

export type LeaseStatus = "active" | "expired" | "released" | "stale";

export interface HeartbeatRecord {
  daemonId: string;
  timestamp: string;
  status: DaemonStatus;
  leaseId?: string;
}

export interface SchedulerState {
  daemon: DaemonDescriptor;
  lease?: SchedulerLease;
  heartbeatHistory: HeartbeatRecord[];
  schedulingRounds: number;
  lastSchedulingRoundAt?: string;
  startedAt?: string;
  stoppedAt?: string;
}

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_HEARTBEAT_INTERVAL_MS = 5000;
export const DEFAULT_STALE_THRESHOLD_MS = 15000;
export const DEFAULT_LEASE_DURATION_MS = 30000;

// ============================================================================
// Daemon scheduler
// ============================================================================

export class DaemonScheduler {
  private state: SchedulerState | null = null;
  private heartbeatHistory: HeartbeatRecord[] = [];
  private receipts: OrchestrationReceipt[] = [];
  private decisions: OrchestrationDecision[] = [];

  constructor() {}

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  start(daemonId: string, name: string): OrchestrationDecision {
    if (!isDaemonSchedulerEnabled()) {
      const decision = this.makeDecision(
        false,
        OrchestrationReasonCode.SCHEDULER_NOT_ENABLED,
        "Daemon scheduler is disabled. Set NEMOCLAW_DAEMON_SCHEDULER=1 to enable.",
      );
      return decision;
    }

    if (this.state && this.state.daemon.status !== DaemonStatus.STOPPED) {
      return this.makeDecision(
        false,
        OrchestrationReasonCode.INTERNAL_ERROR,
        `Scheduler already in ${this.state.daemon.status} state`,
      );
    }

    const now = new Date().toISOString();
    const daemon: DaemonDescriptor = {
      daemonId,
      name,
      status: DaemonStatus.STARTING,
      startedAt: now,
      heartbeatIntervalMs: DEFAULT_HEARTBEAT_INTERVAL_MS,
      staleThresholdMs: DEFAULT_STALE_THRESHOLD_MS,
    };

    this.state = {
      daemon,
      heartbeatHistory: [],
      schedulingRounds: 0,
      startedAt: now,
    };

    this.emitReceipt(ReceiptType.PLAN_STARTED, OrchestrationReasonCode.DAEMON_NOT_STARTED, {
      daemonId,
      daemonName: name,
    });

    this.state = {
      ...this.state,
      daemon: { ...daemon, status: DaemonStatus.RUNNING },
    };

    return this.makeDecision(
      true,
      OrchestrationReasonCode.DAEMON_NOT_STARTED,
      `Daemon ${name} started`,
    );
  }

  stop(daemonId: string): OrchestrationDecision {
    if (!this.state) {
      return this.makeDecision(
        false,
        OrchestrationReasonCode.DAEMON_NOT_STARTED,
        "Scheduler is not running",
      );
    }

    if (this.state.daemon.daemonId !== daemonId) {
      return this.makeDecision(
        false,
        OrchestrationReasonCode.VALIDATION_FAILED,
        `Daemon ${daemonId} does not match running daemon ${this.state.daemon.daemonId}`,
      );
    }

    const now = new Date().toISOString();
    this.state = {
      ...this.state,
      daemon: { ...this.state.daemon, status: DaemonStatus.STOPPING },
    };

    this.releaseLease();

    this.state = {
      ...this.state,
      daemon: { ...this.state.daemon, status: DaemonStatus.STOPPED, stoppedAt: now },
      stoppedAt: now,
    };

    this.emitReceipt(ReceiptType.PLAN_CANCELLED, OrchestrationReasonCode.DAEMON_SHUTDOWN, {
      daemonId,
    });

    return this.makeDecision(
      true,
      OrchestrationReasonCode.DAEMON_SHUTDOWN,
      `Daemon ${daemonId} stopped`,
    );
  }

  // --------------------------------------------------------------------------
  // Heartbeat
  // --------------------------------------------------------------------------

  recordHeartbeat(daemonId: string): OrchestrationDecision {
    if (!this.state) {
      return this.makeDecision(
        false,
        OrchestrationReasonCode.DAEMON_NOT_STARTED,
        "Scheduler is not running",
      );
    }

    if (this.state.daemon.daemonId !== daemonId) {
      return this.makeDecision(
        false,
        OrchestrationReasonCode.VALIDATION_FAILED,
        "Daemon ID mismatch",
      );
    }

    const now = new Date().toISOString();
    const record: HeartbeatRecord = {
      daemonId,
      timestamp: now,
      status: this.state.daemon.status,
      leaseId: this.state.lease?.leaseId,
    };

    this.heartbeatHistory.push(record);
    this.state = {
      ...this.state,
      daemon: { ...this.state.daemon, lastHeartbeatAt: now },
      heartbeatHistory: [...this.heartbeatHistory],
    };

    return this.makeDecision(
      true,
      OrchestrationReasonCode.LEASE_RENEWED,
      "Heartbeat recorded",
    );
  }

  isStale(): boolean {
    if (!this.state || !this.state.daemon.lastHeartbeatAt) {
      return false;
    }

    const lastHeartbeat = new Date(this.state.daemon.lastHeartbeatAt).getTime();
    const now = Date.now();
    return now - lastHeartbeat > this.state.daemon.staleThresholdMs;
  }

  detectStaleDaemons(daemonId: string): OrchestrationDecision {
    if (this.isStale()) {
      if (this.state) {
        this.state = {
          ...this.state,
          daemon: { ...this.state.daemon, status: DaemonStatus.STALE },
        };
      }

      this.emitReceipt(ReceiptType.STEP_FAILED, OrchestrationReasonCode.LEASE_STALE, {
        daemonId,
        reason: "Stale daemon detected",
      });

      return this.makeDecision(
        false,
        OrchestrationReasonCode.LEASE_STALE,
        "Daemon is stale",
      );
    }

    return this.makeDecision(
      true,
      OrchestrationReasonCode.LEASE_RENEWED,
      "Daemon is healthy",
    );
  }

  // --------------------------------------------------------------------------
  // Lease management
  // --------------------------------------------------------------------------

  acquireLease(daemonId: string): OrchestrationDecision {
    if (!this.state) {
      return this.makeDecision(
        false,
        OrchestrationReasonCode.DAEMON_NOT_STARTED,
        "Scheduler is not running",
      );
    }

    if (this.state.lease && this.state.lease.status === "active") {
      if (this.state.lease.daemonId === daemonId) {
        return this.makeDecision(
          true,
          OrchestrationReasonCode.LEASE_ACQUIRED,
          "Lease already held by this daemon",
        );
      }

      return this.makeDecision(
        false,
        OrchestrationReasonCode.LEASE_CONFLICT,
        `Lease held by daemon ${this.state.lease.daemonId}`,
      );
    }

    if (this.state.lease && this.state.lease.status === "active") {
      const leaseExpiry = new Date(this.state.lease.expiresAt).getTime();
      if (Date.now() < leaseExpiry) {
        return this.makeDecision(
          false,
          OrchestrationReasonCode.LEASE_CONFLICT,
          "Active lease conflict",
        );
      }
    }

    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + DEFAULT_LEASE_DURATION_MS).toISOString();

    const lease: SchedulerLease = {
      leaseId: `lease-${daemonId}-${Date.now()}`,
      daemonId,
      acquiredAt: now,
      expiresAt,
      status: "active",
      version: 1,
    };

    this.state = {
      ...this.state,
      lease,
      daemon: {
        ...this.state.daemon,
        leaseId: lease.leaseId,
        leaseAcquiredAt: now,
        leaseExpiresAt: expiresAt,
      },
    };

    this.emitReceipt(ReceiptType.PLAN_STARTED, OrchestrationReasonCode.LEASE_ACQUIRED, {
      leaseId: lease.leaseId,
      daemonId,
    });

    return this.makeDecision(
      true,
      OrchestrationReasonCode.LEASE_ACQUIRED,
      `Lease acquired: ${lease.leaseId}`,
    );
  }

  renewLease(daemonId: string): OrchestrationDecision {
    if (!this.state || !this.state.lease) {
      return this.makeDecision(
        false,
        OrchestrationReasonCode.LEASE_EXPIRED,
        "No lease to renew",
      );
    }

    if (this.state.lease.daemonId !== daemonId) {
      return this.makeDecision(
        false,
        OrchestrationReasonCode.LEASE_CONFLICT,
        "Lease not owned by this daemon",
      );
    }

    if (this.state.lease.status !== "active") {
      return this.makeDecision(
        false,
        OrchestrationReasonCode.LEASE_EXPIRED,
        `Lease is ${this.state.lease.status}`,
      );
    }

    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + DEFAULT_LEASE_DURATION_MS).toISOString();

    this.state = {
      ...this.state,
      lease: {
        ...this.state.lease,
        renewedAt: now,
        expiresAt,
        version: this.state.lease.version + 1,
      },
    };

    return this.makeDecision(
      true,
      OrchestrationReasonCode.LEASE_RENEWED,
      "Lease renewed",
    );
  }

  releaseLease(): OrchestrationDecision {
    if (!this.state || !this.state.lease) {
      return this.makeDecision(
        false,
        OrchestrationReasonCode.LEASE_EXPIRED,
        "No lease to release",
      );
    }

    const now = new Date().toISOString();
    const leaseId = this.state.lease.leaseId;

    this.state = {
      ...this.state,
      lease: {
        ...this.state.lease,
        status: "released",
        releasedAt: now,
      },
      daemon: {
        ...this.state.daemon,
        leaseId: undefined,
        leaseAcquiredAt: undefined,
        leaseExpiresAt: undefined,
      },
    };

    this.emitReceipt(ReceiptType.PLAN_CANCELLED, OrchestrationReasonCode.LEASE_RELEASED, {
      leaseId,
    });

    return this.makeDecision(
      true,
      OrchestrationReasonCode.LEASE_RELEASED,
      `Lease released: ${leaseId}`,
    );
  }

  validateLease(leaseId: string): OrchestrationDecision {
    if (!this.state || !this.state.lease) {
      return this.makeDecision(
        false,
        OrchestrationReasonCode.LEASE_EXPIRED,
        "No active lease",
      );
    }

    if (this.state.lease.leaseId !== leaseId) {
      return this.makeDecision(
        false,
        OrchestrationReasonCode.LEASE_CONFLICT,
        "Lease ID mismatch",
      );
    }

    if (this.state.lease.status !== "active") {
      return this.makeDecision(
        false,
        OrchestrationReasonCode.LEASE_EXPIRED,
        `Lease is ${this.state.lease.status}`,
      );
    }

    const expiresAt = new Date(this.state.lease.expiresAt).getTime();
    if (Date.now() > expiresAt) {
      this.state = {
        ...this.state,
        lease: { ...this.state.lease, status: "expired" },
      };

      return this.makeDecision(
        false,
        OrchestrationReasonCode.LEASE_EXPIRED,
        "Lease has expired",
      );
    }

    return this.makeDecision(
      true,
      OrchestrationReasonCode.LEASE_ACQUIRED,
      "Lease is valid",
    );
  }

  // --------------------------------------------------------------------------
  // Scheduling loop
  // --------------------------------------------------------------------------

  schedulingRound(daemonId: string): OrchestrationDecision {
    if (!this.state) {
      return this.makeDecision(
        false,
        OrchestrationReasonCode.DAEMON_NOT_STARTED,
        "Scheduler is not running",
      );
    }

    if (this.state.daemon.status !== DaemonStatus.RUNNING) {
      return this.makeDecision(
        false,
        OrchestrationReasonCode.DAEMON_SHUTDOWN,
        `Scheduler is ${this.state.daemon.status}`,
      );
    }

    const now = new Date().toISOString();
    this.state = {
      ...this.state,
      schedulingRounds: this.state.schedulingRounds + 1,
      lastSchedulingRoundAt: now,
    };

    return this.makeDecision(
      true,
      OrchestrationReasonCode.PLAN_STARTED,
      `Scheduling round ${this.state.schedulingRounds} completed`,
    );
  }

  // --------------------------------------------------------------------------
  // Accessors
  // --------------------------------------------------------------------------

  getState(): SchedulerState | null {
    return this.state ? { ...this.state, heartbeatHistory: [...this.heartbeatHistory] } : null;
  }

  getStatus(): DaemonStatus {
    return this.state?.daemon.status ?? DaemonStatus.STOPPED;
  }

  isRunning(): boolean {
    return this.state?.daemon.status === DaemonStatus.RUNNING;
  }

  getAllReceipts(): OrchestrationReceipt[] {
    return [...this.receipts];
  }

  getAllDecisions(): OrchestrationDecision[] {
    return [...this.decisions];
  }

  // --------------------------------------------------------------------------
  // Internal helpers
  // --------------------------------------------------------------------------

  private makeDecision(
    allowed: boolean,
    reasonCode: OrchestrationReasonCode,
    message: string,
  ): OrchestrationDecision {
    const decision: OrchestrationDecision = {
      decisionId: `daemon-decision-${Date.now()}`,
      runId: "",
      planId: "",
      allowed,
      reasonCode,
      message,
      decidedAt: new Date().toISOString(),
      approvalRequired: false,
      approvalGranted: false,
    };
    this.decisions.push(decision);
    return decision;
  }

  private emitReceipt(
    type: ReceiptType,
    reasonCode: OrchestrationReasonCode,
    data: Record<string, unknown>,
  ): OrchestrationReceipt {
    const receipt: OrchestrationReceipt = {
      receiptId: `daemon-receipt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      runId: "",
      planId: "",
      timestamp: new Date().toISOString(),
      reasonCode,
      data,
    };
    this.receipts.push(receipt);
    return receipt;
  }
}
