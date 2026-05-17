// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import {
  createTestPayload,
  serializeJson,
  deserializeJson,
  serializeBinary,
  deserializeBinary,
  serializeZeroCopy,
  deserializeZeroCopy,
  runSerializationBenchmark,
  summarizeSerialization,
  DEFAULT_SERIALIZATION_CONFIG,
} from "./serialization-benchmark";

describe("createTestPayload", () => {
  it("creates payload with expected structure", () => {
    const payload = createTestPayload(100);
    expect(payload.id).toBe("payload-100");
    expect(payload.timestamp).toBeGreaterThan(0);
    expect(Array.isArray(payload.data)).toBe(true);
    expect(typeof payload.metadata).toBe("object");
  });

  it("scales data array with target size", () => {
    const small = createTestPayload(100);
    const large = createTestPayload(1000);
    expect(large.data.length).toBeGreaterThan(small.data.length);
  });

  it("includes metadata with size info", () => {
    const payload = createTestPayload(500);
    expect(payload.metadata.size).toBe("500");
    expect(payload.metadata.type).toBe("benchmark");
  });
});

describe("serializeJson", () => {
  it("serializes payload to JSON string", () => {
    const payload = createTestPayload(100);
    const json = serializeJson(payload);
    expect(typeof json).toBe("string");
    expect(json.length).toBeGreaterThan(0);
  });
});

describe("deserializeJson", () => {
  it("round-trips JSON correctly", () => {
    const payload = createTestPayload(100);
    const json = serializeJson(payload);
    const recovered = deserializeJson(json);
    expect(recovered.id).toBe(payload.id);
    expect(recovered.timestamp).toBe(payload.timestamp);
    expect(recovered.data).toEqual(payload.data);
    expect(recovered.metadata).toEqual(payload.metadata);
  });
});

describe("serializeBinary", () => {
  it("serializes payload to Buffer", () => {
    const payload = createTestPayload(100);
    const buf = serializeBinary(payload);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(0);
  });

  it("produces a valid binary buffer with round-trip correctness", () => {
    const payload = createTestPayload(10000);
    const buf = serializeBinary(payload);
    expect(Buffer.isBuffer(buf)).toBe(true);
    const recovered = deserializeBinary(buf);
    expect(recovered.id).toBe(payload.id);
    expect(recovered.data.length).toBe(payload.data.length);
  });
});

describe("deserializeBinary", () => {
  it("round-trips binary correctly", () => {
    const payload = createTestPayload(100);
    const buf = serializeBinary(payload);
    const recovered = deserializeBinary(buf);
    expect(recovered.id).toBe(payload.id);
    expect(recovered.timestamp).toBe(payload.timestamp);
    expect(recovered.data).toEqual(payload.data);
    expect(recovered.metadata).toEqual(payload.metadata);
  });
});

describe("serializeZeroCopy", () => {
  it("serializes payload to ArrayBuffer", () => {
    const payload = createTestPayload(100);
    const ab = serializeZeroCopy(payload);
    expect(ab instanceof ArrayBuffer).toBe(true);
    expect(ab.byteLength).toBeGreaterThan(0);
  });
});

describe("deserializeZeroCopy", () => {
  it("round-trips zero-copy correctly", () => {
    const payload = createTestPayload(100);
    const ab = serializeZeroCopy(payload);
    const recovered = deserializeZeroCopy(ab);
    expect(recovered.id).toBe(payload.id);
    expect(recovered.timestamp).toBe(payload.timestamp);
    expect(recovered.data).toEqual(payload.data);
    expect(recovered.metadata).toEqual(payload.metadata);
  });
});

describe("runSerializationBenchmark", () => {
  it("returns results for each format and size", () => {
    const config = {
      payloadSizes: [100],
      iterations: 10,
    };
    const results = runSerializationBenchmark(config);
    expect(results).toHaveLength(3);
    expect(results.map((r) => r.format)).toContain("json");
    expect(results.map((r) => r.format)).toContain("binary");
    expect(results.map((r) => r.format)).toContain("zerocopy");
  });

  it("includes stats for serialize and deserialize", () => {
    const config = {
      payloadSizes: [100],
      iterations: 10,
    };
    const results = runSerializationBenchmark(config);
    for (const result of results) {
      expect(result.serialize.meanMs).toBeGreaterThanOrEqual(0);
      expect(result.deserialize.meanMs).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("summarizeSerialization", () => {
  it("produces formatted output", () => {
    const results = [
      {
        format: "json" as const,
        payloadSize: 100,
        serialize: { meanMs: 0.1, medianMs: 0.1, p95Ms: 0.2, p99Ms: 0.2, minMs: 0.05, maxMs: 0.3 },
        deserialize: { meanMs: 0.1, medianMs: 0.1, p95Ms: 0.2, p99Ms: 0.2, minMs: 0.05, maxMs: 0.3 },
        speedupVsJson: 1,
      },
    ];
    const summary = summarizeSerialization(results);
    expect(summary).toContain("Serialization Benchmark Summary");
    expect(summary).toContain("json");
  });
});

describe("DEFAULT_SERIALIZATION_CONFIG", () => {
  it("has expected default values", () => {
    expect(DEFAULT_SERIALIZATION_CONFIG.payloadSizes).toEqual([100, 1000, 10000, 100000]);
    expect(DEFAULT_SERIALIZATION_CONFIG.iterations).toBe(100);
  });
});
