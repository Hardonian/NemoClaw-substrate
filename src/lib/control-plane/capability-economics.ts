// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";
import { deterministicSerialize } from "./serde";

export type CapabilityEconomicsSnapshotId = string;

export interface TrustCostFactors {
  attestationCost: number;
  verificationOverhead: number;
  operatorReviewCost: number;
  trustUncertaintyPenalty: number;
  revokedTrustPenalty: number;
  conflictResolutionCost: number;
  totalTrustCost: number;
}

export interface ExecutionCostFactors {
  computeCost: number;
  routingOverhead: number;
  governanceOverhead: number;
  evidenceGenerationCost: number;
  replayValidationCost: number;
  degradedStatePenalty: number;
  totalExecutionCost: number;
}

export interface DegradedStatePenalty {
  category: string;
  reasonCode: string;
  severityMultiplier: number;
  executionDelayFactor: number;
  evidenceBurdenMultiplier: number;
  governanceOverheadAddition: number;
}

export interface EvidenceBurden {
  baseline: number;
  trustLevelMultiplier: number;
  degradedStateMultiplier: number;
  policyComplexityMultiplier: number;
  totalEvidenceNodes: number;
  evidenceGenerationCost: number;
}

export interface ReliabilityDecay {
  componentId: string;
  currentReliability: number;
  decayRate: number;
  lastAttestedAt: string;
  decayedReliability: number;
  decayReason: string;
  recommendation: string;
}

export interface CapabilityEconomicsScore {
  snapshotId: CapabilityEconomicsSnapshotId;
  evaluatedAt: string;
  requestId?: string;
  candidateId: string;
  candidateClass: "local_provider" | "remote_worker";
  trustCost: TrustCostFactors;
  executionCost: ExecutionCostFactors;
  evidenceBurden: EvidenceBurden;
  reliabilityDecay: ReliabilityDecay;
  degradedPenalties: DegradedStatePenalty[];
  totalScore: number;
  costBreakdown: {
    trustWeight: number;
    executionWeight: number;
    evidenceWeight: number;
    reliabilityWeight: number;
    degradedPenaltyWeight: number;
  };
  assumptions: string[];
  unknownFactors: string[];
  scoreHash: string;
}

export interface EconomicsSnapshot {
  snapshotId: CapabilityEconomicsSnapshotId;
  capturedAt: string;
  scores: CapabilityEconomicsScore[];
  selectedCandidate?: string;
  selectionReason: string;
  totalEconomicsCost: number;
  assumptions: string[];
  snapshotHash: string;
}

export interface CostWeightConfig {
  trustWeight: number;
  executionWeight: number;
  evidenceWeight: number;
  reliabilityWeight: number;
  degradedPenaltyWeight: number;
}

export const DEFAULT_COST_WEIGHTS: CostWeightConfig = {
  trustWeight: 0.25,
  executionWeight: 0.3,
  evidenceWeight: 0.15,
  reliabilityWeight: 0.2,
  degradedPenaltyWeight: 0.1,
};

export interface EconomicsScoringOptions {
  weights: CostWeightConfig;
  trustLevelCosts: Record<string, number>;
  degradedSeverityMultipliers: Record<string, number>;
  maxExecutionCost: number;
  maxTrustCost: number;
}

export const DEFAULT_SCORING_OPTIONS: EconomicsScoringOptions = {
  weights: DEFAULT_COST_WEIGHTS,
  trustLevelCosts: {
    trusted_remote: 0.1,
    trusted_local: 0.05,
    observed: 0.3,
    untrusted: 0.8,
    unknown: 1.0,
    revoked: 2.0,
  },
  degradedSeverityMultipliers: {
    info: 1.0,
    warning: 1.5,
    error: 2.5,
    critical: 5.0,
  },
  maxExecutionCost: 100,
  maxTrustCost: 10,
};

