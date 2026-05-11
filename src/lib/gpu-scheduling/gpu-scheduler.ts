// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * GPU-aware scheduling implementation.
 *
 * Hard rules:
 * - Telemetry is evidence, not authority
 * - Unavailable telemetry degrades
 * - No fabricated GPU data
 * - Scoring deterministic
 * - Diagnostics explain selection
 */

import {
  GpuCapability,
  GpuAvailability,
  VramFit,
  RuntimeLoad,
  ThermalState,
  QueueDepth,
  ModelResidency,
  GpuScore,
  GpuSchedulingDecision,
  GpuSchedulingPolicy,
  GpuScoringWeights,
  GpuSchedulingReasonCode,
  GpuLoadLevel,
  GpuThermalLevel,
  DEFAULT_GPU_SCORING_WEIGHTS,
  DEFAULT_GPU_SCHEDULING_POLICY,
  isVramFit,
  getLoadLevel,
  getThermalLevel,
  isQueueAvailable,
  validateGpuScore,
} from "./types";

import { isGpuAwareSchedulingEnabled } from "../orchestration/types";

// ============================================================================
// Store interface
// ============================================================================

export interface GpuSchedulingStore {
  getCapabilities(): GpuCapability[];
  getAvailability(gpuId: string): GpuAvailability | undefined;
  getVramFit(gpuId: string): VramFit | undefined;
  getRuntimeLoad(gpuId: string): RuntimeLoad | undefined;
  getThermalState(gpuId: string): ThermalState | undefined;
  getQueueDepth(gpuId: string): QueueDepth | undefined;
  getModelResidency(gpuId: string, modelId: string): ModelResidency | undefined;
}

export class InMemoryGpuSchedulingStore implements GpuSchedulingStore {
  private capabilities = new Map<string, GpuCapability>();
  private availability = new Map<string, GpuAvailability>();
  private vramFit = new Map<string, VramFit>();
  private runtimeLoad = new Map<string, RuntimeLoad>();
  private thermalState = new Map<string, ThermalState>();
  private queueDepth = new Map<string, QueueDepth>();
  private modelResidency = new Map<string, ModelResidency>();

  setCapability(gpu: GpuCapability): void {
    this.capabilities.set(gpu.gpuId, gpu);
  }

  setAvailability(avail: GpuAvailability): void {
    this.availability.set(avail.gpuId, avail);
  }

  setVramFit(fit: VramFit): void {
    this.vramFit.set(fit.gpuId, fit);
  }

  setRuntimeLoad(load: RuntimeLoad): void {
    this.runtimeLoad.set(load.gpuId, load);
  }

  setThermalState(thermal: ThermalState): void {
    this.thermalState.set(thermal.gpuId, thermal);
  }

  setQueueDepth(depth: QueueDepth): void {
    this.queueDepth.set(depth.gpuId, depth);
  }

  setModelResidency(residency: ModelResidency): void {
    const key = `${residency.gpuId}:${residency.modelId}`;
    this.modelResidency.set(key, residency);
  }

  getCapabilities(): GpuCapability[] {
    return Array.from(this.capabilities.values());
  }

  getAvailability(gpuId: string): GpuAvailability | undefined {
    return this.availability.get(gpuId);
  }

  getVramFit(gpuId: string): VramFit | undefined {
    return this.vramFit.get(gpuId);
  }

  getRuntimeLoad(gpuId: string): RuntimeLoad | undefined {
    return this.runtimeLoad.get(gpuId);
  }

  getThermalState(gpuId: string): ThermalState | undefined {
    return this.thermalState.get(gpuId);
  }

  getQueueDepth(gpuId: string): QueueDepth | undefined {
    return this.queueDepth.get(gpuId);
  }

  getModelResidency(gpuId: string, modelId: string): ModelResidency | undefined {
    return this.modelResidency.get(`${gpuId}:${modelId}`);
  }
}

// ============================================================================
// GPU scheduler
// ============================================================================

export class GpuScheduler {
  private store: GpuSchedulingStore;
  private policy: GpuSchedulingPolicy;
  private scores: GpuScore[] = [];
  private decisions: GpuSchedulingDecision[] = [];

  constructor(store: GpuSchedulingStore, policy?: GpuSchedulingPolicy) {
    this.store = store;
    this.policy = policy ?? DEFAULT_GPU_SCHEDULING_POLICY;
  }

  updatePolicy(policy: GpuSchedulingPolicy): void {
    this.policy = policy;
  }

  scoreGpus(requiredVramMb: number, modelId?: string): GpuScore[] {
    if (!isGpuAwareSchedulingEnabled()) {
      return [];
    }

    const capabilities = this.store.getCapabilities();
    const scores: GpuScore[] = [];

    for (const gpu of capabilities) {
      const score = this.scoreGpu(gpu.gpuId, requiredVramMb, modelId);
      scores.push(score);
    }

    scores.sort((a, b) => b.score - a.score);
    this.scores = scores;
    return scores;
  }

