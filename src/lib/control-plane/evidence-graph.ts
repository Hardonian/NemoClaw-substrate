// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";
import { deterministicSerialize } from "./serde";

export type EvidenceNodeId = string;
export type EvidenceEdgeId = string;
export type ProofpackEnvelopeId = string;
export type GovernanceSnapshotId = string;
export type EvidenceReplayManifestId = string;

export type EvidenceNodeType =
  | "receipt"
  | "execution_plan"
  | "operational_event"
  | "policy_evaluation"
  | "trust_decision"
  | "degraded_state"
  | "operator_override"
  | "scheduling_decision"
  | "approval_record"
  | "authorization_record"
  | "intent_contract"
  | "mutation_record"
  | "escalation_record"
  | "replay_validation"
  | "diagnostics_snapshot"
  | "worker_attestation"
  | "capability_claim"
  | "evidence_bundle";

export type EvidenceEdgeType =
  | "caused_by"
  | "evidence_of"
  | "derived_from"
  | "authorized_by"
  | "delegated_to"
  | "escalated_to"
  | "mutated_from"
  | "replay_linked"
  | "governance_parent"
  | "trust_anchor"
  | "policy_constrained"
  | "attestation_supports"
  | "diagnostic_of";

export type EvidenceNodeStatus = "confirmed" | "pending" | "unavailable" | "partial" | "disputed";
export type EvidenceClassification = "public" | "internal" | "confidential" | "restricted";

export interface EvidenceNodeDigest {
  algorithm: "sha256";
  value: string;
}

export interface EvidenceNode {
  nodeId: EvidenceNodeId;
  type: EvidenceNodeType;
  createdAt: string;
  source: string;
  status: EvidenceNodeStatus;
  classification: EvidenceClassification;
  digest: EvidenceNodeDigest;
  payload: Record<string, unknown>;
  lineageTags: string[];
  replayRef?: string;
  provenance: { requestId?: string; receiptId?: string; planId?: string; actor?: string };
  unavailableReason?: string;
  partialDetails?: string;
}

export interface EvidenceEdge {
  edgeId: EvidenceEdgeId;
  fromNodeId: EvidenceNodeId;
  toNodeId: EvidenceNodeId;
  edgeType: EvidenceEdgeType;
  createdAt: string;
  metadata: Record<string, string>;
}

export interface ProofpackEnvelope {
  envelopeId: ProofpackEnvelopeId;
  version: "1";
  createdAt: string;
  nodeIds: EvidenceNodeId[];
  edgeIds: EvidenceEdgeId[];
  rootNodes: EvidenceNodeId[];
  terminalNodes: EvidenceNodeId[];
  envelopeHash: string;
  nodeDigests: Map<string, EvidenceNodeDigest>;
  integrityVerified: boolean;
  verificationErrors: string[];
  exportFormat: "json" | "ndjson" | "graph";
  governanceSnapshotId?: GovernanceSnapshotId;
}

export interface GovernanceSnapshot {
  snapshotId: GovernanceSnapshotId;
  capturedAt: string;
  version: "1";
  policyRules: Array<{ id: string; order: number; effect: string; description: string }>;
  activeAuthorities: Array<{ authorityId: string; operatorId: string; scope: string[] }>;
  activeDelegations: Array<{ scopeId: string; grantorAuthorityId: string; granteeActor: string; scope: string }>;
  activeEscalationBoundaries: Array<{ boundaryId: string; intentId: string; trigger: string; targetOperator: string }>;
  degradedStates: Array<{ category: string; reasonCode: string; severity: string; affectedSubsystem: string }>;
  trustDecisions: Array<{ workerId: string; trustLevel: string; attestationStatus: string }>;
  snapshotHash: string;
}

export interface EvidenceReplayManifest {
  manifestId: EvidenceReplayManifestId;
  version: "1";
  createdAt: string;
  envelopeId: ProofpackEnvelopeId;
  nodeCount: number;
  edgeCount: number;
  canonicalOrder: EvidenceNodeId[];
  edgeCanonicalOrder: EvidenceEdgeId[];
  replayDigest: string;
  lineageRoots: EvidenceNodeId[];
  tamperDetected: boolean;
  tamperDetails?: string;
  verificationResults: Array<{ nodeId: EvidenceNodeId; digestMatch: boolean; error?: string }>;
}

export interface EvidenceGraphQuery {
  nodeTypes?: EvidenceNodeType[];
  edgeTypes?: EvidenceEdgeType[];
  lineageTags?: string[];
  status?: EvidenceNodeStatus[];
  classification?: EvidenceClassification[];
  timeRange?: { from: string; to: string };
  source?: string;
  maxDepth?: number;
}

