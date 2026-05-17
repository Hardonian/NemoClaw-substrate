// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * GPU-aware scheduling types.
 *
 * Hard rules:
 * - Telemetry is evidence, not authority
 * - Unavailable telemetry degrades
 * - No fabricated GPU data
 * - Scoring deterministic
 * - Diagnostics explain selection
 */

// ============================================================================
// GPU scheduling reason codes
// ============================================================================

export enum GpuSchedulingReasonCode {
  // GPU availability
  GPU_AVAILABLE = "gpu_available",
  GPU_UNAVAILABLE = "gpu_unavailable",
  GPU_TELEMETRY_UNAVAILABLE = "gpu_telemetry_unavailable",

  // Capacity
  GPU_VRAM_INSUFFICIENT = "gpu_vram_insufficient",
  GPU_VRAM_AVAILABLE = "gpu_vram_available",
  GPU_QUEUE_FULL = "gpu_queue_full",
  GPU_QUEUE_AVAILABLE = "gpu_queue_available",

  // Thermal
  GPU_THERMAL_OK = "gpu_thermal_ok",
  GPU_THERMAL_THROTTLED = "gpu_thermal_throttled",
  GPU_THERMAL_CRITICAL = "gpu_thermal_critical",

  // Load
  GPU_LOAD_LOW = "gpu_load_low",
  GPU_LOAD_MEDIUM = "gpu_load_medium",
  GPU_LOAD_HIGH = "gpu_load_high",
  GPU_LOAD_CRITICAL = "gpu_load_critical",

  // Model residency
  MODEL_RESIDENT = "model_resident",
  MODEL_NOT_RESIDENT = "model_not_resident",
  MODEL_LOADING = "model_loading",

  // Scoring
  GPU_SCORED = "gpu_scored",
  GPU_SCORING_DEGRADED = "gpu_scoring_degraded",
  GPU_SELECTED = "gpu_selected",
  GPU_NOT_SELECTED = "gpu_not_selected",
}

// ============================================================================
// GPU capability
// ============================================================================

export interface GpuCapability {
  gpuId: string;
  deviceId: string;
  name: string;
  architecture: string;
  totalVramMb: number;
  cudaCores: number;
  tensorCores: number;
  computeCapability: string;
  driverVersion: string;
  runtimeVersion: string;
  multiProcessorCount: number;
  maxThreadsPerBlock: number;
  supportsMig: boolean;
  migProfiles?: string[];
}

// ============================================================================
// GPU availability
// ============================================================================

export interface GpuAvailability {
  gpuId: string;
  available: boolean;
  reasonCode: GpuSchedulingReasonCode;
  reasonMessage: string;
  telemetryTimestamp: string;
  telemetrySource: string;
  degraded: boolean;
  degradationReason?: string;
}

// ============================================================================
// VRAM fit
// ============================================================================

export interface VramFit {
  gpuId: string;
  totalVramMb: number;
  usedVramMb: number;
  availableVramMb: number;
  requiredVramMb: number;
  fits: boolean;
  utilizationPct: number;
  telemetryTimestamp: string;
}

export function isVramFit(fit: VramFit): boolean {
  return fit.availableVramMb >= fit.requiredVramMb;
}

// ============================================================================
// Runtime load
// ============================================================================

export interface RuntimeLoad {
  gpuId: string;
  gpuUtilizationPct: number;
  memoryUtilizationPct: number;
  activeProcesses: number;
  runningKernels: number;
  queueDepth: number;
  avgKernelDurationMs: number;
  telemetryTimestamp: string;
}

export function getLoadLevel(load: RuntimeLoad): GpuLoadLevel {
  if (load.gpuUtilizationPct >= 90) return "critical";
  if (load.gpuUtilizationPct >= 70) return "high";
  if (load.gpuUtilizationPct >= 40) return "medium";
  return "low";
}

export type GpuLoadLevel = "low" | "medium" | "high" | "critical";

// ============================================================================
// Thermal state
// ============================================================================

