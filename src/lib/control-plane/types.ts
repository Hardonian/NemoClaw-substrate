// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export type DegradedCategory =
  | "healthy"
  | "constrained"
  | "degraded"
  | "unavailable"
  | "partial_capability"
  | "approval_blocked"
  | "stale"
  | "unreachable"
  | "unknown";

export type DegradedReasonCode =
  | "none"
  | "node_missing"
  | "heartbeat_stale"
  | "capability_missing"
  | "transport_unreachable"
  | "policy_blocked"
  | "approval_required"
  | "constraint_unsatisfied"
  | "unknown_error";

export interface DegradedState {
  category: DegradedCategory;
  reason: string;
  affectedSubsystem: string;
  severity: "info" | "warning" | "error" | "critical";
  reasonCode: DegradedReasonCode;
  explanation: string;
  sourceComponent: string;
  timestamp: string;
  recoverySuggestion?: string;
}

export type NodeRole = "local" | "remote" | "edge" | "control";
export type NodeTransport = "unix" | "http" | "https" | "grpc" | "ssh" | "unknown";
export type DeviceHealthStatus = "healthy" | "stale" | "unreachable" | "unknown";

export interface GpuCapability {
  vendor: string;
  model: string;
  vramMb: number;
  count: number;
  computeCapability?: string;
  quantizationSupport?: string[];
}

export interface RuntimeCapabilityFlags {
  streaming: boolean;
  tools: boolean;
  batch: boolean;
  multimodal: boolean;
  quantization: boolean;
}

export interface ModelCapability {
  modelId: string;
  maxContextTokens: number;
  flags: RuntimeCapabilityFlags;
  inferenceConstraints: string[];
  executionRestrictions: string[];
}

export interface CapabilitySnapshot {
  version: string;
  capturedAt: string;
  source: string;
  runtimeBackend: string;
  executionMode: "local" | "remote";
  gpus: GpuCapability[];
  models: ModelCapability[];
  policyTags: string[];
  reliabilityTags: string[];
  runtimeTags: string[];
  transportRequirements: string[];
}

export interface NodeDescriptor {
  version: string;
  nodeId: string;
  role: NodeRole;
  transport: NodeTransport;
  endpoint: string;
  trustClass: "trusted" | "untrusted" | "restricted";
  registeredAt: string;
  lastHeartbeatAt: string;
  health: DeviceHealthStatus;
  metadata: Record<string, string | number | boolean>;
  capabilities: CapabilitySnapshot;
}

export interface ControlRequestEnvelope {
  version: string;
  requestId: string;
  receivedAt: string;
  source: string;
  actor: string;
  action: string;
  requestedModel?: string;
  constraints: string[];
  metadata: Record<string, string>;
}

export interface ControlDecisionReason { code: string; explanation: string; source: string; }
export interface SchedulingCandidate { nodeId: string; modelId: string; score: number; reasons: ControlDecisionReason[]; }
export interface SchedulingDecision { selected?: SchedulingCandidate; rejected: SchedulingCandidate[]; reasons: ControlDecisionReason[]; }
export interface PolicyDecisionReason { code: string; explanation: string; source: string; }
export interface PolicyDecision { allowed: boolean; reasons: PolicyDecisionReason[]; requiredApproval: boolean; }
export interface ControlDecision {
  version: string;
  requestId: string;
  decidedAt: string;
  scheduling: SchedulingDecision;
  policy: PolicyDecision;
  degradedStates: DegradedState[];
}

export type ExecutionPhase = "received" | "policy" | "scheduling" | "execution" | "completed" | "failed";
export interface ExecutionReceipt {
  version: string;
  receiptId: string;
  requestId: string;
  createdAt: string;
  phases: Array<{ phase: ExecutionPhase; at: string; notes?: string }>;
  nodeId?: string;
  modelId?: string;
  schedulingDecision?: SchedulingDecision;
  policyDecision?: PolicyDecision;
  degradedEvents: DegradedState[];
  fallbackAttempts: Array<{ at: string; reason: string; target?: string }>;
  toolInvocations: Array<{ name: string; at: string; durationMs?: number; status: "ok" | "failed" }>;
  timing: { totalMs?: number; queueMs?: number; executionMs?: number };
  provenance: { source: string; lineage: string[]; replayVersion: string; exportedAt?: string };
  operatorOverrides: Array<{ at: string; actor: string; reason: string }>;
}
