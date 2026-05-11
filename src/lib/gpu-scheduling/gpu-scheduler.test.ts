// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach } from "vitest";
import { GpuScheduler, InMemoryGpuSchedulingStore } from "./gpu-scheduler";
import {
  GpuCapability,
  GpuAvailability,
  VramFit,
  RuntimeLoad,
  ThermalState,
  QueueDepth,
  GpuSchedulingReasonCode,
  DEFAULT_GPU_SCHEDULING_POLICY,
} from "./types";

function createTestGpu(): GpuCapability {
  return {
    gpuId: "gpu-0",
    deviceId: "0",
    name: "Test GPU",
    architecture: "test",
    totalVramMb: 24576,
    cudaCores: 10240,
    tensorCores: 320,
    computeCapability: "8.0",
    driverVersion: "535.0.0",
    runtimeVersion: "12.0",
    multiProcessorCount: 80,
    maxThreadsPerBlock: 1024,
    supportsMig: true,
  };
}

describe("gpu scheduler", () => {
  let scheduler: GpuScheduler;
  let store: InMemoryGpuSchedulingStore;

  beforeEach(() => {
    store = new InMemoryGpuSchedulingStore();
    scheduler = new GpuScheduler(store);
    store.setCapability(createTestGpu());
  });

  describe("gpu unavailable degrades", () => {
    it("should return empty scores when GPU scheduling is not enabled", () => {
      const originalEnv = process.env.NEMOCLAW_GPU_AWARE_SCHEDULING;
      try {
        delete process.env.NEMOCLAW_GPU_AWARE_SCHEDULING;

        store.setAvailability({
          gpuId: "gpu-0",
          available: true,
          reasonCode: GpuSchedulingReasonCode.GPU_AVAILABLE,
          reasonMessage: "Available",
          telemetryTimestamp: new Date().toISOString(),
          telemetrySource: "test",
          degraded: false,
        });

        const scores = scheduler.scoreGpus(8192);

        expect(scores.length).toBe(0);
      } finally {
        if (originalEnv !== undefined) {
          process.env.NEMOCLAW_GPU_AWARE_SCHEDULING = originalEnv;
        }
      }
    });

    it("should score zero for unavailable GPU", () => {
      const originalEnv = process.env.NEMOCLAW_GPU_AWARE_SCHEDULING;
      try {
        process.env.NEMOCLAW_GPU_AWARE_SCHEDULING = "1";

        store.setAvailability({
          gpuId: "gpu-0",
          available: false,
          reasonCode: GpuSchedulingReasonCode.GPU_UNAVAILABLE,
          reasonMessage: "Not available",
          telemetryTimestamp: new Date().toISOString(),
          telemetrySource: "test",
          degraded: false,
        });

        const scores = scheduler.scoreGpus(8192);

        expect(scores.length).toBe(1);
        expect(scores[0].score).toBe(0);
      } finally {
        if (originalEnv !== undefined) {
          process.env.NEMOCLAW_GPU_AWARE_SCHEDULING = originalEnv;
        }
      }
    });

    it("should degrade scoring when telemetry is unavailable", () => {
      const originalEnv = process.env.NEMOCLAW_GPU_AWARE_SCHEDULING;
      try {
        process.env.NEMOCLAW_GPU_AWARE_SCHEDULING = "1";

        store.setAvailability({
          gpuId: "gpu-0",
          available: true,
          reasonCode: GpuSchedulingReasonCode.GPU_AVAILABLE,
          reasonMessage: "Available",
          telemetryTimestamp: new Date().toISOString(),
          telemetrySource: "test",
          degraded: false,
        });

        const scores = scheduler.scoreGpus(8192);

        expect(scores.length).toBe(1);
        expect(scores[0].degradationFlags.length).toBeGreaterThan(0);
      } finally {
        if (originalEnv !== undefined) {
          process.env.NEMOCLAW_GPU_AWARE_SCHEDULING = originalEnv;
        }
      }
    });
  });

  describe("gpu scoring", () => {
    beforeEach(() => {
      process.env.NEMOCLAW_GPU_AWARE_SCHEDULING = "1";
    });

    it("should score GPU with full telemetry", () => {
      store.setAvailability({
        gpuId: "gpu-0",
        available: true,
        reasonCode: GpuSchedulingReasonCode.GPU_AVAILABLE,
        reasonMessage: "Available",
        telemetryTimestamp: new Date().toISOString(),
        telemetrySource: "test",
        degraded: false,
      });

      store.setVramFit({
        gpuId: "gpu-0",
        totalVramMb: 24576,
        usedVramMb: 8192,
        availableVramMb: 16384,
        requiredVramMb: 8192,
        fits: true,
        utilizationPct: 33,
        telemetryTimestamp: new Date().toISOString(),
      });

      store.setRuntimeLoad({
        gpuId: "gpu-0",
        gpuUtilizationPct: 30,
        memoryUtilizationPct: 33,
        activeProcesses: 1,
        runningKernels: 2,
        queueDepth: 0,
        avgKernelDurationMs: 100,
        telemetryTimestamp: new Date().toISOString(),
      });

      store.setThermalState({
        gpuId: "gpu-0",
        temperatureCelsius: 65,
        thermalThrottle: false,
        powerLimitW: 300,
        currentPowerW: 150,
        fanSpeedPct: 50,
        telemetryTimestamp: new Date().toISOString(),
      });

      store.setQueueDepth({
        gpuId: "gpu-0",
        pendingJobs: 0,
        runningJobs: 1,
        maxConcurrentJobs: 10,
        avgWaitTimeMs: 50,
        telemetryTimestamp: new Date().toISOString(),
      });

      const scores = scheduler.scoreGpus(8192);

      expect(scores.length).toBe(1);
      expect(scores[0].score).toBeGreaterThan(0);
      expect(scores[0].diagnostics.length).toBe(0);
    });
  });
});
