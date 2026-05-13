// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";
import { deterministicSerialize } from "./serde";
import type { OperatorAuthority, DelegatedAuthorityScope, IntentContract, EscalationBoundary } from "./intent-contract";

export type AgentId = string;
export type AgentRelationshipId = string;
export type ExecutionSponsorshipId = string;
export type QuorumApprovalId = string;
export type ContestedExecutionId = string;
export type SupervisoryReviewId = string;
export type ChildAuthorityId = string;

export type AgentRelationshipType =
  | "supervises"
  | "delegates_to"
  | "sponsors"
  | "peer"
  | "subordinate";

export type AgentAuthorityState = "inherited" | "direct" | "delegated" | "revoked" | "expired" | "contested";
export type ContestedExecutionState = "contested" | "resolved" | "escalated" | "suspended";
export type SupervisoryReviewState = "pending" | "in_progress" | "approved" | "denied" | "escalated";

export interface AgentIdentity {
  agentId: AgentId;
  agentType: string;
  agentLabel: string;
  parentAgentId?: AgentId;
  registeredAt: string;
  metadata: Record<string, string>;
}

export interface AgentAuthority {
  authorityId: string;
  agentId: AgentId;
  sourceAuthorityId?: string;
  authorityType: "inherited" | "direct" | "delegated";
  grantedAt: string;
  grantedBy: string;
  expiresAt?: string;
  scope: string[];
  delegationAllowed: boolean;
  maxDelegationDepth: number;
  currentDelegationDepth: number;
  revoked: boolean;
  revokedAt?: string;
  revokedBy?: string;
}

export interface AgentRelationship {
  relationshipId: AgentRelationshipId;
  supervisorAgentId: AgentId;
  subordinateAgentId: AgentId;
  relationshipType: AgentRelationshipType;
  establishedAt: string;
  establishedBy: string;
  authorityChain: string[];
  delegationScopeId?: string;
  active: boolean;
}

export interface ExecutionSponsorship {
  sponsorshipId: ExecutionSponsorshipId;
  sponsorAgentId: AgentId;
  sponsoredAgentId: AgentId;
  intentId: string;
  sponsoredAt: string;
  expiresAt?: string;
  scope: string[];
  constraints: Record<string, string>;
  active: boolean;
  revoked: boolean;
  revokedAt?: string;
  revokedBy?: string;
}

export interface QuorumApproval {
  quorumId: QuorumApprovalId;
  intentId: string;
  planId?: string;
  requiredApprovals: number;
  receivedApprovals: number;
  approvers: Array<{ agentId: string; approvedAt: string; reason: string }>;
  dissenters: Array<{ agentId: string; dissentedAt: string; reason: string }>;
  createdAt: string;
  completedAt?: string;
  achieved: boolean;
  expired: boolean;
  expiresAt?: string;
}

export interface ContestedExecution {
  contestId: ContestedExecutionId;
  intentId: string;
  planId?: string;
  contestedBy: AgentId;
  contestedAt: string;
  reason: string;
  reasonCode: string;
  state: ContestedExecutionState;
  challengers: AgentId[];
  defenders: AgentId[];
  evidenceRefs: string[];
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: string;
}

export interface SupervisoryReview {
  reviewId: SupervisoryReviewId;
  subjectAgentId: AgentId;
  supervisorAgentId: AgentId;
  intentId: string;
  planId?: string;
  reason: string;
  reasonCode: string;
  state: SupervisoryReviewState;
  createdAt: string;
  completedAt?: string;
  findings?: string;
  decision?: string;
  evidenceRefs: string[];
}

export interface ChildAuthority {
  childAuthorityId: ChildAuthorityId;
  parentAuthorityId: string;
  childAgentId: AgentId;
  inheritedScopes: string[];
  additionalScopes: string[];
  excludedScopes: string[];
  grantedAt: string;
  expiresAt?: string;
  maxDelegationDepth: number;
  active: boolean;
}

export interface AgentGovernanceTopology {
  capturedAt: string;
  agents: AgentIdentity[];
  relationships: AgentRelationship[];
  authorities: AgentAuthority[];
  delegations: DelegatedAuthorityScope[];
  sponsorships: ExecutionSponsorship[];
  activeContests: ContestedExecution[];
  pendingReviews: SupervisoryReview[];
  topologyHash: string;
}

