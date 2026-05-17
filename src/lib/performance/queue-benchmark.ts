// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Queue validation performance under peak burst load.
 *
 * Measures ms-per-message processing targets under simulated burst conditions.
 */

import { computeStats } from "./benchmark";

export interface QueueBenchmarkConfig {
  messageCount: number;
  burstSizes: number[];
  targetMsPerMessage: number;
}

export const DEFAULT_QUEUE_CONFIG: QueueBenchmarkConfig = {
  messageCount: 10000,
  burstSizes: [100, 1000, 5000],
  targetMsPerMessage: 1,
};

export interface QueueBenchmarkResult {
  burstSize: number;
  totalMessages: number;
  totalTimeMs: number;
  msPerMessage: number;
  stats: {
    meanMs: number;
    medianMs: number;
    p95Ms: number;
    p99Ms: number;
    minMs: number;
    maxMs: number;
  };
  meetsTarget: boolean;
  targetMsPerMessage: number;
}

export interface QueueMessage {
  id: number;
  payload: string;
  timestamp: bigint;
}

/**
 * Create a synthetic queue message for benchmarking.
 */
export function createQueueMessage(id: number, payloadSize: number): QueueMessage {
  return {
    id,
    payload: "x".repeat(payloadSize),
    timestamp: process.hrtime.bigint(),
  };
}

/**
 * Simulate queue validation of a batch of messages.
 * Returns per-message processing durations in milliseconds.
 */
export function validateQueueBatch(messages: QueueMessage[]): number[] {
  const durationsMs: number[] = [];

  for (const msg of messages) {
    const start = process.hrtime.bigint();
    _validateMessage(msg);
    const end = process.hrtime.bigint();
    durationsMs.push(Number(end - start) / 1e6);
  }

  return durationsMs;
}

/**
 * Run queue benchmark for a given burst size.
 */
export function benchmarkQueueBurst(
  burstSize: number,
  targetMsPerMessage: number,
): QueueBenchmarkResult {
  const messages: QueueMessage[] = [];
  for (let i = 0; i < burstSize; i++) {
    messages.push(createQueueMessage(i, 64));
  }

  const batchStart = process.hrtime.bigint();
  const durationsMs = validateQueueBatch(messages);
  const batchEnd = process.hrtime.bigint();

  const totalTimeMs = Number(batchEnd - batchStart) / 1e6;
  const stats = computeStats(durationsMs);
  const msPerMessage = totalTimeMs / burstSize;

  return {
    burstSize,
    totalMessages: burstSize,
    totalTimeMs: Math.round(totalTimeMs * 1000) / 1000,
    msPerMessage: Math.round(msPerMessage * 1000) / 1000,
    stats,
    meetsTarget: msPerMessage <= targetMsPerMessage,
    targetMsPerMessage,
  };
}

/**
 * Run queue benchmarks across all configured burst sizes.
 */
export function runQueueBenchmark(
  config: QueueBenchmarkConfig = DEFAULT_QUEUE_CONFIG,
): QueueBenchmarkResult[] {
  return config.burstSizes.map((burstSize) =>
    benchmarkQueueBurst(burstSize, config.targetMsPerMessage),
  );
}

/**
 * Summarize queue benchmark results for reporting.
 */
export function summarizeQueue(results: QueueBenchmarkResult[]): string {
  const lines = ["Queue Benchmark Summary:"];
  for (const r of results) {
    const status = r.meetsTarget ? "OK" : "FAIL";
    lines.push(
      `  burst=${r.burstSize}: ${r.totalMessages} messages in ${r.totalTimeMs.toFixed(3)}ms, ` +
        `${r.msPerMessage.toFixed(3)}ms/msg [target=${r.targetMsPerMessage}ms] [${status}]`,
    );
  }
  const allPass = results.every((r) => r.meetsTarget);
  lines.push(`Overall: ${allPass ? "PASS" : "FAIL"}`);
  return lines.join("\n");
}

/**
 * Internal message validation logic.
 * Performs basic structural checks on a queue message.
 */
function _validateMessage(msg: QueueMessage): void {
  if (msg.id < 0) {
    throw new Error("Invalid message id");
  }
  if (msg.payload.length === 0) {
    throw new Error("Empty message payload");
  }
  if (msg.timestamp <= BigInt(0)) {
    throw new Error("Invalid message timestamp");
  }
}