export interface ThermalState {
  gpuId: string;
  temperatureCelsius: number;
  thermalThrottle: boolean;
  powerLimitW: number;
  currentPowerW: number;
  fanSpeedPct: number;
  telemetryTimestamp: string;
}

export function getThermalLevel(thermal: ThermalState): GpuThermalLevel {
  if (thermal.temperatureCelsius >= 87) return "critical";
  if (thermal.temperatureCelsius >= 80) return "throttled";
  return "ok";
}

export type GpuThermalLevel = "ok" | "throttled" | "critical";

// ============================================================================
// Queue depth
// ============================================================================

export interface QueueDepth {
  gpuId: string;
  pendingJobs: number;
  runningJobs: number;
  maxConcurrentJobs: number;
  avgWaitTimeMs: number;
  telemetryTimestamp: string;
}

export function isQueueAvailable(depth: QueueDepth): boolean {
  return depth.runningJobs < depth.maxConcurrentJobs;
}

// ============================================================================
// Model residency
// ============================================================================

export interface ModelResidency {
  gpuId: string;
  modelId: string;
  resident: boolean;
  loadedAt?: string;
  vramUsageMb: number;
  loadTimeMs?: number;
}

// ============================================================================
// GPU scoring
// ============================================================================

export interface GpuScore {
  gpuId: string;
  score: number;
  vramFitScore: number;
  loadScore: number;
  thermalScore: number;
  queueScore: number;
  residencyBonus: number;
  degradationFlags: string[];
  diagnostics: string[];
  scoredAt: string;
}

export interface GpuSchedulingDecision {
  gpuId: string;
  score: number;
  reasonCode: GpuSchedulingReasonCode;
  diagnostics: string[];
  selected: boolean;
}

// ============================================================================
// GPU scheduling policy
// ============================================================================

export interface GpuSchedulingPolicy {
  policyId: string;
  name: string;
  version: string;
  enabled: boolean;
  requireGpu: boolean;
  minVramMb: number;
  maxThermalCelsius: number;
  maxUtilizationPct: number;
  maxQueueDepth: number;
  preferResidentModels: boolean;
  scoringWeights: GpuScoringWeights;
  degradeOnMissingTelemetry: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GpuScoringWeights {
  vramWeight: number;
  loadWeight: number;
  thermalWeight: number;
  queueWeight: number;
  residencyBonus: number;
}

export const DEFAULT_GPU_SCORING_WEIGHTS: GpuScoringWeights = {
  vramWeight: 0.3,
  loadWeight: 0.25,
  thermalWeight: 0.2,
  queueWeight: 0.15,
  residencyBonus: 0.1,
};

export const DEFAULT_GPU_SCHEDULING_POLICY: GpuSchedulingPolicy = {
  policyId: "default",
  name: "Default GPU Scheduling Policy",
  version: "1.0.0",
  enabled: false,
  requireGpu: false,
  minVramMb: 0,
  maxThermalCelsius: 85,
  maxUtilizationPct: 80,
  maxQueueDepth: 10,
  preferResidentModels: true,
  scoringWeights: DEFAULT_GPU_SCORING_WEIGHTS,
  degradeOnMissingTelemetry: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ============================================================================
// Validation
// ============================================================================

export function validateGpuCapability(
  gpu: Partial<GpuCapability>,
): string[] {
  const errors: string[] = [];

  if (!gpu.gpuId) {
    errors.push("gpuId is required");
  }
  if (!gpu.name) {
    errors.push("name is required");
  }
  if (typeof gpu.totalVramMb !== "number" || gpu.totalVramMb <= 0) {
    errors.push("totalVramMb must be a positive number");
  }

  return errors;
}

export function validateGpuScore(score: Partial<GpuScore>): string[] {
  const errors: string[] = [];

  if (!score.gpuId) {
    errors.push("gpuId is required");
  }
  if (typeof score.score !== "number") {
    errors.push("score is required");
  }
  if (!score.scoredAt) {
    errors.push("scoredAt is required");
  }

  return errors;
}
