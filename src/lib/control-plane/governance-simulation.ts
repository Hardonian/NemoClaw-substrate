// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";
import { deterministicSerialize } from "./serde";
import type { PolicyBundle, PolicyEvaluationResult } from "./governance";
import type { DegradedState } from "./types";
import type { ExecutionIntent, ExecutionPolicySnapshot, ExecutionTrustSnapshot } from "./execution-plans";

export type SimulationId = string;
export type RoutingSimulationId = string;
export type ReplayForecastId = string;
export type PolicyImpactSimulationId = string;

export type SimulationType =
  | "routing"
  | "policy_impact"
  | "replay_forecast"
  | "what_if"
  | "degraded_analysis"
  | "trust_analysis"
  | "candidate_selection";

export type SimulationStatus = "completed" | "failed" | "partial";
export type ConfidenceLevel = "high" | "medium" | "low" | "unknown";

export interface SimulationAssumption {
  assumption: string;
  type: "policy" | "trust" | "degraded_state" | "routing" | "evidence" | "authority";
  confidence: ConfidenceLevel;
  description: string;
  impact: string;
}

export interface SimulationUnavailable {
  reason: string;
  missingData: string[];
  partialResults: Record<string, unknown>;
}

export interface SimulationEnvelope {
  simulationId: SimulationId;
  type: SimulationType;
  createdAt: string;
  inputHash: string;
  assumptions: SimulationAssumption[];
  unavailable?: SimulationUnavailable;
  metadata: Record<string, string>;
}

export interface GovernanceSimulationResult {
  envelope: SimulationEnvelope;
  status: SimulationStatus;
  wouldHaveAllowed: boolean;
  wouldHaveDenied: boolean;
  wouldHaveRequiredApproval: boolean;
  wouldHaveRoutedTo: string;
  wouldHaveRejected: string[];
  degradedStatesDetected: string[];
  trustStateSummary: string;
  policyMatchSummary: string;
  evidenceGaps: string[];
  authorityPath: string[];
  replayValidationWouldPass: boolean;
  replayValidationFailures: string[];
  simulationHash: string;
}

export interface RoutingSimulation {
  simulationId: RoutingSimulationId;
  intent: ExecutionIntent;
  candidates: Array<{
    nodeId: string;
    candidateClass: "local_provider" | "remote_worker";
    eligible: boolean;
    score: number;
    trustLevel: string;
    degradedStates: string[];
    reasonCodes: string[];
    selected: boolean;
  }>;
  selectedCandidate?: string;
  policyDecision: string;
  degradedSummary: string[];
  assumptions: SimulationAssumption[];
  createdAt: string;
  simulationHash: string;
}

export interface ReplayForecast {
  forecastId: ReplayForecastId;
  intentId: string;
  planId?: string;
  forecastAt: string;
  wouldReplayValidate: boolean;
  expectedLineage: string[];
  expectedEvidenceNodes: string[];
  lineageGaps: string[];
  evidenceGaps: string[];
  authorityChainValid: boolean;
  delegationChainValid: boolean;
  snapshotIntegrityValid: boolean;
  degradedStateDisclosureRequired: boolean;
  assumptions: SimulationAssumption[];
  unavailable?: SimulationUnavailable;
  forecastHash: string;
}

export interface PolicyImpactSimulation {
  simulationId: PolicyImpactSimulationId;
  currentPolicyId: string;
  proposedPolicyId: string;
  simulatedAt: string;
  totalRequestsEvaluated: number;
  decisionsChanged: Array<{
    requestId: string;
    currentDecision: string;
    proposedDecision: string;
    impact: "allow_to_deny" | "deny_to_allow" | "allow_to_approval" | "deny_to_approval" | "approval_to_allow" | "approval_to_deny";
  }>;
  summary: {
    totalChanged: number;
    newlyDenied: number;
    newlyAllowed: number;
    newlyApprovalRequired: number;
    approvalRemoved: number;
  };
  assumptions: SimulationAssumption[];
  unavailable?: SimulationUnavailable;
  simulationHash: string;
}

export interface DegradedStateAnalysis {
  simulationId: SimulationId;
  degradedStates: DegradedState[];
  analysis: Array<{
    category: string;
    reasonCode: string;
    severity: string;
    impactOnExecution: "blocks" | "allows" | "requires_approval" | "degrades";
    explanation: string;
  }>;
  assumptions: SimulationAssumption[];
  createdAt: string;
}

export interface TrustStateAnalysis {
  simulationId: SimulationId;
  workerId: string;
  trustLevel: string;
  attestationStatus: string;
  analysis: {
    eligibleForLocal: boolean;
    eligibleForRemote: boolean;
    requiresApproval: boolean;
    trustGap: string;
    recommendation: string;
  };
  assumptions: SimulationAssumption[];
  createdAt: string;
}

