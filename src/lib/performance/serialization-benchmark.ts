// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Serialization path optimization benchmarks.
 *
 * Compares binary vs text serialization performance and measures
 * zero-copy buffer advantages for large payloads.
 */

import { computeStats } from "./benchmark";

export interface SerializationBenchmarkConfig {
  payloadSizes: number[];
  iterations: number;
}

export const DEFAULT_SERIALIZATION_CONFIG: SerializationBenchmarkConfig = {
  payloadSizes: [100, 1000, 10000, 100000],
  iterations: 100,
};

export interface SerializationResult {
  format: "json" | "binary" | "zerocopy";
  payloadSize: number;
  serialize: {
    meanMs: number;
    medianMs: number;
    p95Ms: number;
    p99Ms: number;
    minMs: number;
    maxMs: number;
  };
  deserialize: {
    meanMs: number;
    medianMs: number;
    p95Ms: number;
    p99Ms: number;
    minMs: number;
    maxMs: number;
  };
  speedupVsJson: number;
}

export interface TestPayload {
  id: string;
  timestamp: number;
  data: number[];
  metadata: Record<string, string>;
}

/**
 * Create a test payload of approximately the given size in bytes.
 */
export function createTestPayload(targetSize: number): TestPayload {
  const overheadEstimate = 50;
  const dataLength = Math.max(1, Math.floor((targetSize - overheadEstimate) / 8));

  return {
    id: `payload-${targetSize}`,
    timestamp: Date.now(),
    data: Array.from({ length: dataLength }, (_, i) => i),
    metadata: {
      size: String(targetSize),
      type: "benchmark",
    },
  };
}

/**
 * Serialize payload to JSON string.
 */
export function serializeJson(payload: TestPayload): string {
  return JSON.stringify(payload);
}

/**
 * Deserialize JSON string back to payload.
 */
export function deserializeJson(text: string): TestPayload {
  return JSON.parse(text);
}

/**
 * Serialize payload to binary Buffer (simple custom format).
 * Format: [4-byte id length][id bytes][8-byte timestamp][N * 8-byte doubles][4-byte meta count][meta entries]
 */
export function serializeBinary(payload: TestPayload): Buffer {
  const idBytes = Buffer.from(payload.id, "utf8");
  const metaKeys = Object.keys(payload.metadata);
  const metaEntrySizes = metaKeys.map((k) => {
    const keyBuf = Buffer.from(k, "utf8");
    const valBuf = Buffer.from(payload.metadata[k], "utf8");
    return keyBuf.length + valBuf.length;
  });
  const metaTotalSize = metaEntrySizes.reduce((a, b) => a + b, 0);

  const totalSize =
    4 + idBytes.length + 8 + 4 + payload.data.length * 8 + 4 + metaTotalSize + metaKeys.length * 2;

  const buf = Buffer.alloc(totalSize);
  let offset = 0;

  buf.writeUInt32BE(idBytes.length, offset);
  offset += 4;
  idBytes.copy(buf, offset);
  offset += idBytes.length;

  buf.writeDoubleBE(payload.timestamp, offset);
  offset += 8;

  buf.writeUInt32BE(payload.data.length, offset);
  offset += 4;
  for (const value of payload.data) {
    buf.writeDoubleBE(value, offset);
    offset += 8;
  }

  buf.writeUInt32BE(metaKeys.length, offset);
  offset += 4;
  for (const key of metaKeys) {
    const keyBuf = Buffer.from(key, "utf8");
    const valBuf = Buffer.from(payload.metadata[key], "utf8");
    buf.writeUInt8(keyBuf.length, offset);
    offset += 1;
    keyBuf.copy(buf, offset);
    offset += keyBuf.length;
    buf.writeUInt8(valBuf.length, offset);
    offset += 1;
    valBuf.copy(buf, offset);
    offset += valBuf.length;
  }

  return buf;
}

/**
 * Deserialize binary Buffer back to payload.
 */
export function deserializeBinary(buf: Buffer): TestPayload {
  let offset = 0;

  const idLength = buf.readUInt32BE(offset);
  offset += 4;
  const id = buf.subarray(offset, offset + idLength).toString("utf8");
  offset += idLength;

  const timestamp = buf.readDoubleBE(offset);
  offset += 8;

  const dataLength = buf.readUInt32BE(offset);
  offset += 4;
  const data: number[] = [];
  for (let i = 0; i < dataLength; i++) {
    data.push(buf.readDoubleBE(offset));
    offset += 8;
  }

  const metaCount = buf.readUInt32BE(offset);
  offset += 4;
  const metadata: Record<string, string> = {};
  for (let i = 0; i < metaCount; i++) {
    const keyLen = buf.readUInt8(offset);
    offset += 1;
    const key = buf.subarray(offset, offset + keyLen).toString("utf8");
    offset += keyLen;
    const valLen = buf.readUInt8(offset);
    offset += 1;
    const value = buf.subarray(offset, offset + valLen).toString("utf8");
    offset += valLen;
    metadata[key] = value;
  }

  return { id, timestamp, data, metadata };
}

