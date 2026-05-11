// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Dynamo adapter seam implementation.
 *
 * Hard rules:
 * - Do not claim full Dynamo support unless verified
 * - Adapter disabled by default
 * - Fail closed on unavailable Dynamo
 * - Docs classify implemented/scaffolded/planned clearly
 */

import {
  DynamoAdapterConfig,
  DynamoWorkerDescriptor,
  DynamoCapabilitySnapshot,
  DynamoDispatchPlan,
  DynamoHealthProbe,
  DynamoAdapterStatusReport,
  DynamoReasonCode,
  DynamoWorkerStatus,
  DynamoDispatchStatus,
  DynamoHealthStatus,
  ImplementationStatus,
  createDefaultDynamoConfig,
  isDynamoHealthy,
  validateDynamoAdapterConfig,
  validateDynamoWorkerDescriptor,
} from "./types";

import { isDynamoAdapterEnabled } from "../orchestration/types";

// ============================================================================
// Store interface
// ============================================================================

export interface DynamoAdapterStore {
  getConfig(): DynamoAdapterConfig;
  setConfig(config: DynamoAdapterConfig): void;
  getWorkers(): DynamoWorkerDescriptor[];
  setWorker(worker: DynamoWorkerDescriptor): void;
  removeWorker(workerId: string): void;
  getCapabilitySnapshots(): DynamoCapabilitySnapshot[];
  saveCapabilitySnapshot(snapshot: DynamoCapabilitySnapshot): void;
  getDispatchPlans(): DynamoDispatchPlan[];
  saveDispatchPlan(plan: DynamoDispatchPlan): void;
  getHealthProbes(): DynamoHealthProbe[];
  saveHealthProbe(probe: DynamoHealthProbe): void;
}

export class InMemoryDynamoAdapterStore implements DynamoAdapterStore {
  private config: DynamoAdapterConfig = createDefaultDynamoConfig();
  private workers = new Map<string, DynamoWorkerDescriptor>();
  private capabilitySnapshots: DynamoCapabilitySnapshot[] = [];
  private dispatchPlans: DynamoDispatchPlan[] = [];
  private healthProbes: DynamoHealthProbe[] = [];

  getConfig(): DynamoAdapterConfig {
    return this.config;
  }

  setConfig(config: DynamoAdapterConfig): void {
    this.config = config;
  }

  getWorkers(): DynamoWorkerDescriptor[] {
    return Array.from(this.workers.values());
  }

  setWorker(worker: DynamoWorkerDescriptor): void {
    this.workers.set(worker.workerId, worker);
  }

  removeWorker(workerId: string): void {
    this.workers.delete(workerId);
  }

  getCapabilitySnapshots(): DynamoCapabilitySnapshot[] {
    return [...this.capabilitySnapshots];
  }

  saveCapabilitySnapshot(snapshot: DynamoCapabilitySnapshot): void {
    this.capabilitySnapshots.push(snapshot);
  }

  getDispatchPlans(): DynamoDispatchPlan[] {
    return [...this.dispatchPlans];
  }

  saveDispatchPlan(plan: DynamoDispatchPlan): void {
    this.dispatchPlans.push(plan);
  }

  getHealthProbes(): DynamoHealthProbe[] {
    return [...this.healthProbes];
  }

  saveHealthProbe(probe: DynamoHealthProbe): void {
    this.healthProbes.push(probe);
  }
}

// ============================================================================
// Dynamo adapter
// ============================================================================

export class DynamoAdapter {
  private store: DynamoAdapterStore;
  private connected = false;
  private implementationStatuses: Record<string, ImplementationStatus> = {
    worker_registration: "implemented",
    worker_deregistration: "implemented",
    capability_snapshot: "implemented",
    dispatch_plan: "scaffolded",
    health_probe: "implemented",
    telemetry_collection: "planned",
    auto_scaling: "planned",
  };

  constructor(store: DynamoAdapterStore) {
    this.store = store;
  }

  initialize(): { success: boolean; reasonCode: DynamoReasonCode; message: string } {
    if (!isDynamoAdapterEnabled()) {
      return {
        success: false,
        reasonCode: DynamoReasonCode.DYNAMO_ADAPTER_DISABLED,
        message: "Dynamo adapter is disabled. Set NEMOCLAW_DYNAMO_ADAPTER=1 to enable.",
      };
    }

    const config = this.store.getConfig();
    const errors = validateDynamoAdapterConfig(config);
    if (errors.length > 0) {
      return {
        success: false,
        reasonCode: DynamoReasonCode.DYNAMO_FAILED,
        message: `Config validation failed: ${errors.join(", ")}`,
      };
    }

    this.connected = false;

    return {
      success: false,
      reasonCode: DynamoReasonCode.DYNAMO_UNAVAILABLE,
      message: "Dynamo adapter initialized but not connected (fail-closed by default)",
    };
  }

  healthProbe(): DynamoHealthProbe {
    const config = this.store.getConfig();
    const probe: DynamoHealthProbe = {
      probeId: `probe-${Date.now()}`,
      configId: config.configId,
      timestamp: new Date().toISOString(),
      status: this.connected ? "ok" : "unknown",
      latencyMs: this.connected ? 0 : -1,
      details: {
        connected: this.connected,
        failClosed: config.failClosed,
      },
    };

    if (!this.connected && config.failClosed) {
      probe.status = "critical";
      probe.error = "Dynamo is unavailable and adapter is configured to fail closed";
    }

    this.store.saveHealthProbe(probe);
    return probe;
  }