function stableHash(prefix: string, value: unknown): string {
  return `${prefix}-${createHash("sha256").update(deterministicSerialize(value)).digest("base64url").slice(0, 32)}`;
}

export function calculateTrustCost(input: {
  trustLevel: string;
  attestationRequired: boolean;
  operatorReviewRequired: boolean;
  attestationFresh: boolean;
  conflictDetected: boolean;
  revoked: boolean;
  options?: EconomicsScoringOptions;
}): TrustCostFactors {
  const opts = input.options ?? DEFAULT_SCORING_OPTIONS;
  const baseCost = opts.trustLevelCosts[input.trustLevel] ?? opts.trustLevelCosts.unknown;
  const attestationCost = input.attestationRequired ? 0.5 : 0;
  const verificationOverhead = input.attestationRequired && input.attestationFresh ? 0.3 : 0;
  const operatorReviewCost = input.operatorReviewRequired ? 0.7 : 0;
  const trustUncertaintyPenalty = input.trustLevel === "unknown" ? 1.0 : 0;
  const revokedTrustPenalty = input.revoked ? 2.0 : 0;
  const conflictResolutionCost = input.conflictDetected ? 1.5 : 0;
  const totalTrustCost =
    baseCost +
    attestationCost +
    verificationOverhead +
    operatorReviewCost +
    trustUncertaintyPenalty +
    revokedTrustPenalty +
    conflictResolutionCost;

  return {
    attestationCost,
    verificationOverhead,
    operatorReviewCost,
    trustUncertaintyPenalty,
    revokedTrustPenalty,
    conflictResolutionCost,
    totalTrustCost: Math.min(totalTrustCost, opts.maxTrustCost),
  };
}

export function calculateExecutionCost(input: {
  computeBase: number;
  routingOverhead?: number;
  governanceOverhead?: number;
  evidenceGenerationCost?: number;
  replayValidationCost?: number;
  degradedStatePenalty?: number;
  options?: EconomicsScoringOptions;
}): ExecutionCostFactors {
  const opts = input.options ?? DEFAULT_SCORING_OPTIONS;
  const routingOverhead = input.routingOverhead ?? 0.1;
  const governanceOverhead = input.governanceOverhead ?? 0.15;
  const evidenceGenerationCost = input.evidenceGenerationCost ?? 0.2;
  const replayValidationCost = input.replayValidationCost ?? 0.1;
  const degradedStatePenalty = input.degradedStatePenalty ?? 0;
  const totalExecutionCost =
    input.computeBase +
    routingOverhead +
    governanceOverhead +
    evidenceGenerationCost +
    replayValidationCost +
    degradedStatePenalty;

  return {
    computeCost: input.computeBase,
    routingOverhead,
    governanceOverhead,
    evidenceGenerationCost,
    replayValidationCost,
    degradedStatePenalty,
    totalExecutionCost: Math.min(totalExecutionCost, opts.maxExecutionCost),
  };
}

export function calculateEvidenceBurden(input: {
  trustLevel: string;
  degradedStateCount: number;
  policyComplexity: number;
  options?: EconomicsScoringOptions;
}): EvidenceBurden {
  const baseline = 3;
  const trustLevelMultiplier = input.trustLevel === "trusted_remote" ? 2 : input.trustLevel === "trusted_local" ? 1.5 : input.trustLevel === "observed" ? 2.5 : 3;
  const degradedStateMultiplier = 1 + input.degradedStateCount * 0.5;
  const policyComplexityMultiplier = 1 + input.policyComplexity * 0.1;
  const totalEvidenceNodes = Math.ceil(baseline * trustLevelMultiplier * degradedStateMultiplier * policyComplexityMultiplier);
  const evidenceGenerationCost = totalEvidenceNodes * 0.05;

  return {
    baseline,
    trustLevelMultiplier,
    degradedStateMultiplier,
    policyComplexityMultiplier,
    totalEvidenceNodes,
    evidenceGenerationCost,
  };
}

