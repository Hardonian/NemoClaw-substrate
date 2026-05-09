// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { CapabilitySnapshot, DegradedState, ModelCapability, NodeDescriptor, RuntimeCapabilityFlags } from "./types";
import type { ProviderCapabilityAdapter, ProviderCapabilityInput, WorkerProbeResult } from "./worker-adapters";

function runtimeFlags(flags?: Partial<RuntimeCapabilityFlags>): RuntimeCapabilityFlags {
  return {
    streaming: flags?.streaming ?? false,
    tools: flags?.tools ?? false,
    batch: flags?.batch ?? false,
    multimodal: flags?.multimodal ?? false,
    quantization: flags?.quantization ?? false,
  };
}

export class LocalProviderCapabilityAdapter implements ProviderCapabilityAdapter {
  toNodeDescriptor(input: ProviderCapabilityInput): WorkerProbeResult {
    const nodeId = `provider:${input.provider}${input.routedProvider ? `:${input.routedProvider}` : ""}`;
    const degradedStates: DegradedState[] = [];
    const models: ModelCapability[] = [];

    if (input.model) {
      models.push({
        modelId: input.model,
        maxContextTokens: input.maxContextTokens ?? 0,
        flags: runtimeFlags(input.flags),
        inferenceConstraints: [],
        executionRestrictions: [],
      });
      if (input.maxContextTokens === undefined) {
        degradedStates.push({
          category: "partial_capability",
          reason: "model metadata incomplete",
          affectedSubsystem: "provider-capability-adapter",
          severity: "warning",
          reasonCode: "capability_missing",
          explanation: "maxContextTokens unavailable from provider metadata",
          sourceComponent: "local-provider-capability-adapter",
          timestamp: input.capturedAt,
        });
      }
    }

    const capabilities: CapabilitySnapshot = {
      version: "1",
      capturedAt: input.capturedAt,
      source: input.source,
      runtimeBackend: input.provider,
      executionMode: "local",
      gpus: [],
      models,
      policyTags: [],
      reliabilityTags: [],
      runtimeTags: [],
      transportRequirements: [],
    };

    degradedStates.push({
      category: "unknown",
      reason: "gpu inventory unavailable",
      affectedSubsystem: "provider-capability-adapter",
      severity: "info",
      reasonCode: "capability_missing",
      explanation: "No observed GPU/VRAM telemetry in provider metadata.",
      sourceComponent: "local-provider-capability-adapter",
      timestamp: input.capturedAt,
    });

    const node: NodeDescriptor = {
      version: "1",
      nodeId,
      role: "local",
      transport: "unknown",
      endpoint: `provider://${input.provider}`,
      trustClass: "trusted",
      registeredAt: input.capturedAt,
      lastHeartbeatAt: input.capturedAt,
      health: "unknown",
      metadata: { provider: input.provider, routedProvider: input.routedProvider ?? "" },
      capabilities,
    };

    return {
      descriptor: {
        adapterId: "local-provider-capability-adapter",
        provider: input.provider,
        routedProvider: input.routedProvider,
        executionMode: "local",
        deterministic: true,
        supportsLiveExecution: false,
      },
      node,
      capabilitySnapshot: capabilities,
      degradedStates,
    };
  }
}