  registerWorker(worker: DynamoWorkerDescriptor): { success: boolean; reasonCode: DynamoReasonCode; message: string } {
    if (!isDynamoAdapterEnabled()) {
      return {
        success: false,
        reasonCode: DynamoReasonCode.DYNAMO_ADAPTER_DISABLED,
        message: "Dynamo adapter is disabled",
      };
    }

    if (!this.connected) {
      return {
        success: false,
        reasonCode: DynamoReasonCode.DYNAMO_UNAVAILABLE,
        message: "Dynamo is unavailable (fail-closed)",
      };
    }

    const errors = validateDynamoWorkerDescriptor(worker);
    if (errors.length > 0) {
      return {
        success: false,
        reasonCode: DynamoReasonCode.DYNAMO_FAILED,
        message: `Worker validation failed: ${errors.join(", ")}`,
      };
    }

    const now = new Date().toISOString();
    const registeredWorker: DynamoWorkerDescriptor = {
      ...worker,
      status: "registered",
      registeredAt: now,
      lastHeartbeatAt: now,
    };

    this.store.setWorker(registeredWorker);

    return {
      success: true,
      reasonCode: DynamoReasonCode.DYNAMO_WORKER_REGISTERED,
      message: `Worker ${worker.workerId} registered`,
    };
  }

  deregisterWorker(workerId: string): { success: boolean; reasonCode: DynamoReasonCode; message: string } {
    if (!isDynamoAdapterEnabled()) {
      return {
        success: false,
        reasonCode: DynamoReasonCode.DYNAMO_ADAPTER_DISABLED,
        message: "Dynamo adapter is disabled",
      };
    }

    if (!this.connected) {
      return {
        success: false,
        reasonCode: DynamoReasonCode.DYNAMO_UNAVAILABLE,
        message: "Dynamo is unavailable (fail-closed)",
      };
    }

    const worker = this.store.getWorkers().find((w) => w.workerId === workerId);
    if (!worker) {
      return {
        success: false,
        reasonCode: DynamoReasonCode.DYNAMO_WORKER_NOT_FOUND,
        message: `Worker ${workerId} not found`,
      };
    }

    const updatedWorker: DynamoWorkerDescriptor = {
      ...worker,
      status: "deregistered",
      deregisteredAt: new Date().toISOString(),
    };

    this.store.setWorker(updatedWorker);
    this.store.removeWorker(workerId);

    return {
      success: true,
      reasonCode: DynamoReasonCode.DYNAMO_WORKER_DEREGISTERED,
      message: `Worker ${workerId} deregistered`,
    };
  }

  captureCapabilitySnapshot(
    workerId: string,
    capabilities: string[],
  ): DynamoCapabilitySnapshot {
    const snapshot: DynamoCapabilitySnapshot = {
      snapshotId: `snapshot-${workerId}-${Date.now()}`,
      workerId,
      capabilities,
      capturedAt: new Date().toISOString(),
      stale: false,
    };

    this.store.saveCapabilitySnapshot(snapshot);
    return snapshot;
  }

  createDispatchPlan(
    workerId: string,
    payload: Record<string, unknown>,
  ): { success: boolean; plan?: DynamoDispatchPlan; reasonCode: DynamoReasonCode; message: string } {
    if (!isDynamoAdapterEnabled()) {
      return {
        success: false,
        reasonCode: DynamoReasonCode.DYNAMO_ADAPTER_DISABLED,
        message: "Dynamo adapter is disabled",
      };
    }

    if (!this.connected) {
      return {
        success: false,
        reasonCode: DynamoReasonCode.DYNAMO_UNAVAILABLE,
        message: "Dynamo is unavailable (fail-closed)",
      };
    }

    const worker = this.store.getWorkers().find((w) => w.workerId === workerId);
    if (!worker) {
      return {
        success: false,
        reasonCode: DynamoReasonCode.DYNAMO_WORKER_NOT_FOUND,
        message: `Worker ${workerId} not found`,
      };
    }

    const now = new Date().toISOString();
    const plan: DynamoDispatchPlan = {
      planId: `dispatch-${workerId}-${Date.now()}`,
      workerId,
      payload,
      status: "pending",
      createdAt: now,
    };

    this.store.saveDispatchPlan(plan);

    return {
      success: true,
      plan,
      reasonCode: DynamoReasonCode.DYNAMO_DISPATCH_PLANNED,
      message: `Dispatch plan ${plan.planId} created for worker ${workerId}`,
    };
  }

  getStatusReport(): DynamoAdapterStatusReport {
    const config = this.store.getConfig();
    const probes = this.store.getHealthProbes();
    const lastProbe = probes.length > 0 ? probes[probes.length - 1] : undefined;
    const workers = this.store.getWorkers();

    const gaps: string[] = [];
    for (const [feature, status] of Object.entries(this.implementationStatuses)) {
      if (status === "planned" || status === "scaffolded") {
        gaps.push(`${feature} (${status})`);
      }
    }

    return {
      config,
      enabled: isDynamoAdapterEnabled(),
      connected: this.connected,
      lastHealthProbe: lastProbe,
      registeredWorkers: workers.filter((w) => w.status !== "deregistered").length,
      implementationStatuses: this.implementationStatuses,
      gaps,
      generatedAt: new Date().toISOString(),
    };
  }
}
