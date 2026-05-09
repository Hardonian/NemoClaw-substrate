// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { DeviceRegistry } from "./device-registry";
import { deterministicSerialize } from "./serde";
import type { DegradedState, ExecutionReceipt, NodeDescriptor } from "./types";
import { validateDegradedState } from "./validation";

function makeNode(nodeId: string, heartbeat = "2026-05-09T00:00:00.000Z"): NodeDescriptor {
  return {
    version: "1",
    nodeId,
    role: "local",
    transport: "unix",
    endpoint: "local:///sandbox",
    trustClass: "trusted",
    registeredAt: "2026-05-09T00:00:00.000Z",
    lastHeartbeatAt: heartbeat,
    health: "healthy",
    metadata: { queueDepth: 0 },
    capabilities: {
      version: "1",
      capturedAt: "2026-05-09T00:00:00.000Z",
      source: "test",
      runtimeBackend: "openai-compatible",
      executionMode: "local",
      gpus: [{ vendor: "nvidia", model: "L40S", vramMb: 48_000, count: 1 }],
      models: [{ modelId: "nvidia/model", maxContextTokens: 128000, flags: { streaming: true, tools: true, batch: false, multimodal: false, quantization: true }, inferenceConstraints: [], executionRestrictions: [] }],
      policyTags: ["default"],
      reliabilityTags: ["stable"],
      runtimeTags: ["sandbox"],
      transportRequirements: ["loopback"],
    },
  };
}

describe("control-plane foundations", () => {
  it("serializes deterministically", () => {
    const a = { b: 1, a: { d: 2, c: 3 } };
    const b = { a: { c: 3, d: 2 }, b: 1 };
    expect(deterministicSerialize(a)).toEqual(deterministicSerialize(b));
  });

  it("orders registry nodes deterministically", () => {
    const registry = new DeviceRegistry();
    registry.registerNode(makeNode("node-b"));
    registry.registerNode(makeNode("node-a"));
    expect(registry.listNodes().map((n) => n.nodeId)).toEqual(["node-a", "node-b"]);
  });

  it("returns explicit missing-node semantics", () => {
    const registry = new DeviceRegistry();
    expect(registry.updateHeartbeat("missing", "2026-05-09T00:00:01.000Z")).toEqual({ ok: false, reasonCode: "node_missing" });
  });

  it("marks stale heartbeats deterministically", () => {
    const registry = new DeviceRegistry();
    registry.registerNode(makeNode("node-a", "2026-05-09T00:00:00.000Z"));
    const summary = registry.summarizeHealth("2026-05-09T00:01:00.000Z", 5_000);
    expect(summary.byHealth.stale).toBe(1);
    expect(summary.staleNodes).toEqual(["node-a"]);
  });

  it("validates degraded state reason code semantics", () => {
    const degraded: DegradedState = {
      category: "healthy",
      reason: "ok",
      affectedSubsystem: "registry",
      severity: "info",
      reasonCode: "heartbeat_stale",
      explanation: "no",
      sourceComponent: "test",
      timestamp: "2026-05-09T00:00:00.000Z",
    };
    expect(validateDegradedState(degraded)).toContain("healthy category must use reasonCode=none");
  });

  it("keeps receipt serialization stable", () => {
    const receipt: ExecutionReceipt = {
      version: "1",
      receiptId: "r1",
      requestId: "q1",
      createdAt: "2026-05-09T00:00:00.000Z",
      phases: [{ phase: "received", at: "2026-05-09T00:00:00.000Z" }],
      degradedEvents: [],
      fallbackAttempts: [],
      toolInvocations: [],
      timing: {},
      provenance: { source: "test", lineage: ["root"], replayVersion: "1" },
      operatorOverrides: [],
    };
    expect(deterministicSerialize(receipt)).toMatchInlineSnapshot('"{\\"createdAt\\":\\"2026-05-09T00:00:00.000Z\\",\\"degradedEvents\\":[],\\"fallbackAttempts\\":[],\\"operatorOverrides\\":[],\\"phases\\":[{\\"at\\":\\"2026-05-09T00:00:00.000Z\\",\\"phase\\":\\"received\\"}],\\"provenance\\":{\\"lineage\\":[\\"root\\"],\\"replayVersion\\":\\"1\\",\\"source\\":\\"test\\"},\\"receiptId\\":\\"r1\\",\\"requestId\\":\\"q1\\",\\"timing\\":{},\\"toolInvocations\\":[],\\"version\\":\\"1\\"}"');
  });
});
