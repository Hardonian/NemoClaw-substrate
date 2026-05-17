// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach } from "vitest";
import { DaemonScheduler, DaemonStatus } from "./scheduler";

describe("daemon scheduler", () => {
  let scheduler: DaemonScheduler;

  beforeEach(() => {
    scheduler = new DaemonScheduler();
  });

  describe("daemon not started by default", () => {
    it("should be stopped by default", () => {
      expect(scheduler.getStatus()).toBe(DaemonStatus.STOPPED);
      expect(scheduler.isRunning()).toBe(false);
    });

    it("should not start without daemon scheduler enabled", () => {
      const originalEnv = process.env.NEMOCLAW_DAEMON_SCHEDULER;
      try {
        delete process.env.NEMOCLAW_DAEMON_SCHEDULER;

        const decision = scheduler.start("daemon-1", "Test Daemon");

        expect(decision.allowed).toBe(false);
        expect(scheduler.getStatus()).toBe(DaemonStatus.STOPPED);
      } finally {
        if (originalEnv !== undefined) {
          process.env.NEMOCLAW_DAEMON_SCHEDULER = originalEnv;
        }
      }
    });

    it("should start when daemon scheduler is enabled", () => {
      const originalEnv = process.env.NEMOCLAW_DAEMON_SCHEDULER;
      try {
        process.env.NEMOCLAW_DAEMON_SCHEDULER = "1";

        const decision = scheduler.start("daemon-1", "Test Daemon");

        expect(decision.allowed).toBe(true);
        expect(scheduler.isRunning()).toBe(true);
        expect(scheduler.getStatus()).toBe(DaemonStatus.RUNNING);
      } finally {
        if (originalEnv !== undefined) {
          process.env.NEMOCLAW_DAEMON_SCHEDULER = originalEnv;
        }
      }
    });
  });

  describe("stop/shutdown semantics", () => {
    beforeEach(() => {
      process.env.NEMOCLAW_DAEMON_SCHEDULER = "1";
    });

    it("should stop a running daemon", () => {
      scheduler.start("daemon-1", "Test Daemon");
      const decision = scheduler.stop("daemon-1");

      expect(decision.allowed).toBe(true);
      expect(scheduler.getStatus()).toBe(DaemonStatus.STOPPED);
    });

    it("should reject stop for non-running daemon", () => {
      const decision = scheduler.stop("daemon-1");

      expect(decision.allowed).toBe(false);
    });

    it("should reject stop for wrong daemon ID", () => {
      scheduler.start("daemon-1", "Test Daemon");
      const decision = scheduler.stop("daemon-2");

      expect(decision.allowed).toBe(false);
    });
  });

  describe("heartbeat monitoring", () => {
    beforeEach(() => {
      process.env.NEMOCLAW_DAEMON_SCHEDULER = "1";
      scheduler.start("daemon-1", "Test Daemon");
    });

    it("should record heartbeats", () => {
      const decision = scheduler.recordHeartbeat("daemon-1");

      expect(decision.allowed).toBe(true);
    });

    it("should reject heartbeat for wrong daemon", () => {
      const decision = scheduler.recordHeartbeat("daemon-2");

      expect(decision.allowed).toBe(false);
    });

    it("should reject heartbeat when scheduler not running", () => {
      scheduler.stop("daemon-1");
      const decision = scheduler.recordHeartbeat("daemon-1");

      expect(decision.allowed).toBe(false);
    });
  });

  describe("lease management", () => {
    beforeEach(() => {
      process.env.NEMOCLAW_DAEMON_SCHEDULER = "1";
      scheduler.start("daemon-1", "Test Daemon");
    });

    it("should acquire a lease", () => {
      const decision = scheduler.acquireLease("daemon-1");

      expect(decision.allowed).toBe(true);
    });

    it("should reject lease acquisition by conflicting daemon", () => {
      scheduler.acquireLease("daemon-1");
      const decision = scheduler.acquireLease("daemon-2");

      expect(decision.allowed).toBe(false);
    });

    it("should renew a lease", () => {
      scheduler.acquireLease("daemon-1");
      const decision = scheduler.renewLease("daemon-1");

      expect(decision.allowed).toBe(true);
    });

    it("should reject renewal by wrong daemon", () => {
      scheduler.acquireLease("daemon-1");
      const decision = scheduler.renewLease("daemon-2");

      expect(decision.allowed).toBe(false);
    });

    it("should release a lease", () => {
      scheduler.acquireLease("daemon-1");
      const decision = scheduler.releaseLease();

      expect(decision.allowed).toBe(true);
    });

    it("should validate a lease", () => {
      const acquireDecision = scheduler.acquireLease("daemon-1");
      const leaseId = (scheduler.getState()?.lease?.leaseId) ?? "";

      const decision = scheduler.validateLease(leaseId);

      expect(decision.allowed).toBe(true);
    });
  });

  describe("scheduling loop", () => {
    beforeEach(() => {
      process.env.NEMOCLAW_DAEMON_SCHEDULER = "1";
      scheduler.start("daemon-1", "Test Daemon");
    });

    it("should execute a scheduling round", () => {
      const decision = scheduler.schedulingRound("daemon-1");

      expect(decision.allowed).toBe(true);
      expect(scheduler.getState()?.schedulingRounds).toBe(1);
    });

    it("should reject scheduling round when not running", () => {
      scheduler.stop("daemon-1");
      const decision = scheduler.schedulingRound("daemon-1");

      expect(decision.allowed).toBe(false);
    });
  });

  describe("stale daemon detection", () => {
    beforeEach(() => {
      process.env.NEMOCLAW_DAEMON_SCHEDULER = "1";
      scheduler.start("daemon-1", "Test Daemon");
    });

    it("should detect stale daemon", () => {
      const decision = scheduler.detectStaleDaemons("daemon-1");

      expect(decision.allowed).toBe(true);
    });
  });
});