export interface EvidenceGraphResult {
  nodes: EvidenceNode[];
  edges: EvidenceEdge[];
  query: EvidenceGraphQuery;
  matchedCount: number;
  totalNodes: number;
  totalEdges: number;
}

export interface EvidenceGraphValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  nodeCount: number;
  edgeCount: number;
  orphanNodes: EvidenceNodeId[];
  cycleDetected: boolean;
  integrityVerified: boolean;
}

function stableHash(prefix: string, value: unknown): string {
  return `${prefix}-${createHash("sha256").update(deterministicSerialize(value)).digest("base64url").slice(0, 32)}`;
}

function computeNodeDigest(payload: Record<string, unknown>): EvidenceNodeDigest {
  return {
    algorithm: "sha256",
    value: createHash("sha256").update(deterministicSerialize(payload)).digest("base64url"),
  };
}

export function createEvidenceNode(input: {
  type: EvidenceNodeType;
  source: string;
  status?: EvidenceNodeStatus;
  classification?: EvidenceClassification;
  payload: Record<string, unknown>;
  lineageTags?: string[];
  replayRef?: string;
  provenance: { requestId?: string; receiptId?: string; planId?: string; actor?: string };
  unavailableReason?: string;
  partialDetails?: string;
}): EvidenceNode {
  const digest = computeNodeDigest(input.payload);
  return {
    nodeId: stableHash("evidence-node", { type: input.type, source: input.source, digest: digest.value }),
    type: input.type,
    createdAt: new Date().toISOString(),
    source: input.source,
    status: input.status ?? "confirmed",
    classification: input.classification ?? "internal",
    digest,
    payload: input.payload,
    lineageTags: input.lineageTags ?? [],
    replayRef: input.replayRef,
    provenance: input.provenance,
    unavailableReason: input.unavailableReason,
    partialDetails: input.partialDetails,
  };
}

export function createEvidenceEdge(input: {
  fromNodeId: EvidenceNodeId;
  toNodeId: EvidenceNodeId;
  edgeType: EvidenceEdgeType;
  metadata?: Record<string, string>;
}): EvidenceEdge {
  return {
    edgeId: stableHash("evidence-edge", { fromNodeId: input.fromNodeId, toNodeId: input.toNodeId, edgeType: input.edgeType }),
    fromNodeId: input.fromNodeId,
    toNodeId: input.toNodeId,
    edgeType: input.edgeType,
    createdAt: new Date().toISOString(),
    metadata: input.metadata ?? {},
  };
}

export function createProofpackEnvelope(input: {
  nodes: EvidenceNode[];
  edges: EvidenceEdge[];
  exportFormat?: "json" | "ndjson" | "graph";
  governanceSnapshotId?: string;
}): ProofpackEnvelope {
  const nodeIds = input.nodes.map((n) => n.nodeId);
  const edgeIds = input.edges.map((e) => e.edgeId);

  const rootNodeIds = findRootNodes(input.nodes, input.edges);
  const terminalNodeIds = findTerminalNodes(input.nodes, input.edges);

  const nodeDigests = new Map<string, EvidenceNodeDigest>();
  for (const node of input.nodes) {
    nodeDigests.set(node.nodeId, node.digest);
  }

  const verificationErrors: string[] = [];
  for (const node of input.nodes) {
    const recomputed = computeNodeDigest(node.payload);
    if (recomputed.value !== node.digest.value) {
      verificationErrors.push(`digest_mismatch:${node.nodeId}`);
    }
  }

  const envelopePayload = {
    nodeIds,
    edgeIds,
    rootNodes: rootNodeIds,
    terminalNodes: terminalNodeIds,
    nodeDigests: Array.from(nodeDigests.entries()),
  };
  const envelopeHash = stableHash("proofpack-envelope", envelopePayload);

  return {
    envelopeId: stableHash("proofpack", { envelopeHash, nodeCount: nodeIds.length }),
    version: "1",
    createdAt: new Date().toISOString(),
    nodeIds,
    edgeIds,
    rootNodes: rootNodeIds,
    terminalNodes: terminalNodeIds,
    envelopeHash,
    nodeDigests,
    integrityVerified: verificationErrors.length === 0,
    verificationErrors,
    exportFormat: input.exportFormat ?? "json",
    governanceSnapshotId: input.governanceSnapshotId,
  };
}