export function calculateDegradedPenalty(input: {
  category: string;
  reasonCode: string;
  severity: "info" | "warning" | "error" | "critical";
  options?: EconomicsScoringOptions;
}): DegradedStatePenalty {
  const opts = input.options ?? DEFAULT_SCORING_OPTIONS;
  const severityMultiplier = opts.degradedSeverityMultipliers[input.severity] ?? 1.0;
  const executionDelayFactor = severityMultiplier * 0.2;
  const evidenceBurdenMultiplier = 1 + severityMultiplier * 0.5;
  const governanceOverheadAddition = severityMultiplier * 0.1;

  return {
    category: input.category,
    reasonCode: input.reasonCode,
    severityMultiplier,
    executionDelayFactor,
    evidenceBurdenMultiplier,
    governanceOverheadAddition,
  };
}

export function calculateReliabilityDecay(input: {
  componentId: string;
  currentReliability: number;
  decayRate: number;
  lastAttestedAt: string;
  nowIso?: string;
}): ReliabilityDecay {
  const now = Date.parse(input.nowIso ?? new Date().toISOString());
  const lastAttested = Date.parse(input.lastAttestedAt);
  const elapsedSeconds = Math.max(0, (now - lastAttested) / 1000);
  const decayedReliability = Math.max(0, input.currentReliability * Math.exp(-input.decayRate * elapsedSeconds / 3600));
  const decayReason = input.decayRate > 0.01 ? "high_decay_rate" : "time_since_attestation";
  const recommendation =
    decayedReliability < 0.5
      ? "immediate_re_attestation_required"
      : decayedReliability < 0.8
        ? "re_attestation_recommended"
        : "within_acceptable_bounds";

  return {
    componentId: input.componentId,
    currentReliability: input.currentReliability,
    decayRate: input.decayRate,
    lastAttestedAt: input.lastAttestedAt,
    decayedReliability,
    decayReason,
    recommendation,
  };
}