export interface AgentGovernanceValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function stableHash(prefix: string, value: unknown): string {
  return `${prefix}-${createHash("sha256").update(deterministicSerialize(value)).digest("base64url").slice(0, 32)}`;
}

export function createAgentIdentity(input: {
  agentId: string;
  agentType: string;
  agentLabel: string;
  parentAgentId?: string;
  metadata?: Record<string, string>;
}): AgentIdentity {
  return {
    agentId: input.agentId,
    agentType: input.agentType,
    agentLabel: input.agentLabel,
    parentAgentId: input.parentAgentId,
    registeredAt: new Date().toISOString(),
    metadata: input.metadata ?? {},
  };
}

export function createAgentAuthority(input: {
  agentId: string;
  sourceAuthorityId?: string;
  authorityType: "inherited" | "direct" | "delegated";
  grantedBy: string;
  scope: string[];
  delegationAllowed?: boolean;
  maxDelegationDepth?: number;
  expiresAt?: string;
}): AgentAuthority {
  return {
    authorityId: stableHash("agent-authority", { agentId: input.agentId, authorityType: input.authorityType }),
    agentId: input.agentId,
    sourceAuthorityId: input.sourceAuthorityId,
    authorityType: input.authorityType,
    grantedAt: new Date().toISOString(),
    grantedBy: input.grantedBy,
    expiresAt: input.expiresAt,
    scope: [...input.scope].sort(),
    delegationAllowed: input.delegationAllowed ?? false,
    maxDelegationDepth: input.maxDelegationDepth ?? 0,
    currentDelegationDepth: 0,
    revoked: false,
  };
}

export function createAgentRelationship(input: {
  supervisorAgentId: string;
  subordinateAgentId: string;
  relationshipType: AgentRelationshipType;
  establishedBy: string;
  authorityChain?: string[];
  delegationScopeId?: string;
}): AgentRelationship {
  return {
    relationshipId: stableHash("agent-relationship", {
      supervisorAgentId: input.supervisorAgentId,
      subordinateAgentId: input.subordinateAgentId,
      relationshipType: input.relationshipType,
    }),
    supervisorAgentId: input.supervisorAgentId,
    subordinateAgentId: input.subordinateAgentId,
    relationshipType: input.relationshipType,
    establishedAt: new Date().toISOString(),
    establishedBy: input.establishedBy,
    authorityChain: input.authorityChain ?? [],
    delegationScopeId: input.delegationScopeId,
    active: true,
  };
}

export function createExecutionSponsorship(input: {
  sponsorAgentId: string;
  sponsoredAgentId: string;
  intentId: string;
  scope: string[];
  constraints?: Record<string, string>;
  expiresAt?: string;
}): ExecutionSponsorship {
  return {
    sponsorshipId: stableHash("sponsorship", { sponsorAgentId: input.sponsorAgentId, intentId: input.intentId }),
    sponsorAgentId: input.sponsorAgentId,
    sponsoredAgentId: input.sponsoredAgentId,
    intentId: input.intentId,
    sponsoredAt: new Date().toISOString(),
    expiresAt: input.expiresAt,
    scope: [...input.scope].sort(),
    constraints: input.constraints ?? {},
    active: true,
    revoked: false,
  };
}

export function createQuorumApproval(input: {
  intentId: string;
  planId?: string;
  requiredApprovals: number;
  approvers?: Array<{ agentId: string; reason: string }>;
  expiresAt?: string;
}): QuorumApproval {
  const now = new Date().toISOString();
  return {
    quorumId: stableHash("quorum", { intentId: input.intentId, requiredApprovals: input.requiredApprovals }),
    intentId: input.intentId,
    planId: input.planId,
    requiredApprovals: input.requiredApprovals,
    receivedApprovals: input.approvers?.length ?? 0,
    approvers: input.approvers?.map((a) => ({ ...a, approvedAt: now })) ?? [],
    dissenters: [],
    createdAt: now,
    achieved: (input.approvers?.length ?? 0) >= input.requiredApprovals,
    expired: false,
    expiresAt: input.expiresAt,
  };
}

