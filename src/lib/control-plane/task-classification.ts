// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { ControlRequestEnvelope } from "./types";

export interface TaskClassification {
  taskKind: "chat" | "tooling" | "shell" | "file_mutation" | "network" | "batch" | "runtime";
  riskLevel: "low" | "medium" | "high";
  latencySensitivity: "interactive" | "standard" | "deferred";
  contextRequirement: "small" | "medium" | "large";
  requiresTools: boolean;
  requiresStreaming: boolean;
  batchSuitable: boolean;
  remoteExecutionEligible: boolean;
  approvalRequirementHint: "none" | "recommended" | "required";
  actionClass: "tool" | "shell" | "file_mutation" | "remote_node" | "provider" | "fallback" | "network_sensitive" | "high_risk" | "generic" | "runtime";
  providerConstraints: string[];
}

export function classifyRequest(request: ControlRequestEnvelope): TaskClassification {
  const action = request.action.toLowerCase();
  const constraints = new Set(request.constraints);
  const has = (v: string) => constraints.has(v);
  const taskKind = action.includes("tool") ? "tooling" : action.includes("shell") ? "shell" : action.includes("file") ? "file_mutation" : action.includes("batch") ? "batch" : action.includes("network") ? "network" : "chat";
  const highRisk = taskKind === "shell" || taskKind === "file_mutation" || has("high-risk");

  return {
    taskKind,
    riskLevel: highRisk ? "high" : has("medium-risk") ? "medium" : "low",
    latencySensitivity: has("latency-interactive") ? "interactive" : has("latency-deferred") ? "deferred" : "standard",
    contextRequirement: has("context-large") ? "large" : has("context-medium") ? "medium" : "small",
    requiresTools: taskKind === "tooling" || has("requires-tools"),
    requiresStreaming: has("streaming") || taskKind === "chat",
    batchSuitable: taskKind === "batch" || has("batch-ok"),
    remoteExecutionEligible: !has("local-only") && !highRisk,
    approvalRequirementHint: highRisk ? "required" : has("approval-recommended") ? "recommended" : "none",
    actionClass: highRisk ? "high_risk" : "generic",
    providerConstraints: [...constraints].filter((item) => item.startsWith("provider:") || item.startsWith("model:"))
      .sort(),
  };
}
