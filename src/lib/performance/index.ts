// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Performance hardening module barrel exports.
 *
 * Re-exports all performance benchmark utilities for convenient importing.
 */

export {
  runBenchmark,
  runBenchmarkSync,
  runSuite,
  passesBaseline,
  computeStats,
  percentile,
  formatResult,
  formatSuite,
  type BenchmarkBaseline,
  type BenchmarkResult,
  type BenchmarkSuite,
  type BenchmarkFn,
} from "./benchmark";

export {
  runScalingTest,
  summarizeScaling,
  measureResourceGrowth,
  type ScalingTestResult,
  type ScalingTestConfig,
  type WorkloadFn,
  DEFAULT_SCALING_CONFIG,
} from "./scaling-test";

export {
  runProofPackBenchmark,
  summarizeProofPack,
  generateProofPack,
  benchmarkProofPackConcurrency,
  type ProofPackBenchmarkResult,
  type ProofPackBenchmarkConfig,
  DEFAULT_PROOFPACK_CONFIG,
} from "./proofpack-benchmark";

export {
  runQueueBenchmark,
  summarizeQueue,
  benchmarkQueueBurst,
  validateQueueBatch,
  createQueueMessage,
  type QueueBenchmarkResult,
  type QueueBenchmarkConfig,
  type QueueMessage,
  DEFAULT_QUEUE_CONFIG,
} from "./queue-benchmark";

export {
  runSerializationBenchmark,
  summarizeSerialization,
  createTestPayload,
  serializeJson,
  deserializeJson,
  serializeBinary,
  deserializeBinary,
  serializeZeroCopy,
  deserializeZeroCopy,
  type SerializationResult,
  type SerializationBenchmarkConfig,
  type TestPayload,
  DEFAULT_SERIALIZATION_CONFIG,
} from "./serialization-benchmark";

export {
  profileOperation,
  profileOperations,
  summarizeProfile,
  createNoopCollector,
  createSimulatedCollector,
  type ProfileResult,
  type ProfileConfig,
  type DiagnosticCollector,
  DEFAULT_PROFILE_CONFIG,
} from "./profile-report";
