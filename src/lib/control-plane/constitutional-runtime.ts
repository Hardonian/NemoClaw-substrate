// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";
import { deterministicSerialize } from "./serde";

export type InvariantId = string;
export type InvariantViolationId = string;
export type ConstitutionalValidationId = string;

export type InvariantCategory =
  | "operator_supremacy"
  | "evidence_requirement"
  | "bounded_autonomy"
  | "anti_theatre"
  | "deterministic_truth"
  | "non_fabrication"
  | "degraded_state_disclosure"
  | "fail_closed"
  | "replay_integrity"
  | "authority_chain"
  | "no_implicit_trust"
  | "no_silent_execution"
  | "no_hidden_retry"
  | "no_autonomous_policy_mutation"
  | "no_speculative_execution";

export type InvariantSeverity = "critical" | "error" | "warning";
export type InvariantState = "active" | "suspended" | "deprecated";
export type ViolationState = "detected" | "acknowledged" | "mitigated" | "resolved" | "dismissed";

export interface InvariantRule {
  invariantId: InvariantId;
  category: InvariantCategory;
  description: string;
  severity: InvariantSeverity;
  state: InvariantState;
  condition: string;
  enforcement: "block" | "warn" | "log";
  createdAt: string;
  createdBy: string;
  metadata: Record<string, string>;
  invariantHash: string;
}

export interface InvariantViolation {
  violationId: InvariantViolationId;
  invariantId: InvariantId;
  category: InvariantCategory;
  detectedAt: string;
  severity: InvariantSeverity;
  state: ViolationState;
  context: Record<string, unknown>;
  explanation: string;
  enforcementAction: "blocked" | "warned" | "logged";
  evidenceRefs: string[];
  relatedIntentId?: string;
  relatedPlanId?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  mitigatedAt?: string;
  mitigatedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  dismissalReason?: string;
  dismissalBy?: string;
  violationHash: string;
}

export interface ConstitutionalValidationResult {
  validationId: ConstitutionalValidationId;
  validatedAt: string;
  checkedInvariantCount: number;
  violationsFound: number;
  violations: InvariantViolation[];
  allPassed: boolean;
  blocked: boolean;
  warnings: string[];
  validationHash: string;
}

export interface InvariantContract {
  version: "1";
  contractId: string;
  createdAt: string;
  rules: InvariantRule[];
  enforcementPolicy: "strict" | "standard" | "permissive";
  operatorSupremacyGuaranteed: true;
  boundedAutonomyEnforced: true;
  antiTheatreEnforced: true;
  nonFabricationEnforced: true;
  failClosedGuaranteed: true;
  contractHash: string;
}

export interface ConstitutionalRuntimeConfig {
  invariantContractId: string;
  enforcementMode: "strict" | "audit" | "disabled";
  failClosed: boolean;
  blockOnViolation: boolean;
  requireOperatorApprovalForOverride: boolean;
  maxViolationsBeforeBlock: number;
  evidenceRequirementLevel: "none" | "basic" | "full" | "dispute_grade";
}

export const DEFAULT_CONSTITUTIONAL_CONFIG: ConstitutionalRuntimeConfig = {
  invariantContractId: "default",
  enforcementMode: "strict",
  failClosed: true,
  blockOnViolation: true,
  requireOperatorApprovalForOverride: true,
  maxViolationsBeforeBlock: 1,
  evidenceRequirementLevel: "full",
};