export interface CandidateSelectionAnalysis {
  simulationId: SimulationId;
  intent: ExecutionIntent;
  candidates: Array<{
    nodeId: string;
    score: number;
    trustLevel: string;
    degradedStates: string[];
    policyAllowed: boolean;
    wouldBeSelected: boolean;
    reasons: string[];
  }>;
  selectedCandidate?: string;
  createdAt: string;
}

export interface SimulationQuery {
  type?: SimulationType;
  timeRange?: { from: string; to: string };
  intentId?: string;
  status?: SimulationStatus[];
  limit?: number;
}

function stableHash(prefix: string, value: unknown): string {
  return `${prefix}-${createHash("sha256").update(deterministicSerialize(value)).digest("base64url").slice(0, 32)}`;
}

export function createSimulationEnvelope(input: {
  type: SimulationType;
  inputData: Record<string, unknown>;
  assumptions: SimulationAssumption[];
  unavailable?: SimulationUnavailable;
  metadata?: Record<string, string>;
}): SimulationEnvelope {
  const inputHash = stableHash("simulation-input", input.inputData);
  return {
    simulationId: stableHash("simulation", { type: input.type, inputHash }),
    type: input.type,
    createdAt: new Date().toISOString(),
    inputHash,
    assumptions: input.assumptions,
    unavailable: input.unavailable,
    metadata: input.metadata ?? {},
  };
}

export function simulateRouting(input: {
  intent: ExecutionIntent;
  candidates: Array<{
    nodeId: string;
    candidateClass: "local_provider" | "remote_worker";
    trustLevel: string;
    health: string;
    degradedStates: DegradedState[];
    policyAllowed: boolean;
    policyRequiredApproval: boolean;
  }>;
  assumptions?: SimulationAssumption[];
}): RoutingSimulation {
  const evaluatedCandidates = input.candidates.map((c) => {
    const eligible =
      c.health === "healthy" &&
      c.policyAllowed &&
      (c.candidateClass === "local_provider" || c.trustLevel === "trusted_remote" || c.trustLevel === "trusted_local");

    const degradedStates = c.degradedStates.map((d) => `${d.affectedSubsystem}:${d.reasonCode}`);
    const score = eligible ? 100 + (c.candidateClass === "remote_worker" ? 20 : 0) : 0;
    const reasonCodes = eligible
      ? ["eligible"]
      : c.health !== "healthy"
        ? ["health_unhealthy"]
        : !c.policyAllowed
          ? ["policy_denied"]
          : ["trust_insufficient"];

    return {
      nodeId: c.nodeId,
      candidateClass: c.candidateClass,
      eligible,
      score,
      trustLevel: c.trustLevel,
      degradedStates,
      reasonCodes,
      selected: false,
    };
  });

  const eligibleCandidates = evaluatedCandidates.filter((c) => c.eligible);
  const sorted = eligibleCandidates.sort((a, b) => b.score - a.score || a.nodeId.localeCompare(b.nodeId));
  if (sorted.length > 0) {
    sorted[0].selected = true;
  }

  const policyDecision = input.candidates.some((c) => c.policyAllowed)
    ? input.candidates.some((c) => c.policyRequiredApproval)
      ? "approval_required"
      : "allow"
    : "deny";

  const assumptions = input.assumptions ?? [
    {
      assumption: "candidate_health_is_current",
      type: "trust",
      confidence: "medium",
      description: "Candidate health status assumed to be current at simulation time",
      impact: "Health changes may alter simulation outcome",
    },
    {
      assumption: "policy_bundle_is_current",
      type: "policy",
      confidence: "high",
      description: "Policy evaluation uses the current policy bundle",
      impact: "Policy changes may alter simulation outcome",
    },
  ];

  const allDegraded = new Set<string>();
  for (const c of evaluatedCandidates) {
    for (const d of c.degradedStates) {
      allDegraded.add(d);
    }
  }

  const simulation: Omit<RoutingSimulation, "simulationHash"> = {
    simulationId: stableHash("routing-sim", { intentId: input.intent.requestId, candidateCount: input.candidates.length }),
    intent: input.intent,
    candidates: evaluatedCandidates,
    selectedCandidate: sorted.length > 0 ? sorted[0].nodeId : undefined,
    policyDecision,
    degradedSummary: Array.from(allDegraded),
    assumptions,
    createdAt: new Date().toISOString(),
  };
  const simulationHash = stableHash("routing-simulation", {
    simulationId: simulation.simulationId,
    selectedCandidate: simulation.selectedCandidate,
    policyDecision: simulation.policyDecision,
    candidateCount: simulation.candidates.length,
  });
  return { ...simulation, simulationHash };
}