export function createGovernanceSnapshot(input: {
  policyRules: Array<{ id: string; order: number; effect: string; description: string }>;
  activeAuthorities: Array<{ authorityId: string; operatorId: string; scope: string[] }>;
  activeDelegations: Array<{ scopeId: string; grantorAuthorityId: string; granteeActor: string; scope: string }>;
  activeEscalationBoundaries: Array<{ boundaryId: string; intentId: string; trigger: string; targetOperator: string }>;
  degradedStates: Array<{ category: string; reasonCode: string; severity: string; affectedSubsystem: string }>;
  trustDecisions: Array<{ workerId: string; trustLevel: string; attestationStatus: string }>;
}): GovernanceSnapshot {
  const snapshot: Omit<GovernanceSnapshot, "snapshotHash"> = {
    snapshotId: stableHash("gov-snapshot", { capturedAt: new Date().toISOString(), ruleCount: input.policyRules.length }),
    capturedAt: new Date().toISOString(),
    version: "1",
    policyRules: [...input.policyRules].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)),
    activeAuthorities: input.activeAuthorities.map((a) => ({ ...a, scope: [...a.scope].sort() })),
    activeDelegations: input.activeDelegations,
    activeEscalationBoundaries: input.activeEscalationBoundaries,
    degradedStates: input.degradedStates,
    trustDecisions: input.trustDecisions,
  };
  const snapshotHash = stableHash("governance-snapshot", {
    snapshotId: snapshot.snapshotId,
    policyRules: snapshot.policyRules,
    activeAuthorities: snapshot.activeAuthorities,
    activeDelegations: snapshot.activeDelegations,
    degradedStates: snapshot.degradedStates,
    trustDecisions: snapshot.trustDecisions,
  });
  return { ...snapshot, snapshotHash };
}

export function createEvidenceReplayManifest(input: {
  envelope: ProofpackEnvelope;
  nodes: EvidenceNode[];
  edges: EvidenceEdge[];
}): EvidenceReplayManifest {
  const canonicalNodeOrder = [...input.nodes]
    .sort((a, b) => a.nodeId.localeCompare(b.nodeId))
    .map((n) => n.nodeId);

  const canonicalEdgeOrder = [...input.edges]
    .sort((a, b) => a.edgeId.localeCompare(b.edgeId))
    .map((e) => e.edgeId);

  const verificationResults = input.nodes.map((node) => {
    const recomputed = computeNodeDigest(node.payload);
    const digestMatch = recomputed.value === node.digest.value;
    return {
      nodeId: node.nodeId,
      digestMatch,
      error: digestMatch ? undefined : `digest_mismatch:expected=${node.digest.value},got=${recomputed.value}`,
    };
  });

  const tampered = verificationResults.filter((r) => !r.digestMatch);
  const tamperDetected = tampered.length > 0;
  const tamperDetails = tamperDetected
    ? `Tampered nodes: ${tampered.map((t) => t.nodeId).join(", ")}`
    : undefined;

  const lineageRoots = findRootNodes(input.nodes, input.edges);

  const replayPayload = {
    envelopeId: input.envelope.envelopeId,
    canonicalNodeOrder,
    canonicalEdgeOrder,
    verificationResults,
    lineageRoots,
  };
  const replayDigest = stableHash("replay-manifest", replayPayload);

  return {
    manifestId: stableHash("manifest", { envelopeId: input.envelope.envelopeId, digest: replayDigest }),
    version: "1",
    createdAt: new Date().toISOString(),
    envelopeId: input.envelope.envelopeId,
    nodeCount: input.nodes.length,
    edgeCount: input.edges.length,
    canonicalOrder: canonicalNodeOrder,
    edgeCanonicalOrder: canonicalEdgeOrder,
    replayDigest,
    lineageRoots,
    tamperDetected,
    tamperDetails,
    verificationResults,
  };
}

function findRootNodes(nodes: EvidenceNode[], edges: EvidenceEdge[]): EvidenceNodeId[] {
  const hasIncoming = new Set(edges.map((e) => e.toNodeId));
  return nodes.filter((n) => !hasIncoming.has(n.nodeId)).map((n) => n.nodeId);
}

function findTerminalNodes(nodes: EvidenceNode[], edges: EvidenceEdge[]): EvidenceNodeId[] {
  const hasOutgoing = new Set(edges.map((e) => e.fromNodeId));
  return nodes.filter((n) => !hasOutgoing.has(n.nodeId)).map((n) => n.nodeId);
}