export function createDefaultInvariantRules(): InvariantRule[] {
  const now = new Date().toISOString();
  const rules: Omit<InvariantRule, "invariantHash">[] = [
    {
      invariantId: "INV-001",
      category: "operator_supremacy",
      description: "Operator authority must always supersede automated decisions",
      severity: "critical",
      state: "active",
      condition: "operator_override_available AND operator_override_respected",
      enforcement: "block",
      createdAt: now,
      createdBy: "system",
      metadata: {},
    },
    {
      invariantId: "INV-002",
      category: "evidence_requirement",
      description: "All execution decisions must have traceable evidence",
      severity: "critical",
      state: "active",
      condition: "evidence_chain_complete AND evidence_references_present",
      enforcement: "block",
      createdAt: now,
      createdBy: "system",
      metadata: {},
    },
    {
      invariantId: "INV-003",
      category: "bounded_autonomy",
      description: "No autonomous execution without bounded authority",
      severity: "critical",
      state: "active",
      condition: "authority_source_present AND delegation_scope_defined",
      enforcement: "block",
      createdAt: now,
      createdBy: "system",
      metadata: {},
    },
    {
      invariantId: "INV-004",
      category: "anti_theatre",
      description: "No fake distributed execution, GPU balancing, or autonomous orchestration claims",
      severity: "critical",
      state: "active",
      condition: "NO_fake_distributed_claims AND NO_fake_gpu_balancing AND NO_autonomous_orchestration",
      enforcement: "block",
      createdAt: now,
      createdBy: "system",
      metadata: {},
    },
    {
      invariantId: "INV-005",
      category: "deterministic_truth",
      description: "All decisions must be deterministic and replayable",
      severity: "critical",
      state: "active",
      condition: "deterministic_serialization AND replay_validation_passes",
      enforcement: "block",
      createdAt: now,
      createdBy: "system",
      metadata: {},
    },
    {
      invariantId: "INV-006",
      category: "non_fabrication",
      description: "No fabrication of telemetry, trust, replay lineage, or diagnostics",
      severity: "critical",
      state: "active",
      condition: "NO_fabricated_telemetry AND NO_fabricated_trust AND NO_fabricated_replay AND NO_fabricated_diagnostics",
      enforcement: "block",
      createdAt: now,
      createdBy: "system",
      metadata: {},
    },
    {
      invariantId: "INV-007",
      category: "degraded_state_disclosure",
      description: "Degraded states must always be explicitly disclosed",
      severity: "error",
      state: "active",
      condition: "degraded_states_disclosed AND unknown_states_marked",
      enforcement: "block",
      createdAt: now,
      createdBy: "system",
      metadata: {},
    },
    {
      invariantId: "INV-008",
      category: "fail_closed",
      description: "System must fail closed on any invariant violation",
      severity: "critical",
      state: "active",
      condition: "fail_closed_enabled AND no_silent_degradation",
      enforcement: "block",
      createdAt: now,
      createdBy: "system",
      metadata: {},
    },
    {
      invariantId: "INV-009",
      category: "replay_integrity",
      description: "Replay validation must fail closed on lineage mismatch",
      severity: "critical",
      state: "active",
      condition: "replay_lineage_complete AND replay_hashes_match",
      enforcement: "block",
      createdAt: now,
      createdBy: "system",
      metadata: {},
    },
    {
      invariantId: "INV-010",
      category: "no_implicit_trust",
      description: "Trust must never be inherited implicitly; all trust must be explicit and attested",
      severity: "critical",
      state: "active",
      condition: "trust_explicitly_attested AND no_implicit_trust_inheritance",
      enforcement: "block",
      createdAt: now,
      createdBy: "system",
      metadata: {},
    },
    {
      invariantId: "INV-011",
      category: "no_silent_execution",
      description: "No silent execution; all execution must produce evidence",
      severity: "critical",
      state: "active",
      condition: "execution_produces_evidence AND no_silent_mode",
      enforcement: "block",
      createdAt: now,
      createdBy: "system",
      metadata: {},
    },
    {
      invariantId: "INV-012",
      category: "no_hidden_retry",
      description: "No hidden retries; all retry attempts must be logged and evidence-linked",
      severity: "error",
      state: "active",
      condition: "all_retries_logged AND retry_evidence_linked",
      enforcement: "block",
      createdAt: now,
      createdBy: "system",
      metadata: {},
    },
    {
      invariantId: "INV-013",
      category: "no_autonomous_policy_mutation",
      description: "Policy must never mutate automatically; all changes require operator approval",
      severity: "critical",
      state: "active",
      condition: "no_auto_policy_change AND operator_approval_required",
      enforcement: "block",
      createdAt: now,
      createdBy: "system",
      metadata: {},
    },
    {
      invariantId: "INV-014",
      category: "no_speculative_execution",
      description: "No speculative or fanout execution without explicit authority",
      severity: "error",
      state: "active",
      condition: "no_unauthorized_speculation AND explicit_authority_required",
      enforcement: "block",
      createdAt: now,
      createdBy: "system",
      metadata: {},
    },
    {
      invariantId: "INV-015",
      category: "authority_chain",
      description: "All execution must have a verifiable authority chain back to an operator",
      severity: "critical",
      state: "active",
      condition: "authority_chain_verifiable AND chain_reaches_operator",
      enforcement: "block",
      createdAt: now,
      createdBy: "system",
      metadata: {},
    },
  ];
  return rules.map((rule) => {
    const invariantHash = stableHash("invariant", { invariantId: rule.invariantId, category: rule.category });
    return { ...rule, invariantHash };
  });
}