/**
 * Align offset to 8-byte boundary for Float64Array compatibility.
 */
function alignTo8(offset: number): number {
  return (offset + 7) & ~7;
}

/**
 * Zero-copy serialization: returns a view over an existing ArrayBuffer.
 * No allocation of intermediate buffers.
 */
export function serializeZeroCopy(payload: TestPayload): ArrayBuffer {
  const idBytes = new TextEncoder().encode(payload.id);
  const dataFloats = new Float64Array(payload.data);
  const metaEntries = Object.entries(payload.metadata);

  let totalSize = 4 + idBytes.length + 8 + 4 + dataFloats.byteLength + 4;
  for (const [k, v] of metaEntries) {
    totalSize += 2 + new TextEncoder().encode(k).length + new TextEncoder().encode(v).length;
  }
  // Add padding for Float64 alignment (up to 7 bytes after id, up to 7 after dataLength)
  totalSize += 7 + 7;

  const ab = new ArrayBuffer(totalSize);
  const view = new DataView(ab);
  let offset = 0;

  view.setUint32(offset, idBytes.length, false);
  offset += 4;
  new Uint8Array(ab, offset, idBytes.length).set(idBytes);
  offset += idBytes.length;

  offset = alignTo8(offset);
  view.setFloat64(offset, payload.timestamp, false);
  offset += 8;

  view.setUint32(offset, payload.data.length, false);
  offset += 4;
  offset = alignTo8(offset);
  for (let i = 0; i < payload.data.length; i++) {
    view.setFloat64(offset, payload.data[i], false);
    offset += 8;
  }

  view.setUint32(offset, metaEntries.length, false);
  offset += 4;
  for (const [k, v] of metaEntries) {
    const keyBytes = new TextEncoder().encode(k);
    const valBytes = new TextEncoder().encode(v);
    view.setUint8(offset, keyBytes.length);
    offset += 1;
    new Uint8Array(ab, offset, keyBytes.length).set(keyBytes);
    offset += keyBytes.length;
    view.setUint8(offset, valBytes.length);
    offset += 1;
    new Uint8Array(ab, offset, valBytes.length).set(valBytes);
    offset += valBytes.length;
  }

  return ab;
}

/**
 * Zero-copy deserialize: reads directly from ArrayBuffer without copying.
 */
export function deserializeZeroCopy(ab: ArrayBuffer): TestPayload {
  const view = new DataView(ab);
  let offset = 0;

  const idLength = view.getUint32(offset, false);
  offset += 4;
  const idBytes = new Uint8Array(ab, offset, idLength);
  const id = new TextDecoder().decode(idBytes);
  offset += idLength;

  offset = alignTo8(offset);
  const timestamp = view.getFloat64(offset, false);
  offset += 8;

  const dataLength = view.getUint32(offset, false);
  offset += 4;
  offset = alignTo8(offset);
  const data: number[] = [];
  for (let i = 0; i < dataLength; i++) {
    data.push(view.getFloat64(offset, false));
    offset += 8;
  }

  const metaCount = view.getUint32(offset, false);
  offset += 4;
  const metadata: Record<string, string> = {};
  for (let i = 0; i < metaCount; i++) {
    const keyLen = view.getUint8(offset);
    offset += 1;
    const keyBytes = new Uint8Array(ab, offset, keyLen);
    const key = new TextDecoder().decode(keyBytes);
    offset += keyLen;
    const valLen = view.getUint8(offset);
    offset += 1;
    const valBytes = new Uint8Array(ab, offset, valLen);
    const value = new TextDecoder().decode(valBytes);
    offset += valLen;
    metadata[key] = value;
  }

  return { id, timestamp, data, metadata };
}

/**
 * Benchmark a single serialization method.
 */
function benchmarkSerialize(
  payload: TestPayload,
  serializeFn: (p: TestPayload) => string | Buffer | ArrayBuffer,
  iterations: number,
): number[] {
  const durationsMs: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    serializeFn(payload);
    const end = process.hrtime.bigint();
    durationsMs.push(Number(end - start) / 1e6);
  }
  return durationsMs;
}

/**
 * Benchmark a single deserialization method.
 */