  selectGpu(requiredVramMb: number, modelId?: string): GpuSchedulingDecision {
    if (!isGpuAwareSchedulingEnabled()) {
      return {
        gpuId: "",
        score: 0,
        reasonCode: GpuSchedulingReasonCode.GPU_UNAVAILABLE,
        diagnostics: ["GPU-aware scheduling is not enabled"],
        selected: false,
      };
    }

    const scores = this.scoreGpus(requiredVramMb, modelId);
    if (scores.length === 0) {
      return {
        gpuId: "",
        score: 0,
        reasonCode: GpuSchedulingReasonCode.GPU_UNAVAILABLE,
        diagnostics: ["No GPUs available for scoring"],
        selected: false,
      };
    }

    const bestScore = scores[0];
    const decision: GpuSchedulingDecision = {
      gpuId: bestScore.gpuId,
      score: bestScore.score,
      reasonCode: bestScore.degradationFlags.length > 0
        ? GpuSchedulingReasonCode.GPU_SCORING_DEGRADED
        : GpuSchedulingReasonCode.GPU_SELECTED,
      diagnostics: bestScore.diagnostics,
      selected: true,
    };

    this.decisions.push(decision);
    return decision;
  }

  // --------------------------------------------------------------------------
  // Internal scoring
  // --------------------------------------------------------------------------

  private scoreGpu(gpuId: string, requiredVramMb: number, modelId?: string): GpuScore {
    const diagnostics: string[] = [];
    const degradationFlags: string[] = [];

    const availability = this.store.getAvailability(gpuId);
    if (!availability || !availability.available) {
      return {
        gpuId,
        score: 0,
        vramFitScore: 0,
        loadScore: 0,
        thermalScore: 0,
        queueScore: 0,
        residencyBonus: 0,
        degradationFlags: ["gpu_unavailable"],
        diagnostics: ["GPU is not available"],
        scoredAt: new Date().toISOString(),
      };
    }

    if (availability.degraded) {
      degradationFlags.push(availability.degradationReason ?? "unknown_degradation");
      diagnostics.push(`GPU degraded: ${availability.degradationReason}`);
    }

    const vramFit = this.store.getVramFit(gpuId);
    let vramFitScore = 0;
    if (vramFit) {
      vramFitScore = isVramFit(vramFit) ? 1 : 0;
      if (!isVramFit(vramFit)) {
        degradationFlags.push("vram_insufficient");
        diagnostics.push(`Insufficient VRAM: ${vramFit.availableVramMb}MB available, ${requiredVramMb}MB required`);
      }
    } else {
      degradationFlags.push("vram_telemetry_unavailable");
      diagnostics.push("VRAM telemetry unavailable");
    }

    const load = this.store.getRuntimeLoad(gpuId);
    let loadScore = 0;
    if (load) {
      const level = getLoadLevel(load);
      switch (level) {
        case "low":
          loadScore = 1;
          break;
        case "medium":
          loadScore = 0.7;
          break;
        case "high":
          loadScore = 0.3;
          break;
        case "critical":
          loadScore = 0;
          degradationFlags.push("load_critical");
          diagnostics.push("GPU load critical");
          break;
      }
    } else {
      degradationFlags.push("load_telemetry_unavailable");
      diagnostics.push("Load telemetry unavailable");
    }

    const thermal = this.store.getThermalState(gpuId);
    let thermalScore = 0;
    if (thermal) {
      const level = getThermalLevel(thermal);
      switch (level) {
        case "ok":
          thermalScore = 1;
          break;
        case "throttled":
          thermalScore = 0.3;
          degradationFlags.push("thermal_throttled");
          diagnostics.push(`GPU thermal throttled: ${thermal.temperatureCelsius}C`);
          break;
        case "critical":
          thermalScore = 0;
          degradationFlags.push("thermal_critical");
          diagnostics.push(`GPU thermal critical: ${thermal.temperatureCelsius}C`);
          break;
      }
    } else {
      degradationFlags.push("thermal_telemetry_unavailable");
      diagnostics.push("Thermal telemetry unavailable");
    }

    const queue = this.store.getQueueDepth(gpuId);
    let queueScore = 0;
    if (queue) {
      queueScore = isQueueAvailable(queue) ? 1 : 0;
      if (!isQueueAvailable(queue)) {
        degradationFlags.push("queue_full");
        diagnostics.push("GPU queue full");
      }
    } else {
      degradationFlags.push("queue_telemetry_unavailable");
      diagnostics.push("Queue telemetry unavailable");
    }

    let residencyBonus = 0;
    if (modelId) {
      const residency = this.store.getModelResidency(gpuId, modelId);
      if (residency && residency.resident) {
        residencyBonus = this.policy.scoringWeights.residencyBonus;
        diagnostics.push(`Model ${modelId} resident on GPU`);
      }
    }

    const weights = this.policy.scoringWeights;
    const rawScore =
      vramFitScore * weights.vramWeight +
      loadScore * weights.loadWeight +
      thermalScore * weights.thermalWeight +
      queueScore * weights.queueWeight +
      residencyBonus;

    const score = degradationFlags.length > 0 ? rawScore * 0.5 : rawScore;

    return {
      gpuId,
      score: Math.round(score * 100) / 100,
      vramFitScore,
      loadScore,
      thermalScore,
      queueScore,
      residencyBonus,
      degradationFlags,
      diagnostics,
      scoredAt: new Date().toISOString(),
    };
  }

  // --------------------------------------------------------------------------
  // Accessors
  // --------------------------------------------------------------------------

  getScores(): GpuScore[] {
    return [...this.scores];
  }

  getDecisions(): GpuSchedulingDecision[] {
    return [...this.decisions];
  }
}