export function approveQuorum(quorum: QuorumApproval, agentId: string, reason: string): QuorumApproval {
  const alreadyApproved = quorum.approvers.some((a) => a.agentId === agentId);
  if (alreadyApproved) return quorum;

  const updatedApprovers = [...quorum.approvers, { agentId, approvedAt: new Date().toISOString(), reason }];
  const achieved = updatedApprovers.length >= quorum.requiredApprovals;

  return {
    ...quorum,
    approvers: updatedApprovers,
    receivedApprovals: updatedApprovers.length,
    achieved,
    completedAt: achieved ? new Date().toISOString() : quorum.completedAt,
  };
}

export function dissentQuorum(quorum: QuorumApproval, agentId: string, reason: string): QuorumApproval {
  const alreadyDissent = quorum.dissenters.some((d) => d.agentId === agentId);
  if (alreadyDissent) return quorum;

  return {
    ...quorum,
    dissenters: [...quorum.dissenters, { agentId, dissentedAt: new Date().toISOString(), reason }],
  };
}

export function createContestedExecution(input: {
  intentId: string;
  planId?: string;
  contestedBy: string;
  reason: string;
  reasonCode: string;
  challengers?: string[];
  defenders?: string[];
  evidenceRefs?: string[];
}): ContestedExecution {
  return {
    contestId: stableHash("contest", { intentId: input.intentId, contestedBy: input.contestedBy }),
    intentId: input.intentId,
    planId: input.planId,
    contestedBy: input.contestedBy,
    contestedAt: new Date().toISOString(),
    reason: input.reason,
    reasonCode: input.reasonCode,
    state: "contested",
    challengers: input.challengers ?? [input.contestedBy],
    defenders: input.defenders ?? [],
    evidenceRefs: input.evidenceRefs ?? [],
  };
}

export function createSupervisoryReview(input: {
  subjectAgentId: string;
  supervisorAgentId: string;
  intentId: string;
  planId?: string;
  reason: string;
  reasonCode: string;
  evidenceRefs?: string[];
}): SupervisoryReview {
  return {
    reviewId: stableHash("supervisory-review", { subjectAgentId: input.subjectAgentId, intentId: input.intentId }),
    subjectAgentId: input.subjectAgentId,
    supervisorAgentId: input.supervisorAgentId,
    intentId: input.intentId,
    planId: input.planId,
    reason: input.reason,
    reasonCode: input.reasonCode,
    state: "pending",
    createdAt: new Date().toISOString(),
    evidenceRefs: input.evidenceRefs ?? [],
  };
}

export function createChildAuthority(input: {
  parentAuthorityId: string;
  childAgentId: string;
  inheritedScopes: string[];
  additionalScopes?: string[];
  excludedScopes?: string[];
  maxDelegationDepth?: number;
  expiresAt?: string;
}): ChildAuthority {
  return {
    childAuthorityId: stableHash("child-authority", { parentAuthorityId: input.parentAuthorityId, childAgentId: input.childAgentId }),
    parentAuthorityId: input.parentAuthorityId,
    childAgentId: input.childAgentId,
    inheritedScopes: [...input.inheritedScopes].sort(),
    additionalScopes: [...(input.additionalScopes ?? [])].sort(),
    excludedScopes: [...(input.excludedScopes ?? [])].sort(),
    grantedAt: new Date().toISOString(),
    expiresAt: input.expiresAt,
    maxDelegationDepth: input.maxDelegationDepth ?? 0,
    active: true,
  };
}

export function buildAgentGovernanceTopology(input: {
  agents: AgentIdentity[];
  relationships: AgentRelationship[];
  authorities: AgentAuthority[];
  delegations: DelegatedAuthorityScope[];
  sponsorships: ExecutionSponsorship[];
  activeContests: ContestedExecution[];
  pendingReviews: SupervisoryReview[];
}): AgentGovernanceTopology {
  const topology: Omit<AgentGovernanceTopology, "topologyHash"> = {
    capturedAt: new Date().toISOString(),
    agents: input.agents,
    relationships: input.relationships,
    authorities: input.authorities,
    delegations: input.delegations,
    sponsorships: input.sponsorships,
    activeContests: input.activeContests,
    pendingReviews: input.pendingReviews,
    topologyHash: "",
  };
  const topologyHash = stableHash("topology", {
    agentCount: topology.agents.length,
    relationshipCount: topology.relationships.length,
    authorityCount: topology.authorities.length,
    delegationCount: topology.delegations.length,
    activeContestCount: topology.activeContests.length,
    pendingReviewCount: topology.pendingReviews.length,
  });
  return { ...topology, topologyHash };
}