function benchmarkDeserialize<T>(
  data: T,
  deserializeFn: (d: T) => TestPayload,
  iterations: number,
): number[] {
  const durationsMs: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    deserializeFn(data);
    const end = process.hrtime.bigint();
    durationsMs.push(Number(end - start) / 1e6);
  }
  return durationsMs;
}

/**
 * Run serialization benchmarks across configured payload sizes.
 */
export function runSerializationBenchmark(
  config: SerializationBenchmarkConfig = DEFAULT_SERIALIZATION_CONFIG,
): SerializationResult[] {
  const results: SerializationResult[] = [];

  for (const size of config.payloadSizes) {
    const payload = createTestPayload(size);
    const jsonString = serializeJson(payload);
    const binaryBuf = serializeBinary(payload);
    const zeroCopyAb = serializeZeroCopy(payload);

    const jsonSerialize = computeStats(benchmarkSerialize(payload, serializeJson, config.iterations));
    const jsonDeserialize = computeStats(benchmarkDeserialize(jsonString, deserializeJson, config.iterations));

    const binSerialize = computeStats(benchmarkSerialize(payload, serializeBinary, config.iterations));
    const binDeserialize = computeStats(benchmarkDeserialize(binaryBuf, deserializeBinary, config.iterations));

    const zcSerialize = computeStats(benchmarkSerialize(payload, serializeZeroCopy, config.iterations));
    const zcDeserialize = computeStats(benchmarkDeserialize(zeroCopyAb, deserializeZeroCopy, config.iterations));

    results.push({
      format: "json",
      payloadSize: size,
      serialize: {
        meanMs: jsonSerialize.meanMs,
        medianMs: jsonSerialize.medianMs,
        p95Ms: jsonSerialize.p95Ms,
        p99Ms: jsonSerialize.p99Ms,
        minMs: jsonSerialize.minMs,
        maxMs: jsonSerialize.maxMs,
      },
      deserialize: {
        meanMs: jsonDeserialize.meanMs,
        medianMs: jsonDeserialize.medianMs,
        p95Ms: jsonDeserialize.p95Ms,
        p99Ms: jsonDeserialize.p99Ms,
        minMs: jsonDeserialize.minMs,
        maxMs: jsonDeserialize.maxMs,
      },
      speedupVsJson: 1,
    });

    results.push({
      format: "binary",
      payloadSize: size,
      serialize: {
        meanMs: binSerialize.meanMs,
        medianMs: binSerialize.medianMs,
        p95Ms: binSerialize.p95Ms,
        p99Ms: binSerialize.p99Ms,
        minMs: binSerialize.minMs,
        maxMs: binSerialize.maxMs,
      },
      deserialize: {
        meanMs: binDeserialize.meanMs,
        medianMs: binDeserialize.medianMs,
        p95Ms: binDeserialize.p95Ms,
        p99Ms: binDeserialize.p99Ms,
        minMs: binDeserialize.minMs,
        maxMs: binDeserialize.maxMs,
      },
      speedupVsJson:
        jsonSerialize.meanMs > 0 ? Math.round((jsonSerialize.meanMs / binSerialize.meanMs) * 100) / 100 : 1,
    });

    results.push({
      format: "zerocopy",
      payloadSize: size,
      serialize: {
        meanMs: zcSerialize.meanMs,
        medianMs: zcSerialize.medianMs,
        p95Ms: zcSerialize.p95Ms,
        p99Ms: zcSerialize.p99Ms,
        minMs: zcSerialize.minMs,
        maxMs: zcSerialize.maxMs,
      },
      deserialize: {
        meanMs: zcDeserialize.meanMs,
        medianMs: zcDeserialize.medianMs,
        p95Ms: zcDeserialize.p95Ms,
        p99Ms: zcDeserialize.p99Ms,
        minMs: zcDeserialize.minMs,
        maxMs: zcDeserialize.maxMs,
      },
      speedupVsJson:
        jsonSerialize.meanMs > 0 ? Math.round((jsonSerialize.meanMs / zcSerialize.meanMs) * 100) / 100 : 1,
    });
  }

  return results;
}

/**
 * Summarize serialization benchmark results.
 */
export function summarizeSerialization(results: SerializationResult[]): string {
  const lines = ["Serialization Benchmark Summary:"];
  for (const r of results) {
    lines.push(
      `  ${r.format} (${r.payloadSize}B): serialize=${r.serialize.meanMs.toFixed(4)}ms, ` +
        `deserialize=${r.deserialize.meanMs.toFixed(4)}ms, ` +
        `speedup vs JSON=${r.speedupVsJson.toFixed(2)}x`,
    );
  }
  return lines.join("\n");
}
