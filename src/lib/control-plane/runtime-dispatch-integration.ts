// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { PolicyBundle } from "./governance";
import { evaluatePolicy } from "./governance";
import type { DeviceRegistry } from "./device-registry";
import { routeHeterogeneous, type HeterogeneousRoutingConfig, summarizeHeterogeneousDiagnostics } from "./heterogeneous-routing";
import type { RemoteExecutionConfig, RemoteExecutionTransport } from "./remote-execution";
import type { OperationalEvent, OperationalMemoryLog } from "./operational-memory";

export interface DispatchIntegrationConfig {
  hetero: HeterogeneousRoutingConfig;
  governedEnabled: boolean;
  allowFallback: boolean;
  remote: RemoteExecutionConfig;
}

export type DispatchStatus = "ok" | "blocked" | "degraded";

export interface DispatchIntegrationResult<T> {
  status: DispatchStatus;
  result?: T;
  error?: string;
  events: OperationalEvent[];
  receiptId?: string;
  diagnostics: string[];
}

export async function dispatchWithHeterogeneousRouting<T>(input: {
  requestId: string;
  nowIso: string;
  provider: string;
  model: string;
  approved?: boolean;
  policyBundle: PolicyBundle;
  registry: DeviceRegistry;
  config: DispatchIntegrationConfig;
  localDispatch: (provider: string, model: string) => Promise<T>;
  remoteTransport?: RemoteExecutionTransport;
  operationalMemory?: OperationalMemoryLog;
}): Promise<DispatchIntegrationResult<T>> {
  if (!input.config.hetero.enabled) {
    return { status: "ok", result: await input.localDispatch(input.provider, input.model), events: [], diagnostics: summarizeHeterogeneousDiagnostics({ routing: input.config.hetero, governedEnabled: input.config.governedEnabled, remote: input.config.remote }) };
  }

  if (!input.config.governedEnabled) {
    return { status: "ok", result: await input.localDispatch(input.provider, input.model), events: [], diagnostics: summarizeHeterogeneousDiagnostics({ routing: input.config.hetero, governedEnabled: input.config.governedEnabled, remote: input.config.remote }) };
  }
  const policyEval = evaluatePolicy(input.policyBundle, {
    request: {
      version: "1",
      requestId: input.requestId,
      receivedAt: input.nowIso,
      source: "runtime-dispatch-integration",
      actor: "runtime",
      action: "worker:execute",
      requestedModel: input.model,
      constraints: [],
      metadata: { provider: input.provider, model: input.model },
    },
    actionClass: "runtime",
  });
  if (!policyEval.allowed) return { status: "blocked", error: `governed routing blocked (${policyEval.reasonCode})`, events: [], diagnostics: summarizeHeterogeneousDiagnostics({ routing: input.config.hetero, governedEnabled: input.config.governedEnabled, remote: input.config.remote }) };
  if (policyEval.requiredApproval && !input.approved) return { status: "blocked", error: "governed routing blocked (approval_required)", events: [], diagnostics: summarizeHeterogeneousDiagnostics({ routing: input.config.hetero, governedEnabled: input.config.governedEnabled, remote: input.config.remote }) };

  const routed = await routeHeterogeneous({
    requestId: input.requestId,
    nowIso: input.nowIso,
    provider: input.provider,
    model: input.model,
    registry: input.registry,
    policyBundle: input.policyBundle,
    governedEnabled: input.config.governedEnabled,
    allowFallback: input.config.allowFallback,
    routingConfig: input.config.hetero,
    remoteConfig: input.config.remote,
    remoteTransport: input.remoteTransport,
    approved: input.approved,
    operationalMemory: input.operationalMemory,
  });

  const diagnostics = summarizeHeterogeneousDiagnostics({ routing: input.config.hetero, governedEnabled: input.config.governedEnabled, remote: input.config.remote, result: routed });

  if (!routed.selectedCandidate) {
    return { status: "degraded", error: "governed routing returned no eligible candidate", events: routed.events, receiptId: routed.receipt.receiptId, diagnostics };
  }

  if (routed.selectedCandidate.policyEligibility !== "allow") {
    return { status: "blocked", error: `governed routing blocked (${routed.selectedCandidate.policyEligibility})`, events: routed.events, receiptId: routed.receipt.receiptId, diagnostics };
  }

  if (routed.selectedCandidate.kind === "remote_worker") {
    if (!input.config.remote.enabled) {
      return { status: "blocked", error: "remote candidate selected but NEMOCLAW_REMOTE_EXECUTION=1 is not enabled", events: routed.events, receiptId: routed.receipt.receiptId, diagnostics };
    }
    if (routed.remoteStatus !== "succeeded") {
      return { status: "degraded", error: `remote execution failed: ${routed.remoteStatus ?? "unknown"}`, events: routed.events, receiptId: routed.receipt.receiptId, diagnostics };
    }
    return { status: "ok", result: await input.localDispatch(routed.provider, routed.model), events: routed.events, receiptId: routed.receipt.receiptId, diagnostics };
  }

  return { status: "ok", result: await input.localDispatch(routed.provider, routed.model), events: routed.events, receiptId: routed.receipt.receiptId, diagnostics };
}
