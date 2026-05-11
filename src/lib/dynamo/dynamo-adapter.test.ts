// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach } from "vitest";
import {
  DynamoAdapter,
  InMemoryDynamoAdapterStore,
} from "./dynamo-adapter";
import {
  DynamoAdapterConfig,
  DynamoReasonCode,
  createDefaultDynamoConfig,
} from "./types";

describe("dynamo adapter", () => {
  let adapter: DynamoAdapter;
  let store: InMemoryDynamoAdapterStore;

  beforeEach(() => {
    store = new InMemoryDynamoAdapterStore();
    adapter = new DynamoAdapter(store);
  });

  describe("dynamo unavailable fails closed", () => {
    it("should fail closed when adapter is disabled", () => {
      const originalEnv = process.env.NEMOCLAW_DYNAMO_ADAPTER;
      try {
        delete process.env.NEMOCLAW_DYNAMO_ADAPTER;

        const result = adapter.initialize();

        expect(result.success).toBe(false);
        expect(result.reasonCode).toBe(DynamoReasonCode.DYNAMO_ADAPTER_DISABLED);
      } finally {
        if (originalEnv !== undefined) {
          process.env.NEMOCLAW_DYNAMO_ADAPTER = originalEnv;
        }
      }
    });

    it("should fail closed when Dynamo is unavailable", () => {
      const originalEnv = process.env.NEMOCLAW_DYNAMO_ADAPTER;
      try {
        process.env.NEMOCLAW_DYNAMO_ADAPTER = "1";

        const result = adapter.initialize();

        expect(result.success).toBe(false);
        expect(result.reasonCode).toBe(DynamoReasonCode.DYNAMO_UNAVAILABLE);
      } finally {
        if (originalEnv !== undefined) {
          process.env.NEMOCLAW_DYNAMO_ADAPTER = originalEnv;
        }
      }
    });

    it("should register worker only when connected", () => {
      const originalEnv = process.env.NEMOCLAW_DYNAMO_ADAPTER;
      try {
        process.env.NEMOCLAW_DYNAMO_ADAPTER = "1";

        const result = adapter.registerWorker({
          workerId: "worker-1",
          name: "Test Worker",
          version: "1.0.0",
          capabilities: ["test"],
          status: "registered",
        });

        expect(result.success).toBe(false);
        expect(result.reasonCode).toBe(DynamoReasonCode.DYNAMO_UNAVAILABLE);
      } finally {
        if (originalEnv !== undefined) {
          process.env.NEMOCLAW_DYNAMO_ADAPTER = originalEnv;
        }
      }
    });
  });

  describe("health probe", () => {
    it("should report critical health when disconnected and fail-closed", () => {
      const probe = adapter.healthProbe();

      expect(probe.status).toBe("critical");
      expect(probe.error).toBeDefined();
    });
  });

  describe("status report", () => {
    it("should report implementation gaps", () => {
      const report = adapter.getStatusReport();

      expect(report.enabled).toBe(false);
      expect(report.connected).toBe(false);
      expect(report.gaps.length).toBeGreaterThan(0);
    });
  });
});