export function calculateCapabilityEconomicsScore(input: {
  requestId?: string;
  candidateId: string;
  candidateClass: "local_provider" | "remote_worker";
  trustLevel: string;
  attestationRequired: boolean;
  operatorReviewRequired: boolean;
  attestationFresh: boolean;
  conflictDetected: boolean;
  revoked: boolean;
  computeBase: number;
  routingOverhead?: number;
  governanceOverhead?: number;
  degradedStates: Array<{ category: string; reasonCode: string; severity: "info" | "warning" | "error" | "critical" }>;
  policyComplexity: number;
  currentReliability: number;
  decayRate: number;
  lastAttestedAt: string;
  options?: EconomicsScoringOptions;
}): CapabilityEconomicsScore {
  const opts = input.options ?? DEFAULT_SCORING_OPTIONS;

  const trustCost = calculateTrustCost({
    trustLevel: input.trustLevel,
    attestationRequired: input.attestationRequired,
    operatorReviewRequired: input.operatorReviewRequired,
    attestationFresh: input.attestationFresh,
    conflictDetected: input.conflictDetected,
    revoked: input.revoked,
    options: opts,
  });

  const degradedPenalties = input.degradedStates.map((d) =>
    calculateDegradedPenalty({ category: d.category, reasonCode: d.reasonCode, severity: d.severity, options: opts }),
  );
  const totalDegradedPenalty = degradedPenalties.reduce((sum, p) => sum + p.severityMultiplier, 0);

  const executionCost = calculateExecutionCost({
    computeBase: input.computeBase,
    routingOverhead: input.routingOverhead,
    governanceOverhead: input.governanceOverhead,
    degradedStatePenalty: totalDegradedPenalty,
    options: opts,
  });

  const evidenceBurden = calculateEvidenceBurden({
    trustLevel: input.trustLevel,
    degradedStateCount: input.degradedStates.length,
    policyComplexity: input.policyComplexity,
    options: opts,
  });

  const reliabilityDecay = calculateReliabilityDecay({
    componentId: input.candidateId,
    currentReliability: input.currentReliability,
    decayRate: input.decayRate,
    lastAttestedAt: input.lastAttestedAt,
  });

  const unknownFactors: string[] = [];
  if (input.trustLevel === "unknown") unknownFactors.push("trust_level_unknown");
  if (input.degradedStates.length > 0) unknownFactors.push("degraded_states_present");
  if (reliabilityDecay.decayedReliability < 0.8) unknownFactors.push("reliability_decayed");

  const totalScore =
    trustCost.totalTrustCost * opts.weights.trustWeight +
    executionCost.totalExecutionCost * opts.weights.executionWeight +
    evidenceBurden.evidenceGenerationCost * opts.weights.evidenceWeight +
    (1 - reliabilityDecay.decayedReliability) * 10 * opts.weights.reliabilityWeight +
    totalDegradedPenalty * opts.weights.degradedPenaltyWeight;

  const score: Omit<CapabilityEconomicsScore, "scoreHash"> = {
    snapshotId: stableHash("econ-snapshot", { candidateId: input.candidateId }),
    evaluatedAt: new Date().toISOString(),
    requestId: input.requestId,
    candidateId: input.candidateId,
    candidateClass: input.candidateClass,
    trustCost,
    executionCost,
    evidenceBurden,
    reliabilityDecay,
    degradedPenalties,
    totalScore,
    costBreakdown: {
      trustWeight: opts.weights.trustWeight,
      executionWeight: opts.weights.executionWeight,
      evidenceWeight: opts.weights.evidenceWeight,
      reliabilityWeight: opts.weights.reliabilityWeight,
      degradedPenaltyWeight: opts.weights.degradedPenaltyWeight,
    },
    assumptions: [
      "cost_weights_are_configured",
      "trust_level_costs_are_current",
      "degraded_severity_multipliers_are_current",
    ],
    unknownFactors,
  };
  const scoreHash = stableHash("econ-score", {
    snapshotId: score.snapshotId,
    candidateId: score.candidateId,
    totalScore: score.totalScore,
  });
  return { ...score, scoreHash };
}

export function selectCandidateByEconomics(
  scores: CapabilityEconomicsScore[],
): { selectedCandidateId: string; reason: string; totalEconomicsCost: number } | undefined {
  if (scores.length === 0) return undefined;

  const sorted = [...scores].sort((a, b) => a.totalScore - b.totalScore);
  const selected = sorted[0];

  return {
    selectedCandidateId: selected.candidateId,
    reason: `lowest_total_score:${selected.totalScore.toFixed(2)}`,
    totalEconomicsCost: selected.totalScore,
  };
}

export function createEconomicsSnapshot(input: {
  scores: CapabilityEconomicsScore[];
  selectedCandidate?: string;
  selectionReason?: string;
  assumptions?: string[];
}): EconomicsSnapshot {
  const totalEconomicsCost = input.scores.reduce((sum, s) => sum + s.totalScore, 0) / Math.max(1, input.scores.length);
  const snapshot: Omit<EconomicsSnapshot, "snapshotHash"> = {
    snapshotId: stableHash("economics-snapshot", { scoreCount: input.scores.length, selectedCandidate: input.selectedCandidate }),
    capturedAt: new Date().toISOString(),
    scores: input.scores,
    selectedCandidate: input.selectedCandidate,
    selectionReason: input.selectionReason ?? (input.selectedCandidate ? "economics_optimal" : "no_candidate"),
    totalEconomicsCost,
    assumptions: input.assumptions ?? ["economics_snapshot_is_deterministic"],
  };
  const snapshotHash = stableHash("economics-snapshot", {
    snapshotId: snapshot.snapshotId,
    totalEconomicsCost: snapshot.totalEconomicsCost,
    scoreCount: snapshot.scores.length,
  });
  return { ...snapshot, snapshotHash };
}
