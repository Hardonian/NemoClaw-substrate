// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { DegradedReasonCode, DeviceHealthStatus, NodeDescriptor } from "./types";

export interface HealthSummary {
  total: number;
  byHealth: Record<DeviceHealthStatus, number>;
  staleNodes: string[];
}

export class DeviceRegistry {
  private readonly nodes = new Map<string, NodeDescriptor>();

  registerNode(node: NodeDescriptor): void { this.nodes.set(node.nodeId, node); }
  removeNode(nodeId: string): boolean { return this.nodes.delete(nodeId); }

  updateHeartbeat(nodeId: string, timestamp: string): { ok: boolean; reasonCode?: DegradedReasonCode } {
    const node = this.nodes.get(nodeId);
    if (!node) return { ok: false, reasonCode: "node_missing" };
    node.lastHeartbeatAt = timestamp;
    node.health = "healthy";
    return { ok: true };
  }

  updateCapabilities(nodeId: string, updater: NodeDescriptor["capabilities"]): { ok: boolean; reasonCode?: DegradedReasonCode } {
    const node = this.nodes.get(nodeId);
    if (!node) return { ok: false, reasonCode: "node_missing" };
    node.capabilities = updater;
    return { ok: true };
  }

  getNode(nodeId: string): NodeDescriptor | null { return this.nodes.get(nodeId) ?? null; }

  listNodes(): NodeDescriptor[] {
    return [...this.nodes.values()].sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  }
  list(): NodeDescriptor[] { return this.listNodes(); }

  // Backward-compatible alias used by existing control-plane tests.
  register(node: NodeDescriptor): void { this.registerNode(node); }

  summarizeHealth(nowIso: string, staleAfterMs: number): HealthSummary {
    const now = Date.parse(nowIso);
    const summary: HealthSummary = {
      total: this.nodes.size,
      byHealth: { healthy: 0, stale: 0, unreachable: 0, unknown: 0 },
      staleNodes: [],
    };
    for (const node of this.listNodes()) {
      const delta = now - Date.parse(node.lastHeartbeatAt);
      if (Number.isFinite(delta) && delta > staleAfterMs && node.health === "healthy") node.health = "stale";
      summary.byHealth[node.health] += 1;
      if (node.health === "stale") summary.staleNodes.push(node.nodeId);
    }
    return summary;
  }
}

export function createDeviceRegistry(): DeviceRegistry {
  return new DeviceRegistry();
}
