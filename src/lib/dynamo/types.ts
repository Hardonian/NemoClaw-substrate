// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Dynamo adapter seam types.
 *
 * Hard rules:
 * - Do not claim full Dynamo support unless verified
 * - Adapter disabled by default
 * - Fail closed on unavailable Dynamo
 * - Docs classify implemented/scaffolded/planned clearly
 */

// ============================================================================
// Dynamo adapter reason codes
// ============================================================================

export enum DynamoReasonCode {
  // Connection status
  DYNAMO_CONNECTED = "dynamo_connected",
  DYNAMO_DISCONNECTED = "dynamo_disconnected",
  DYNAMO_UNAVAILABLE = "dynamo_unavailable",
  DYNAMO_FAILED = "dynamo_failed",
  DYNAMO_ADAPTER_DISABLED = "dynamo_adapter_disabled",

  // Health probe
  DYNAMO_HEALTH_OK = "dynamo_health_ok",
  DYNAMO_HEALTH_DEGRADED = "dynamo_health_degraded",
  DYNAMO_HEALTH_CRITICAL = "dynamo_health_critical",
  DYNAMO_HEALTH_UNKNOWN = "dynamo_health_unknown",

  // Worker operations
  DYNAMO_WORKER_REGISTERED = "dynamo_worker_registered",
  DYNAMO_WORKER_DEREGISTERED = "dynamo_worker_deregistered",
  DYNAMO_WORKER_NOT_FOUND = "dynamo_worker_not_found",
  DYNAMO_WORKER_CONFLICT = "dynamo_worker_conflict",

  // Capability operations
  DYNAMO_CAPABILITY_SNAPSHOT = "dynamo_capability_snapshot",
  DYNAMO_CAPABILITY_STALE = "dynamo_capability_stale",

  // Dispatch operations
  DYNAMO_DISPATCH_PLANNED = "dynamo_dispatch_planned",
  DYNAMO_DISPATCH_EXECUTED = "dynamo_dispatch_executed",
  DYNAMO_DISPATCH_FAILED = "dynamo_dispatch_failed",
  DYNAMO_DISPATCH_CANCELLED = "dynamo_dispatch_cancelled",
}

// ============================================================================
// Dynamo adapter config
// ============================================================================

export interface DynamoAdapterConfig {
  configId: string;
  enabled: boolean;
  endpoint?: string;
  region?: string;
  tableName?: string;
  authMethod: DynamoAuthMethod;
  connectionTimeoutMs: number;
  healthCheckIntervalMs: number;
  maxRetries: number;
  failClosed: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DynamoAuthMethod = "none" | "api_key" | "iam_role" | "service_principal";

export function createDefaultDynamoConfig(): DynamoAdapterConfig {
  const now = new Date().toISOString();
  return {
    configId: "default",
    enabled: false,
    authMethod: "none",
    connectionTimeoutMs: 5000,
    healthCheckIntervalMs: 30000,
    maxRetries: 3,
    failClosed: true,
    createdAt: now,
    updatedAt: now,
  };
}

// ============================================================================
// Dynamo worker descriptor
// ============================================================================

export interface DynamoWorkerDescriptor {
  workerId: string;
  name: string;
  version: string;
  capabilities: string[];
  status: DynamoWorkerStatus;
  registeredAt?: string;
  deregisteredAt?: string;
  lastHeartbeatAt?: string;
  metadata?: Record<string, unknown>;
}

export type DynamoWorkerStatus =
  | "registered"
  | "active"
  | "idle"
  | "busy"
  | "deregistered"
  | "unhealthy";

// ============================================================================
// Dynamo capability snapshot
// ============================================================================

export interface DynamoCapabilitySnapshot {
  snapshotId: string;
  workerId: string;
  capabilities: string[];
  capturedAt: string;
  stale: boolean;
  staleSince?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Dynamo dispatch plan
// ============================================================================

export interface DynamoDispatchPlan {
  planId: string;
  workerId: string;
  payload: Record<string, unknown>;
  status: DynamoDispatchStatus;
  createdAt: string;
  dispatchedAt?: string;
  completedAt?: string;
  failedAt?: string;
  failureReason?: string;
  metadata?: Record<string, unknown>;
}

export type DynamoDispatchStatus =
  | "pending"
  | "dispatched"
  | "completed"
  | "failed"
  | "cancelled";

// ============================================================================
// Dynamo health probe
// ============================================================================

export interface DynamoHealthProbe {
  probeId: string;
  configId: string;
  timestamp: string;
  status: DynamoHealthStatus;
  latencyMs: number;
  error?: string;
  details: Record<string, unknown>;
}

export type DynamoHealthStatus = "ok" | "degraded" | "critical" | "unknown";

export function isDynamoHealthy(probe: DynamoHealthProbe): boolean {
  return probe.status === "ok";
}

// ============================================================================
// Adapter status classification
// ============================================================================

export type ImplementationStatus = "implemented" | "scaffolded" | "planned";

export interface DynamoAdapterStatusReport {
  config: DynamoAdapterConfig;
  enabled: boolean;
  connected: boolean;
  lastHealthProbe?: DynamoHealthProbe;
  registeredWorkers: number;
  implementationStatuses: Record<string, ImplementationStatus>;
  gaps: string[];
  generatedAt: string;
}

// ============================================================================
// Validation
// ============================================================================

export function validateDynamoAdapterConfig(
  config: Partial<DynamoAdapterConfig>,
): string[] {
  const errors: string[] = [];

  if (!config.configId) {
    errors.push("configId is required");
  }
  if (typeof config.enabled !== "boolean") {
    errors.push("enabled must be a boolean");
  }
  if (typeof config.connectionTimeoutMs !== "number" || config.connectionTimeoutMs <= 0) {
    errors.push("connectionTimeoutMs must be a positive number");
  }
  if (typeof config.healthCheckIntervalMs !== "number" || config.healthCheckIntervalMs <= 0) {
    errors.push("healthCheckIntervalMs must be a positive number");
  }

  return errors;
}

export function validateDynamoWorkerDescriptor(
  worker: Partial<DynamoWorkerDescriptor>,
): string[] {
  const errors: string[] = [];

  if (!worker.workerId) {
    errors.push("workerId is required");
  }
  if (!worker.name) {
    errors.push("name is required");
  }
  if (!Array.isArray(worker.capabilities)) {
    errors.push("capabilities must be an array");
  }

  return errors;
}