export function queryEvidenceGraph(
  nodes: EvidenceNode[],
  edges: EvidenceEdge[],
  query: EvidenceGraphQuery,
): EvidenceGraphResult {
  let filteredNodes = [...nodes];
  let filteredEdges = [...edges];

  if (query.nodeTypes) {
    filteredNodes = filteredNodes.filter((n) => query.nodeTypes!.includes(n.type));
  }
  if (query.status) {
    filteredNodes = filteredNodes.filter((n) => query.status!.includes(n.status));
  }
  if (query.classification) {
    filteredNodes = filteredNodes.filter((n) => query.classification!.includes(n.classification));
  }
  if (query.lineageTags) {
    filteredNodes = filteredNodes.filter((n) =>
      query.lineageTags!.some((tag) => n.lineageTags.includes(tag)),
    );
  }
  if (query.source) {
    filteredNodes = filteredNodes.filter((n) => n.source === query.source);
  }
  if (query.timeRange) {
    const from = Date.parse(query.timeRange.from);
    const to = Date.parse(query.timeRange.to);
    filteredNodes = filteredNodes.filter((n) => {
      const t = Date.parse(n.createdAt);
      return t >= from && t <= to;
    });
  }

  const nodeIds = new Set(filteredNodes.map((n) => n.nodeId));
  filteredEdges = filteredEdges.filter((e) => nodeIds.has(e.fromNodeId) && nodeIds.has(e.toNodeId));
  if (query.edgeTypes) {
    filteredEdges = filteredEdges.filter((e) => query.edgeTypes!.includes(e.edgeType));
  }

  return {
    nodes: filteredNodes,
    edges: filteredEdges,
    query,
    matchedCount: filteredNodes.length,
    totalNodes: nodes.length,
    totalEdges: edges.length,
  };
}

export function validateEvidenceGraph(
  nodes: EvidenceNode[],
  edges: EvidenceEdge[],
): EvidenceGraphValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const orphanNodes: EvidenceNodeId[] = [];

  const nodeIds = new Set(nodes.map((n) => n.nodeId));
  const connectedNodes = new Set<string>();

  for (const edge of edges) {
    if (!nodeIds.has(edge.fromNodeId)) {
      errors.push(`edge_references_missing_node:${edge.fromNodeId}`);
    } else {
      connectedNodes.add(edge.fromNodeId);
    }
    if (!nodeIds.has(edge.toNodeId)) {
      errors.push(`edge_references_missing_node:${edge.toNodeId}`);
    } else {
      connectedNodes.add(edge.toNodeId);
    }
  }

  for (const node of nodes) {
    if (!connectedNodes.has(node.nodeId)) {
      orphanNodes.push(node.nodeId);
      warnings.push(`orphan_node:${node.nodeId}`);
    }
  }

  const cycleDetected = detectCycle(nodes, edges);

  for (const node of nodes) {
    const recomputed = computeNodeDigest(node.payload);
    if (recomputed.value !== node.digest.value) {
      errors.push(`digest_mismatch:${node.nodeId}`);
    }
    if (node.status === "unavailable" && !node.unavailableReason) {
      errors.push(`unavailable_node_without_reason:${node.nodeId}`);
    }
    if (node.status === "partial" && !node.partialDetails) {
      errors.push(`partial_node_without_details:${node.nodeId}`);
    }
  }

  for (const edge of edges) {
    if (!edge.edgeId.trim()) errors.push("edge_missing_id");
    if (!edge.fromNodeId.trim()) errors.push("edge_missing_from");
    if (!edge.toNodeId.trim()) errors.push("edge_missing_to");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    nodeCount: nodes.length,
    edgeCount: edges.length,
    orphanNodes,
    cycleDetected,
    integrityVerified: errors.length === 0,
  };
}

function detectCycle(nodes: EvidenceNode[], edges: EvidenceEdge[]): boolean {
  const adj = new Map<string, string[]>();
  for (const edge of edges) {
    if (!adj.has(edge.fromNodeId)) adj.set(edge.fromNodeId, []);
    adj.get(edge.fromNodeId)!.push(edge.toNodeId);
  }

  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(nodeId: string): boolean {
    if (inStack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;
    visited.add(nodeId);
    inStack.add(nodeId);
    const neighbors = adj.get(nodeId) ?? [];
    for (const neighbor of neighbors) {
      if (dfs(neighbor)) return true;
    }
    inStack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (dfs(node.nodeId)) return true;
  }
  return false;
}

export function evidenceDigest(nodes: EvidenceNode[]): string {
  const sorted = [...nodes].sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  return createHash("sha256").update(deterministicSerialize(sorted)).digest("base64url");
}