export function validateAgentAuthorityChain(
  agentId: string,
  authorities: AgentAuthority[],
  relationships: AgentRelationship[],
  nowIso?: string,
): AgentGovernanceValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const agentAuthorities = authorities.filter((a) => a.agentId === agentId);
  if (agentAuthorities.length === 0) {
    errors.push(`no_authority_for_agent:${agentId}`);
    return { valid: false, errors, warnings };
  }

  for (const authority of agentAuthorities) {
    if (authority.revoked) {
      errors.push(`authority_revoked:${authority.authorityId}`);
    }
    if (authority.expiresAt && nowIso && Date.parse(nowIso) > Date.parse(authority.expiresAt)) {
      errors.push(`authority_expired:${authority.authorityId}`);
    }
    if (authority.authorityType === "inherited" && !authority.sourceAuthorityId) {
      errors.push(`inherited_authority_without_source:${authority.authorityId}`);
    }
    if (authority.currentDelegationDepth > authority.maxDelegationDepth) {
      errors.push(`delegation_depth_exceeded:${authority.authorityId}`);
    }
  }

  const parentRels = relationships.filter((r) => r.subordinateAgentId === agentId && r.active);
  for (const rel of parentRels) {
    const parentAuth = authorities.find((a) => a.agentId === rel.supervisorAgentId && !a.revoked);
    if (!parentAuth) {
      warnings.push(`no_active_parent_authority_for:${agentId}`);
    }
  }

  const authChain = resolveAuthorityChain(agentId, authorities, relationships);
  if (authChain.length === 0) {
    errors.push(`no_resolvable_authority_chain:${agentId}`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function resolveAuthorityChain(
  agentId: string,
  authorities: AgentAuthority[],
  relationships: AgentRelationship[],
): string[] {
  const chain: string[] = [];
  const visited = new Set<string>();

  function walk(currentAgentId: string) {
    if (visited.has(currentAgentId)) return;
    visited.add(currentAgentId);

    const auth = authorities.find((a) => a.agentId === currentAgentId && !a.revoked);
    if (auth) {
      chain.push(auth.authorityId);
      if (auth.sourceAuthorityId) {
        const sourceAgent = authorities.find((a) => a.authorityId === auth.sourceAuthorityId);
        if (sourceAgent) {
          walk(sourceAgent.agentId);
        }
      }
    }

    const parentRel = relationships.find((r) => r.subordinateAgentId === currentAgentId && r.active);
    if (parentRel) {
      walk(parentRel.supervisorAgentId);
    }
  }

  walk(agentId);
  return chain;
}

export function validateDelegationChain(
  scopeId: string,
  delegations: DelegatedAuthorityScope[],
  authorities: OperatorAuthority[],
  nowIso?: string,
): AgentGovernanceValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const scope = delegations.find((d) => d.scopeId === scopeId);
  if (!scope) {
    errors.push(`delegation_scope_not_found:${scopeId}`);
    return { valid: false, errors, warnings };
  }

  if (scope.expiresAt && nowIso && Date.parse(nowIso) > Date.parse(scope.expiresAt)) {
    errors.push(`delegation_expired:${scopeId}`);
  }

  const grantor = authorities.find((a) => a.authorityId === scope.grantorAuthorityId);
  if (!grantor) {
    errors.push(`grantor_authority_not_found:${scope.grantorAuthorityId}`);
  } else if (grantor.revoked) {
    errors.push(`grantor_authority_revoked:${scope.grantorAuthorityId}`);
  }

  const granteeAuth = authorities.find((a) => a.operatorId === scope.granteeActor);
  if (!granteeAuth && scope.scope !== "read_only") {
    warnings.push(`grantee_has_no_authority:${scope.granteeActor}`);
  }

  return { valid: errors.length === 0, errors, warnings };
}
