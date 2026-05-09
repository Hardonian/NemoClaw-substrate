// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { CapabilitySnapshot, DegradedState, DeviceHealthStatus, NodeDescriptor, RuntimeCapabilityFlags } from "./types";

export interface WorkerAdapterDescriptor {
  adapterId: string;
  provider: string;
  routedProvider?: string;
  executionMode: "local" | "remote";
  deterministic: true;
  supportsLiveExecution: false;
}

export interface WorkerCapabilityProbe {
  requestId: string;
  includeModels: boolean;
}

export interface WorkerProbeResult {
  descriptor: WorkerAdapterDescriptor;
  node: NodeDescriptor;
  capabilitySnapshot: CapabilitySnapshot;
  degradedStates: DegradedState[];
}

export interface WorkerHealthProbe {
  nowIso: string;
}

export interface WorkerHealthResult {
  descriptor: WorkerAdapterDescriptor;
  status: DeviceHealthStatus;
  degradedStates: DegradedState[];
}

export interface WorkerAdapter {
  descriptor(): WorkerAdapterDescriptor;
  probeCapabilities(input: WorkerCapabilityProbe): WorkerProbeResult;
  probeHealth(input: WorkerHealthProbe): WorkerHealthResult;
}

export interface ProviderCapabilityInput {
  provider: string;
  routedProvider?: string;
  model?: string;
  flags?: Partial<RuntimeCapabilityFlags>;
  maxContextTokens?: number;
  source: string;
  capturedAt: string;
}

export interface ProviderCapabilityAdapter {
  toNodeDescriptor(input: ProviderCapabilityInput): WorkerProbeResult;
}