function stableHash(prefix: string, value: unknown): string {
  return `${prefix}-${createHash("sha256").update(deterministicSerialize(value)).digest("base64url").slice(0, 32)}`;
}

export function createInvariantContract(input?: {
  rules?: InvariantRule[];
  enforcementPolicy?: "strict" | "standard" | "permissive";
}): InvariantContract {
  const rules = input?.rules ?? createDefaultInvariantRules();
  const contract: Omit<InvariantContract, "contractHash"> = {
    version: "1",
    contractId: stableHash("invariant-contract", { ruleCount: rules.length }),
    createdAt: new Date().toISOString(),
    rules,
    enforcementPolicy: input?.enforcementPolicy ?? "strict",
    operatorSupremacyGuaranteed: true,
    boundedAutonomyEnforced: true,
    antiTheatreEnforced: true,
    nonFabricationEnforced: true,
    failClosedGuaranteed: true,
  };
  const contractHash = stableHash("contract", {
    contractId: contract.contractId,
    ruleCount: contract.rules.length,
    enforcementPolicy: contract.enforcementPolicy,
  });
  return { ...contract, contractHash };
}

export function detectInvariantViolations(input: {
  contract: InvariantContract;
  context: Record<string, unknown>;
  checks: Record<string, boolean>;
  intentId?: string;
  planId?: string;
  evidenceRefs?: string[];
}): InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  for (const rule of input.contract.rules) {
    if (rule.state !== "active") continue;

    const checkKey = rule.invariantId;
    const checkResult = input.checks[checkKey];

    if (checkResult === false) {
      const violation: Omit<InvariantViolation, "violationHash"> = {
        violationId: stableHash("violation", { invariantId: rule.invariantId, detectedAt: new Date().toISOString() }),
        invariantId: rule.invariantId,
        category: rule.category,
        detectedAt: new Date().toISOString(),
        severity: rule.severity,
        state: "detected",
        context: { ...input.context, ruleCondition: rule.condition },
        explanation: `Invariant violated: ${rule.description}`,
        enforcementAction: rule.enforcement === "block" ? "blocked" : rule.enforcement === "warn" ? "warned" : "logged",
        evidenceRefs: input.evidenceRefs ?? [],
        relatedIntentId: input.intentId,
        relatedPlanId: input.planId,
      };
      const violationHash = stableHash("violation", {
        violationId: violation.violationId,
        invariantId: violation.invariantId,
        severity: violation.severity,
        enforcementAction: violation.enforcementAction,
      });
      violations.push({ ...violation, violationHash });
    }
  }

  return violations;
}

