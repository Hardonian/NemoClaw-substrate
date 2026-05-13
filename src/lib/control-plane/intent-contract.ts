// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";
import { deterministicSerialize } from "./serde";

export type IntentContractId = string;
export type IntentLineageId = string;
export type DelegatedAuthorityScopeId = string;
export type OperatorAuthorityId = string;
export type EscalationBoundaryId = string;
export type IntentMutationRecordId = string;
export type ExecutionAuthorizationEnvelopeId = string;
export type IntentReplayReferenceId = string;

export type IntentContractState =
  | "draft"
  | "submitted"
  | "authorized"
  | "delegated"
  | "escalated"
  | "mutated"
  | "revoked"
  | "expired"
  | "executed"
  | "failed";

export type IntentContractSeverity =
  | "info"
  | "low"
  | "medium"
  | "high"
  | "critical";

export type DelegationScope =
  | "none"
  | "read_only"
  | "execute_bounded"
  | "execute_full"
  | "delegate_further";

export type EscalationTrigger =
  | "trust_below_threshold"
  | "evidence_missing"
  | "policy_denied"
  | "operator_override_required"
  | "degraded_state_critical"
  | "replay_lineage_broken"
  | "invariant_violation"
  | "authority_expired"
  | "conflict_detected"
  | "timeout_exceeded";

export type MutationReason =
  | "parameter_adjustment"
  | "constraint_relaxation"
  | "constraint_tightening"
  | "scope_expansion"
  | "scope_reduction"
  | "authority_change"
  | "escalation_required"
  | "operator_directive";

export interface IntentContractConstraints {
  maxExecutionTimeMs?: number;
  maxRetryCount?: number;
  allowedDegradedCategories: string[];
  requiredEvidenceCategories: string[];
  trustLevelMinimum: "untrusted" | "observed" | "trusted_local" | "trusted_remote";
  evidenceBurdenMinimum: "none" | "basic" | "full" | "dispute_grade";
  mustReplayValidate: boolean;
  failClosed: boolean;
}

export interface IntentContractTrustRequirements {
  minimumTrustLevel: string;
  attestationRequired: boolean;
  attestationFreshnessSeconds?: number;
  operatorApprovalRequired: boolean;
  quorumSize?: number;
  quorumOperators?: string[];
  conflictingTrustDenies: boolean;
}

export interface IntentContractDegradedRequirements {
  allowedCategories: string[];
  maxSeverity: IntentContractSeverity;
  requireDisclosure: boolean;
  haltOnUnknown: boolean;
}

export interface IntentContract {
  version: "1";
  intentId: IntentContractId;
  createdAt: string;
  actor: string;
  action: string;
  command?: string;
  provider?: string;
  model?: string;
  targetNodeId?: string;
  targetEndpoint?: string;
  executionMode: "local" | "remote";
  constraints: IntentContractConstraints;
  trustRequirements: IntentContractTrustRequirements;
  degradedRequirements: IntentContractDegradedRequirements;
  expirationAt?: string;
  state: IntentContractState;
  lineageId: IntentLineageId;
  authoritySource: OperatorAuthorityId;
  delegationScopeId?: DelegatedAuthorityScopeId;
  escalationBoundaryId?: EscalationBoundaryId;
  mutationRecordIds: IntentMutationRecordId[];
  parentIntentId?: IntentContractId;
  metadata: Record<string, string>;
  intentHash: string;
}

export interface IntentLineageEntry {
  intentId: IntentContractId;
  lineageId: IntentLineageId;
  parentIntentId?: IntentContractId;
  parentLineageId?: IntentLineageId;
  relationship: "root" | "derived" | "delegated" | "escalated" | "mutated";
  at: string;
  actor: string;
  reason: string;
}

export interface IntentLineage {
  lineageId: IntentLineageId;
  rootIntentId: IntentContractId;
  chain: IntentLineageEntry[];
  depth: number;
  createdAt: string;
  updatedAt: string;
  lineageHash: string;
}