export function simulatePolicyImpact(input: {
  currentPolicy: PolicyBundle;
  proposedPolicy: PolicyBundle;
  testContexts: Array<{ requestId: string; context: import("./governance").PolicyEvaluationContext }>;
  assumptions?: SimulationAssumption[];
}): PolicyImpactSimulation {
  const decisionsChanged: PolicyImpactSimulation["decisionsChanged"] = [];
  let newlyDenied = 0;
  let newlyAllowed = 0;
  let newlyApprovalRequired = 0;
  let approvalRemoved = 0;

  for (const { requestId, context } of input.testContexts) {
    const currentEval = evaluatePolicyQuiet(input.currentPolicy, context);
    const proposedEval = evaluatePolicyQuiet(input.proposedPolicy, context);

    const currentDecision = currentEval.decision;
    const proposedDecision = proposedEval.decision;

    if (currentDecision !== proposedDecision) {
      let impact: PolicyImpactSimulation["decisionsChanged"][number]["impact"];
      if (currentDecision === "allow" && proposedDecision === "deny") {
        impact = "allow_to_deny";
        newlyDenied++;
      } else if (currentDecision === "deny" && proposedDecision === "allow") {
        impact = "deny_to_allow";
        newlyAllowed++;
      } else if (currentDecision === "allow" && proposedDecision === "approval_required") {
        impact = "allow_to_approval";
        newlyApprovalRequired++;
      } else if (currentDecision === "deny" && proposedDecision === "approval_required") {
        impact = "deny_to_approval";
        newlyApprovalRequired++;
      } else if (currentDecision === "approval_required" && proposedDecision === "allow") {
        impact = "approval_to_allow";
        approvalRemoved++;
      } else {
        impact = "approval_to_deny";
        newlyDenied++;
      }

      decisionsChanged.push({ requestId, currentDecision, proposedDecision, impact });
    }
  }

  const assumptions = input.assumptions ?? [
    {
      assumption: "test_contexts_are_representative",
      type: "policy",
      confidence: "medium",
      description: "Test contexts are assumed to be representative of real-world request patterns",
      impact: "Non-representative contexts may under/over-estimate impact",
    },
  ];

  const simulation: Omit<PolicyImpactSimulation, "simulationHash"> = {
    simulationId: stableHash("policy-impact", { currentPolicyId: input.currentPolicy.id, proposedPolicyId: input.proposedPolicy.id }),
    currentPolicyId: input.currentPolicy.id,
    proposedPolicyId: input.proposedPolicy.id,
    simulatedAt: new Date().toISOString(),
    totalRequestsEvaluated: input.testContexts.length,
    decisionsChanged,
    summary: {
      totalChanged: decisionsChanged.length,
      newlyDenied,
      newlyAllowed,
      newlyApprovalRequired,
      approvalRemoved,
    },
    assumptions,
  };
  const simulationHash = stableHash("policy-impact-simulation", {
    simulationId: simulation.simulationId,
    totalChanged: simulation.summary.totalChanged,
  });
  return { ...simulation, simulationHash };
}

export function simulateReplayForecast(input: {
  intentId: string;
  planId?: string;
  expectedLineage: string[];
  expectedEvidenceNodes: string[];
  authorityChain: string[];
  delegationChain: string[];
  degradedStates: DegradedState[];
  assumptions?: SimulationAssumption[];
  unavailable?: SimulationUnavailable;
}): ReplayForecast {
  const assumptions = input.assumptions ?? [
    {
      assumption: "lineage_is_complete",
      type: "evidence",
      confidence: "medium",
      description: "All expected lineage nodes are assumed to be present at replay time",
      impact: "Missing lineage nodes would cause replay validation failure",
    },
    {
      assumption: "evidence_nodes_are_available",
      type: "evidence",
      confidence: "medium",
      description: "All expected evidence nodes are assumed to be available for replay",
      impact: "Unavailable evidence would cause replay gaps",
    },
    {
      assumption: "authority_chain_is_valid",
      type: "authority",
      confidence: "high",
      description: "Authority chain is assumed to be valid and non-expired",
      impact: "Expired or revoked authority would invalidate replay",
    },
  ];

  const lineageGaps: string[] = [];
  const evidenceGaps: string[] = [];

  const forecast: Omit<ReplayForecast, "forecastHash"> = {
    forecastId: stableHash("replay-forecast", { intentId: input.intentId }),
    intentId: input.intentId,
    planId: input.planId,
    forecastAt: new Date().toISOString(),
    wouldReplayValidate: lineageGaps.length === 0 && evidenceGaps.length === 0,
    expectedLineage: input.expectedLineage,
    expectedEvidenceNodes: input.expectedEvidenceNodes,
    lineageGaps,
    evidenceGaps,
    authorityChainValid: input.authorityChain.length > 0,
    delegationChainValid: true,
    snapshotIntegrityValid: true,
    degradedStateDisclosureRequired: input.degradedStates.length > 0,
    assumptions,
    unavailable: input.unavailable,
  };
  const forecastHash = stableHash("replay-forecast", {
    forecastId: forecast.forecastId,
    wouldReplayValidate: forecast.wouldReplayValidate,
    lineageGapCount: forecast.lineageGaps.length,
    evidenceGapCount: forecast.evidenceGaps.length,
  });
  return { ...forecast, forecastHash };
}