export function validateConstitutionalRuntime(input: {
  contract: InvariantContract;
  config: ConstitutionalRuntimeConfig;
  context: Record<string, unknown>;
  checks: Record<string, boolean>;
  intentId?: string;
  planId?: string;
  evidenceRefs?: string[];
}): ConstitutionalValidationResult {
  if (input.config.enforcementMode === "disabled") {
    const result: Omit<ConstitutionalValidationResult, "validationHash"> = {
      validationId: stableHash("constitutional-validation", { disabled: true }),
      validatedAt: new Date().toISOString(),
      checkedInvariantCount: 0,
      violationsFound: 0,
      violations: [],
      allPassed: true,
      blocked: false,
      warnings: ["constitutional_runtime_disabled"],
    };
    return { ...result, validationHash: stableHash("validation", { validationId: result.validationId, allPassed: true }) };
  }

  const violations = detectInvariantViolations({
    contract: input.contract,
    context: input.context,
    checks: input.checks,
    intentId: input.intentId,
    planId: input.planId,
    evidenceRefs: input.evidenceRefs,
  });

  const activeRules = input.contract.rules.filter((r) => r.state === "active");
  const hasCriticalViolations = violations.some((v) => v.severity === "critical");
  const blocked = input.config.blockOnViolation && hasCriticalViolations;

  const warnings: string[] = [];
  for (const v of violations) {
    if (v.severity === "warning") {
      warnings.push(v.explanation);
    }
  }

  if (input.config.enforcementMode === "audit" && violations.length > 0) {
    warnings.push("violations_detected_in_audit_mode");
  }

  const result: Omit<ConstitutionalValidationResult, "validationHash"> = {
    validationId: stableHash("constitutional-validation", {
      violationCount: violations.length,
      blocked,
    }),
    validatedAt: new Date().toISOString(),
    checkedInvariantCount: activeRules.length,
    violationsFound: violations.length,
    violations,
    allPassed: violations.length === 0,
    blocked,
    warnings,
  };
  const validationHash = stableHash("validation", {
    validationId: result.validationId,
    allPassed: result.allPassed,
    violationsFound: result.violationsFound,
  });
  return { ...result, validationHash };
}

export function acknowledgeViolation(
  violation: InvariantViolation,
  acknowledgedBy: string,
): InvariantViolation {
  const updated: InvariantViolation = {
    ...violation,
    state: "acknowledged",
    acknowledgedAt: new Date().toISOString(),
    acknowledgedBy,
    violationHash: "",
  };
  const violationHash = stableHash("violation", {
    violationId: updated.violationId,
    state: updated.state,
    acknowledgedAt: updated.acknowledgedAt,
  });
  return { ...updated, violationHash };
}

export function resolveViolation(
  violation: InvariantViolation,
  resolvedBy: string,
  resolution?: string,
): InvariantViolation {
  const updated: InvariantViolation = {
    ...violation,
    state: "resolved",
    resolvedAt: new Date().toISOString(),
    resolvedBy,
    violationHash: "",
  };
  const violationHash = stableHash("violation", {
    violationId: updated.violationId,
    state: updated.state,
    resolvedAt: updated.resolvedAt,
  });
  return { ...updated, violationHash };
}

export function dismissViolation(
  violation: InvariantViolation,
  dismissedBy: string,
  reason: string,
): InvariantViolation {
  const updated: InvariantViolation = {
    ...violation,
    state: "dismissed",
    dismissalReason: reason,
    dismissalBy: dismissedBy,
    violationHash: "",
  };
  const violationHash = stableHash("violation", {
    violationId: updated.violationId,
    state: updated.state,
    dismissalBy: updated.dismissalBy,
  });
  return { ...updated, violationHash };
}

export function createConstitutionalRuntimeConfig(overrides?: Partial<ConstitutionalRuntimeConfig>): ConstitutionalRuntimeConfig {
  return { ...DEFAULT_CONSTITUTIONAL_CONFIG, ...overrides };
}