export interface DelegatedAuthorityScope {
  scopeId: DelegatedAuthorityScopeId;
  grantorAuthorityId: OperatorAuthorityId;
  granteeActor: string;
  scope: DelegationScope;
  allowedActions: string[];
  allowedTargets: string[];
  grantedAt: string;
  expiresAt?: string;
  revocable: boolean;
  replayable: true;
  reason: string;
}

export interface OperatorAuthority {
  authorityId: OperatorAuthorityId;
  operatorId: string;
  operatorRole: string;
  grantedAt: string;
  grantedBy: string;
  scope: string[];
  expiresAt?: string;
  revoked: boolean;
  revokedAt?: string;
  revokedBy?: string;
}

export interface EscalationBoundary {
  boundaryId: EscalationBoundaryId;
  intentId: IntentContractId;
  trigger: EscalationTrigger;
  targetOperator: string;
  escalationRequired: boolean;
  autoHalt: boolean;
  createdAt: string;
  triggered: boolean;
  triggeredAt?: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface IntentMutationRecord {
  mutationId: IntentMutationRecordId;
  intentId: IntentContractId;
  mutationType: MutationReason;
  beforeHash: string;
  afterHash: string;
  mutatedAt: string;
  mutatedBy: string;
  reason: string;
  authorized: boolean;
  authorizationId?: string;
}

export interface ExecutionAuthorizationEnvelope {
  envelopeId: ExecutionAuthorizationEnvelopeId;
  intentId: IntentContractId;
  authorityId: OperatorAuthorityId;
  delegationScopeId?: DelegatedAuthorityScopeId;
  authorizedAt: string;
  authorizedBy: string;
  expiresAt?: string;
  constraints: IntentContractConstraints;
  trustRequirements: IntentContractTrustRequirements;
  intentHash: string;
  envelopeHash: string;
}

export interface IntentReplayReference {
  replayRefId: IntentReplayReferenceId;
  intentId: IntentContractId;
  lineageId: IntentLineageId;
  replayVersion: string;
  lineage: string[];
  authorityChain: OperatorAuthorityId[];
  delegationChain: DelegatedAuthorityScopeId[];
  mutationChain: IntentMutationRecordId[];
  createdAt: string;
}

export interface IntentContractValidationResult {
  valid: boolean;
  reasons: string[];
  warnings: string[];
}

function stableHash(prefix: string, value: unknown): string {
  return `${prefix}-${createHash("sha256").update(deterministicSerialize(value)).digest("base64url").slice(0, 32)}`;
}

export function hashIntentContract(contract: Omit<IntentContract, "intentHash">): string {
  return stableHash("intent", {
    intentId: contract.intentId,
    actor: contract.actor,
    action: contract.action,
    command: contract.command,
    provider: contract.provider,
    model: contract.model,
    targetNodeId: contract.targetNodeId,
    targetEndpoint: contract.targetEndpoint,
    executionMode: contract.executionMode,
    constraints: contract.constraints,
    trustRequirements: contract.trustRequirements,
    degradedRequirements: contract.degradedRequirements,
    expirationAt: contract.expirationAt,
    lineageId: contract.lineageId,
    authoritySource: contract.authoritySource,
    delegationScopeId: contract.delegationScopeId,
    escalationBoundaryId: contract.escalationBoundaryId,
    parentIntentId: contract.parentIntentId,
  });
}

export function computeIntentLineageHash(chain: IntentLineageEntry[]): string {
  return stableHash("lineage", chain);
}

export function createIntentContract(input: {
  intentId: string;
  actor: string;
  action: string;
  command?: string;
  provider?: string;
  model?: string;
  targetNodeId?: string;
  targetEndpoint?: string;
  executionMode: "local" | "remote";
  constraints: IntentContractConstraints;
  trustRequirements: IntentContractTrustRequirements;
  degradedRequirements: IntentContractDegradedRequirements;
  expirationAt?: string;
  authoritySource: string;
  lineageId: string;
  parentIntentId?: string;
  metadata?: Record<string, string>;
}): IntentContract {
  const base: Omit<IntentContract, "intentHash"> = {
    version: "1",
    intentId: input.intentId,
    createdAt: new Date().toISOString(),
    actor: input.actor,
    action: input.action,
    command: input.command,
    provider: input.provider,
    model: input.model,
    targetNodeId: input.targetNodeId,
    targetEndpoint: input.targetEndpoint,
    executionMode: input.executionMode,
    constraints: input.constraints,
    trustRequirements: input.trustRequirements,
    degradedRequirements: input.degradedRequirements,
    expirationAt: input.expirationAt,
    state: "draft",
    lineageId: input.lineageId,
    authoritySource: input.authoritySource,
    mutationRecordIds: [],
    parentIntentId: input.parentIntentId,
    metadata: input.metadata ?? {},
    intentHash: "",
  };
  const intentHash = hashIntentContract(base);
  return { ...base, intentHash };
}

export function createIntentLineage(input: {
  rootIntentId: string;
  entries: Omit<IntentLineageEntry, "lineageId">[];
}): IntentLineage {
  const lineageId = stableHash("lineage", { rootIntentId: input.rootIntentId, entries: input.entries });
  const chain: IntentLineageEntry[] = input.entries.map((e, i) => ({
    ...e,
    lineageId: i === 0 ? lineageId : stableHash("lineage-entry", { ...e, index: i }),
  }));
  const lineageHash = computeIntentLineageHash(chain);
  return {
    lineageId,
    rootIntentId: input.rootIntentId,
    chain,
    depth: chain.length,
    createdAt: chain[0]?.at ?? new Date().toISOString(),
    updatedAt: chain[chain.length - 1]?.at ?? new Date().toISOString(),
    lineageHash,
  };
}

export function createDelegatedAuthorityScope(input: {
  grantorAuthorityId: string;
  granteeActor: string;
  scope: DelegationScope;
  allowedActions: string[];
  allowedTargets: string[];
  expiresAt?: string;
  revocable?: boolean;
  reason: string;
}): DelegatedAuthorityScope {
  return {
    scopeId: stableHash("delegation", { grantorAuthorityId: input.grantorAuthorityId, granteeActor: input.granteeActor, scope: input.scope }),
    grantorAuthorityId: input.grantorAuthorityId,
    granteeActor: input.granteeActor,
    scope: input.scope,
    allowedActions: [...input.allowedActions].sort(),
    allowedTargets: [...input.allowedTargets].sort(),
    grantedAt: new Date().toISOString(),
    expiresAt: input.expiresAt,
    revocable: input.revocable ?? true,
    replayable: true,
    reason: input.reason,
  };
}

export function createOperatorAuthority(input: {
  operatorId: string;
  operatorRole: string;
  grantedBy: string;
  scope: string[];
  expiresAt?: string;
}): OperatorAuthority {
  return {
    authorityId: stableHash("authority", { operatorId: input.operatorId, operatorRole: input.operatorRole }),
    operatorId: input.operatorId,
    operatorRole: input.operatorRole,
    grantedAt: new Date().toISOString(),
    grantedBy: input.grantedBy,
    scope: [...input.scope].sort(),
    expiresAt: input.expiresAt,
    revoked: false,
  };
}

export function createEscalationBoundary(input: {
  intentId: string;
  trigger: EscalationTrigger;
  targetOperator: string;
  escalationRequired?: boolean;
  autoHalt?: boolean;
}): EscalationBoundary {
  return {
    boundaryId: stableHash("escalation", { intentId: input.intentId, trigger: input.trigger, targetOperator: input.targetOperator }),
    intentId: input.intentId,
    trigger: input.trigger,
    targetOperator: input.targetOperator,
    escalationRequired: input.escalationRequired ?? true,
    autoHalt: input.autoHalt ?? true,
    createdAt: new Date().toISOString(),
    triggered: false,
    resolved: false,
  };
}

export function recordIntentMutation(input: {
  intentId: string;
  mutationType: MutationReason;
  beforeContract: IntentContract;
  afterContract: IntentContract;
  mutatedBy: string;
  reason: string;
  authorized: boolean;
  authorizationId?: string;
}): IntentMutationRecord {
  return {
    mutationId: stableHash("mutation", { intentId: input.intentId, mutationType: input.mutationType, mutatedBy: input.mutatedBy }),
    intentId: input.intentId,
    mutationType: input.mutationType,
    beforeHash: input.beforeContract.intentHash,
    afterHash: input.afterContract.intentHash,
    mutatedAt: new Date().toISOString(),
    mutatedBy: input.mutatedBy,
    reason: input.reason,
    authorized: input.authorized,
    authorizationId: input.authorizationId,
  };
}

export function createExecutionAuthorizationEnvelope(input: {
  intentId: string;
  authorityId: string;
  authorizedBy: string;
  constraints: IntentContractConstraints;
  trustRequirements: IntentContractTrustRequirements;
  intentHash: string;
  delegationScopeId?: string;
  expiresAt?: string;
}): ExecutionAuthorizationEnvelope {
  const envelope: Omit<ExecutionAuthorizationEnvelope, "envelopeHash"> = {
    envelopeId: stableHash("auth-envelope", { intentId: input.intentId, authorityId: input.authorityId }),
    intentId: input.intentId,
    authorityId: input.authorityId,
    delegationScopeId: input.delegationScopeId,
    authorizedAt: new Date().toISOString(),
    authorizedBy: input.authorizedBy,
    expiresAt: input.expiresAt,
    constraints: input.constraints,
    trustRequirements: input.trustRequirements,
    intentHash: input.intentHash,
    envelopeHash: "",
  };
  const envelopeHash = stableHash("envelope", {
    envelopeId: envelope.envelopeId,
    intentId: envelope.intentId,
    authorityId: envelope.authorityId,
    delegationScopeId: envelope.delegationScopeId,
    intentHash: envelope.intentHash,
    constraints: envelope.constraints,
    trustRequirements: envelope.trustRequirements,
  });
  return { ...envelope, envelopeHash };
}

export function createIntentReplayReference(input: {
  intentId: string;
  lineageId: string;
  replayVersion?: string;
  lineage?: string[];
  authorityChain?: string[];
  delegationChain?: string[];
  mutationChain?: string[];
}): IntentReplayReference {
  return {
    replayRefId: stableHash("intent-replay", { intentId: input.intentId, lineageId: input.lineageId }),
    intentId: input.intentId,
    lineageId: input.lineageId,
    replayVersion: input.replayVersion ?? "1",
    lineage: input.lineage ?? ["intent-contract", input.intentId],
    authorityChain: input.authorityChain ?? [],
    delegationChain: input.delegationChain ?? [],
    mutationChain: input.mutationChain ?? [],
    createdAt: new Date().toISOString(),
  };
}

export function validateIntentContract(contract: IntentContract, nowIso?: string): IntentContractValidationResult {
  const reasons: string[] = [];
  const warnings: string[] = [];

  if (!contract.intentId.trim()) reasons.push("missing_intent_id");
  if (!contract.actor.trim()) reasons.push("missing_actor");
  if (!contract.action.trim()) reasons.push("missing_action");
  if (!contract.lineageId.trim()) reasons.push("missing_lineage_id");
  if (!contract.authoritySource.trim()) reasons.push("missing_authority_source");

  const computedHash = hashIntentContract(contract);
  if (computedHash !== contract.intentHash) reasons.push("intent_hash_mismatch");

  if (contract.expirationAt && nowIso && Date.parse(nowIso) > Date.parse(contract.expirationAt)) {
    reasons.push("intent_expired");
  }

  if (contract.parentIntentId && !contract.parentIntentId.trim()) {
    reasons.push("invalid_parent_intent_reference");
  }

  if (contract.delegationScopeId && contract.state === "delegated" && !contract.delegationScopeId.trim()) {
    reasons.push("delegated_without_delegation_scope");
  }

  if (contract.trustRequirements.minimumTrustLevel && !["untrusted", "observed", "trusted_local", "trusted_remote"].includes(contract.trustRequirements.minimumTrustLevel)) {
    reasons.push("invalid_minimum_trust_level");
  }

  if (contract.constraints.failClosed === undefined) {
    warnings.push("fail_closed_not_explicit");
  }

  if (!contract.constraints.mustReplayValidate) {
    warnings.push("replay_validation_not_required");
  }

  return { valid: reasons.length === 0, reasons, warnings };
}

export function validateIntentLineage(lineage: IntentLineage): IntentContractValidationResult {
  const reasons: string[] = [];

  if (!lineage.lineageId.trim()) reasons.push("missing_lineage_id");
  if (!lineage.rootIntentId.trim()) reasons.push("missing_root_intent_id");
  if (lineage.chain.length === 0) reasons.push("empty_lineage_chain");

  if (lineage.chain.length > 0 && lineage.chain[0].relationship !== "root") {
    reasons.push("lineage_must_start_with_root");
  }

  const seenIds = new Set<string>();
  for (const entry of lineage.chain) {
    if (seenIds.has(entry.intentId)) {
      reasons.push(`duplicate_intent_in_lineage:${entry.intentId}`);
    }
    seenIds.add(entry.intentId);
  }

  const computedHash = computeIntentLineageHash(lineage.chain);
  if (computedHash !== lineage.lineageHash) {
    reasons.push("lineage_hash_mismatch");
  }

  return { valid: reasons.length === 0, reasons, warnings: [] };
}

export function validateDelegationScope(scope: DelegatedAuthorityScope, nowIso?: string): IntentContractValidationResult {
  const reasons: string[] = [];

  if (!scope.scopeId.trim()) reasons.push("missing_scope_id");
  if (!scope.grantorAuthorityId.trim()) reasons.push("missing_grantor_authority");
  if (!scope.granteeActor.trim()) reasons.push("missing_grantee_actor");
  if (scope.scope === "none" && scope.allowedActions.length > 0) {
    reasons.push("none_scope_with_allowed_actions");
  }

  if (scope.expiresAt && nowIso && Date.parse(nowIso) > Date.parse(scope.expiresAt)) {
    reasons.push("delegation_expired");
  }

  if (scope.allowedActions.length === 0 && scope.scope !== "read_only") {
    reasons.push("empty_allowed_actions_for_non_readonly_scope");
  }

  return { valid: reasons.length === 0, reasons, warnings: [] };
}

export function validateOperatorAuthority(authority: OperatorAuthority, nowIso?: string): IntentContractValidationResult {
  const reasons: string[] = [];

  if (!authority.authorityId.trim()) reasons.push("missing_authority_id");
  if (!authority.operatorId.trim()) reasons.push("missing_operator_id");
  if (authority.revoked) reasons.push("authority_revoked");
  if (authority.expiresAt && nowIso && Date.parse(nowIso) > Date.parse(authority.expiresAt)) {
    reasons.push("authority_expired");
  }

  return { valid: reasons.length === 0, reasons, warnings: [] };
}

export function validateAuthorizationEnvelope(envelope: ExecutionAuthorizationEnvelope, contract: IntentContract, nowIso?: string): IntentContractValidationResult {
  const reasons: string[] = [];

  if (envelope.intentId !== contract.intentId) reasons.push("envelope_intent_mismatch");
  if (envelope.intentHash !== contract.intentHash) reasons.push("envelope_intent_hash_mismatch");

  const computedEnvelopeHash = stableHash("envelope", {
    envelopeId: envelope.envelopeId,
    intentId: envelope.intentId,
    authorityId: envelope.authorityId,
    delegationScopeId: envelope.delegationScopeId,
    intentHash: envelope.intentHash,
    constraints: envelope.constraints,
    trustRequirements: envelope.trustRequirements,
  });
  if (computedEnvelopeHash !== envelope.envelopeHash) reasons.push("envelope_hash_mismatch");

  if (envelope.expiresAt && nowIso && Date.parse(nowIso) > Date.parse(envelope.expiresAt)) {
    reasons.push("authorization_envelope_expired");
  }

  return { valid: reasons.length === 0, reasons, warnings: [] };
}

export function transitionIntentContract(contract: IntentContract, newState: IntentContractState, at: string, actor: string, reason: string): IntentContract {
  return { ...contract, state: newState };
}