function evaluatePolicyQuiet(bundle: PolicyBundle, context: import("./governance").PolicyEvaluationContext): PolicyEvaluationResult {
  const ordered = [...bundle.rules].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const matched = ordered.filter((rule) => rule.matches(context));
  const winning = matched[0];
  if (winning) {
    return {
      decision: winning.effect,
      allowed: winning.effect !== "deny",
      requiredApproval: winning.effect === "approval_required",
      reasonCode: winning.reasonCode,
      sourceRuleId: winning.id,
      matchedRuleIds: matched.map((rule) => rule.id),
    };
  }
  return {
    decision: bundle.defaultEffect,
    allowed: bundle.defaultEffect === "allow",
    requiredApproval: false,
    reasonCode: bundle.defaultEffect === "allow" ? "policy_default_allow" : "policy_default_deny",
    sourceRuleId: `${bundle.id}:default`,
    matchedRuleIds: [],
  };
}

export function simulateGovernanceDecision(input: {
  type: SimulationType;
  intent: ExecutionIntent;
  policyBundle: PolicyBundle;
  policyContext: import("./governance").PolicyEvaluationContext;
  candidates: Array<{
    nodeId: string;
    candidateClass: "local_provider" | "remote_worker";
    trustLevel: string;
    health: string;
    degradedStates: DegradedState[];
  }>;
  assumptions?: SimulationAssumption[];
}): GovernanceSimulationResult {
  const envelope = createSimulationEnvelope({
    type: input.type,
    inputData: { intent: input.intent, policyId: input.policyBundle.id, candidateCount: input.candidates.length },
    assumptions: input.assumptions ?? [{
      assumption: "simulated_decision_is_not_executed",
      type: "policy",
      confidence: "high",
      description: "This is a dry-run simulation with no live execution",
      impact: "No actual execution occurred",
    }],
  });

  const policyEval = evaluatePolicyQuiet(input.policyBundle, input.policyContext);

  const evaluatedCandidates = input.candidates.map((c) => {
    const eligible =
      c.health === "healthy" &&
      policyEval.allowed &&
      (c.candidateClass === "local_provider" || c.trustLevel === "trusted_remote" || c.trustLevel === "trusted_local");
    return { nodeId: c.nodeId, eligible, score: eligible ? 100 : 0 };
  });

  const eligible = evaluatedCandidates.filter((c) => c.eligible);
  const sorted = eligible.sort((a, b) => b.score - a.score || a.nodeId.localeCompare(b.nodeId));
  const selected = sorted.length > 0 ? sorted[0].nodeId : undefined;
  const rejected = evaluatedCandidates.filter((c) => !c.eligible).map((c) => c.nodeId);

  const degradedDetected = new Set<string>();
  for (const c of input.candidates) {
    for (const d of c.degradedStates) {
      degradedDetected.add(`${d.affectedSubsystem}:${d.reasonCode}`);
    }
  }

  const result: Omit<GovernanceSimulationResult, "simulationHash"> = {
    envelope,
    status: "completed",
    wouldHaveAllowed: policyEval.allowed,
    wouldHaveDenied: !policyEval.allowed,
    wouldHaveRequiredApproval: policyEval.requiredApproval,
    wouldHaveRoutedTo: selected ?? "none",
    wouldHaveRejected: rejected,
    degradedStatesDetected: Array.from(degradedDetected),
    trustStateSummary: input.candidates.map((c) => `${c.nodeId}:${c.trustLevel}`).join(","),
    policyMatchSummary: policyEval.decision,
    evidenceGaps: [],
    authorityPath: [input.policyContext.request.actor],
    replayValidationWouldPass: true,
    replayValidationFailures: [],
  };
  const simulationHash = stableHash("governance-simulation", {
    simulationId: envelope.simulationId,
    wouldHaveAllowed: result.wouldHaveAllowed,
    wouldHaveRoutedTo: result.wouldHaveRoutedTo,
  });
  return { ...result, simulationHash };
}
