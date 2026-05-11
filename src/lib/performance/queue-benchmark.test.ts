// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import {
  createQueueMessage,
  validateQueueBatch,
  benchmarkQueueBurst,
  runQueueBenchmark,
  summarizeQueue,
  DEFAULT_QUEUE_CONFIG,
} from "../../dist/lib/performance/queue-benchmark";

describe("createQueueMessage", () => {
  it("creates message with correct id", () => {
    const msg = createQueueMessage(42, 64);
    expect(msg.id).toBe(42);
  });

  it("creates message with correct payload size", () => {
    const msg = createQueueMessage(1, 128);
    expect(msg.payload.length).toBe(128);
  });

  it("includes a timestamp", () => {
    const msg = createQueueMessage(0, 10);
    expect(msg.timestamp).toBeGreaterThan(BigInt(0));
  });
});

describe("validateQueueBatch", () => {
  it("returns durations for each message", () => {
    const messages = [
      createQueueMessage(0, 64),
      createQueueMessage(1, 64),
      createQueueMessage(2, 64),
    ];
    const durations = validateQueueBatch(messages);
    expect(durations).toHaveLength(3);
  });

  it("returns non-negative durations", () => {
    const messages = Array.from({ length: 10 }, (_, i) => createQueueMessage(i, 64));
    const durations = validateQueueBatch(messages);
    durations.forEach((d) => expect(d).toBeGreaterThanOrEqual(0));
  });

  it("throws on invalid message id", () => {
    const messages = [{ id: -1, payload: "x", timestamp: BigInt(Date.now()) }];
    expect(() => validateQueueBatch(messages)).toThrow("Invalid message id");
  });

  it("throws on empty payload", () => {
    const messages = [{ id: 0, payload: "", timestamp: BigInt(Date.now()) }];
    expect(() => validateQueueBatch(messages)).toThrow("Empty message payload");
  });

  it("throws on invalid timestamp", () => {
    const messages = [{ id: 0, payload: "x", timestamp: BigInt(0) }];
    expect(() => validateQueueBatch(messages)).toThrow("Invalid message timestamp");
  });
});

describe("benchmarkQueueBurst", () => {
  it("returns valid benchmark result", () => {
    const result = benchmarkQueueBurst(100, 1);
    expect(result.burstSize).toBe(100);
    expect(result.totalMessages).toBe(100);
    expect(result.totalTimeMs).toBeGreaterThanOrEqual(0);
    expect(result.msPerMessage).toBeGreaterThanOrEqual(0);
  });

  it("computes stats correctly", () => {
    const result = benchmarkQueueBurst(50, 1);
    expect(result.stats.meanMs).toBeGreaterThanOrEqual(0);
    expect(result.stats.minMs).toBeLessThanOrEqual(result.stats.maxMs);
  });

  it("evaluates target correctly", () => {
    const result = benchmarkQueueBurst(10, 100);
    expect(result.targetMsPerMessage).toBe(100);
    expect(result.meetsTarget).toBe(true);
  });
});

describe("runQueueBenchmark", () => {
  it("returns results for each burst size", () => {
    const config = {
      messageCount: 1000,
      burstSizes: [100, 1000],
      targetMsPerMessage: 1,
    };
    const results = runQueueBenchmark(config);
    expect(results).toHaveLength(2);
    expect(results[0].burstSize).toBe(100);
    expect(results[1].burstSize).toBe(1000);
  });
});

describe("summarizeQueue", () => {
  it("produces formatted output", () => {
    const results = [
      {
        burstSize: 100,
        totalMessages: 100,
        totalTimeMs: 10,
        msPerMessage: 0.1,
        meetsTarget: true,
        targetMsPerMessage: 1,
      },
    ];
    const summary = summarizeQueue(results);
    expect(summary).toContain("Queue Benchmark Summary");
    expect(summary).toContain("burst=100");
    expect(summary).toContain("OK");
  });
});

describe("DEFAULT_QUEUE_CONFIG", () => {
  it("has expected default values", () => {
    expect(DEFAULT_QUEUE_CONFIG.messageCount).toBe(10000);
    expect(DEFAULT_QUEUE_CONFIG.burstSizes).toEqual([100, 1000, 5000]);
    expect(DEFAULT_QUEUE_CONFIG.targetMsPerMessage).toBe(1);
  });
});
