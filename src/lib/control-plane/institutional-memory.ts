// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";
import { deterministicSerialize } from "./serde";

export type OperationalMemoryEntryId = string;
export type GovernanceIncidentId = string;
export type ExceptionClusterId = string;
export type HistoricalTrustRecordId = string;
export type RoutingHistoryRecordId = string;
export type ReplayIntegrityIncidentId = string;
export type AdjudicationRecordId = string;

export type MemoryEntryType =
  | "adjudication"
  | "degraded_state"
  | "exception"
  | "operator_override"
  | "trust_history"
  | "routing_decision"
  | "replay_integrity"
  | "governance_incident"
  | "exception_cluster"
  | "policy_impact"
  | "evidence_gap";

export type GovernanceIncidentSeverity = "info" | "warning" | "error" | "critical";
export type GovernanceIncidentStatus = "open" | "investigating" | "mitigated" | "resolved" | "closed" | "escalated";
export type ExceptionClusterState = "active" | "resolved" | "suppressed" | "archived";
export type AdjudicationOutcome = "approved" | "denied" | "escalated" | "overridden" | "revoked" | "expired";

export interface OperationalMemoryEntry {
  entryId: OperationalMemoryEntryId;
  type: MemoryEntryType;
  recordedAt: string;
  source: string;
  sequence: number;
  provenance: { requestId?: string; planId?: string; receiptId?: string; actor?: string };
  payload: Record<string, unknown>;
  replayRef?: { lineage: string[]; replayVersion: string };
  tags: string[];
  entryHash: string;
}

export interface GovernanceIncident {
  incidentId: GovernanceIncidentId;
  severity: GovernanceIncidentSeverity;
  status: GovernanceIncidentStatus;
  createdAt: string;
  updatedAt: string;
  title: string;
  description: string;
  affectedSubsystem: string;
  reasonCode: string;
  evidenceRefs: string[];
  relatedEntryIds: OperationalMemoryEntryId[];
  relatedIntentIds?: string[];
  detectedBy: string;
  assignedTo?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: string;
  escalationPath: string[];
  recurrenceCount: number;
  tags: string[];
  incidentHash: string;
}

export interface ExceptionCluster {
  clusterId: ExceptionClusterId;
  state: ExceptionClusterState;
  createdAt: string;
  updatedAt: string;
  category: string;
  reasonCodes: string[];
  affectedSubsystem: string;
  occurrenceCount: number;
  firstOccurrence: string;
  lastOccurrence: string;
  relatedIncidentIds: GovernanceIncidentId[];
  relatedEntryIds: OperationalMemoryEntryId[];
  pattern: string;
  frequency: number;
  recommendation?: string;
  requiresOperatorReview: boolean;
  operatorReviewed?: boolean;
  operatorReviewedAt?: string;
  operatorReviewedBy?: string;
  clusterHash: string;
}

export interface HistoricalTrustRecord {
  recordId: HistoricalTrustRecordId;
  workerId: string;
  trustLevel: string;
  attestationStatus: string;
  recordedAt: string;
  reasonCode: string;
  source: string;
  evidenceRef?: string;
  trustDelta: "elevated" | "maintained" | "reduced" | "revoked";
  operatorInvolved: boolean;
  operatorId?: string;
}

export interface RoutingHistoryRecord {
  recordId: RoutingHistoryRecordId;
  requestId: string;
  intentId?: string;
  selectedCandidate: string;
  rejectedCandidates: string[];
  reasonCodes: string[];
  routedAt: string;
  executionMode: "local" | "remote";
  degradedStates: string[];
  policyDecision: string;
  trustLevel: string;
  score: number;
}

export interface ReplayIntegrityIncident {
  incidentId: ReplayIntegrityIncidentId;
  replayEnvelopeId?: string;
  detectedAt: string;
  severity: GovernanceIncidentSeverity;
  failureMode: string;
  failureReasons: string[];
  affectedIntentIds: string[];
  affectedPlanIds: string[];
  evidence: string[];
  operatorNotified: boolean;
  operatorNotifiedAt?: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: string;
}

export interface AdjudicationRecord {
  recordId: AdjudicationRecordId;
  intentId: string;
  planId?: string;
  approvalId?: string;
  adjudicatedAt: string;
  adjudicator: string;
  outcome: AdjudicationOutcome;
  reason: string;
  reasonCode: string;
  evidenceRefs: string[];
  overrideApplied: boolean;
  overrideReason?: string;
  priorDecisions: string[];
  tags: string[];
}

export interface OperationalMemoryQuery {
  types?: MemoryEntryType[];
  timeRange?: { from: string; to: string };
  tags?: string[];
  source?: string;
  actor?: string;
  requestId?: string;
  planId?: string;
  limit?: number;
  offset?: number;
}

export interface GovernanceIncidentQuery {
  severity?: GovernanceIncidentSeverity[];
  status?: GovernanceIncidentStatus[];
  affectedSubsystem?: string;
  tags?: string[];
  openOnly?: boolean;
  limit?: number;
}

export interface ExceptionClusterQuery {
  state?: ExceptionClusterState[];
  category?: string;
  minOccurrences?: number;
  requiresOperatorReview?: boolean;
  limit?: number;
}

export interface InstitutionalMemorySnapshot {
  capturedAt: string;
  totalEntries: number;
  totalIncidents: number;
  openIncidents: number;
  totalClusters: number;
  activeClusters: number;
  trustRecordCount: number;
  routingRecordCount: number;
  replayIncidentCount: number;
  unresolvedReplayIncidents: number;
  adjudicationCount: number;
  snapshotHash: string;
}

function stableHash(prefix: string, value: unknown): string {
  return `${prefix}-${createHash("sha256").update(deterministicSerialize(value)).digest("base64url").slice(0, 32)}`;
}

export function createOperationalMemoryEntry(input: {
  type: MemoryEntryType;
  source: string;
  sequence: number;
  payload: Record<string, unknown>;
  provenance?: { requestId?: string; planId?: string; receiptId?: string; actor?: string };
  replayRef?: { lineage: string[]; replayVersion: string };
  tags?: string[];
}): OperationalMemoryEntry {
  const entry: Omit<OperationalMemoryEntry, "entryHash"> = {
    entryId: stableHash("memory-entry", { type: input.type, source: input.source, sequence: input.sequence }),
    type: input.type,
    recordedAt: new Date().toISOString(),
    source: input.source,
    sequence: input.sequence,
    provenance: input.provenance ?? {},
    payload: input.payload,
    replayRef: input.replayRef,
    tags: input.tags ?? [],
    entryHash: "",
  };
  const entryHash = stableHash("entry", {
    entryId: entry.entryId,
    type: entry.type,
    sequence: entry.sequence,
    payload: entry.payload,
  });
  return { ...entry, entryHash };
}

export function createGovernanceIncident(input: {
  severity: GovernanceIncidentSeverity;
  title: string;
  description: string;
  affectedSubsystem: string;
  reasonCode: string;
  detectedBy: string;
  evidenceRefs?: string[];
  relatedEntryIds?: string[];
  relatedIntentIds?: string[];
  assignedTo?: string;
  escalationPath?: string[];
  recurrenceCount?: number;
  tags?: string[];
}): GovernanceIncident {
  const now = new Date().toISOString();
  const incident: Omit<GovernanceIncident, "incidentHash"> = {
    incidentId: stableHash("incident", { title: input.title, affectedSubsystem: input.affectedSubsystem, reasonCode: input.reasonCode }),
    severity: input.severity,
    status: "open",
    createdAt: now,
    updatedAt: now,
    title: input.title,
    description: input.description,
    affectedSubsystem: input.affectedSubsystem,
    reasonCode: input.reasonCode,
    evidenceRefs: input.evidenceRefs ?? [],
    relatedEntryIds: input.relatedEntryIds ?? [],
    relatedIntentIds: input.relatedIntentIds,
    detectedBy: input.detectedBy,
    assignedTo: input.assignedTo,
    escalationPath: input.escalationPath ?? [],
    recurrenceCount: input.recurrenceCount ?? 0,
    tags: input.tags ?? [],
  };
  const incidentHash = stableHash("incident", {
    incidentId: incident.incidentId,
    severity: incident.severity,
    status: incident.status,
    title: incident.title,
    affectedSubsystem: incident.affectedSubsystem,
    reasonCode: incident.reasonCode,
  });
  return { ...incident, incidentHash };
}

export function updateGovernanceIncident(
  incident: GovernanceIncident,
  updates: {
    status?: GovernanceIncidentStatus;
    assignedTo?: string;
    resolution?: string;
    resolvedBy?: string;
    escalationPath?: string[];
    tags?: string[];
  },
): GovernanceIncident {
  const updated: GovernanceIncident = {
    ...incident,
    ...updates,
    updatedAt: new Date().toISOString(),
    resolvedAt: updates.status === "resolved" || updates.status === "closed" ? new Date().toISOString() : incident.resolvedAt,
    resolvedBy: updates.resolvedBy ?? incident.resolvedBy,
    incidentHash: "",
  };
  const incidentHash = stableHash("incident", {
    incidentId: updated.incidentId,
    severity: updated.severity,
    status: updated.status,
    title: updated.title,
    affectedSubsystem: updated.affectedSubsystem,
    reasonCode: updated.reasonCode,
    resolvedAt: updated.resolvedAt,
  });
  return { ...updated, incidentHash };
}

export function createExceptionCluster(input: {
  category: string;
  reasonCodes: string[];
  affectedSubsystem: string;
  pattern: string;
  occurrenceCount?: number;
  firstOccurrence?: string;
  lastOccurrence?: string;
  relatedIncidentIds?: string[];
  relatedEntryIds?: string[];
  frequency?: number;
  recommendation?: string;
  requiresOperatorReview?: boolean;
}): ExceptionCluster {
  const now = new Date().toISOString();
  const cluster: Omit<ExceptionCluster, "clusterHash"> = {
    clusterId: stableHash("exception-cluster", { category: input.category, pattern: input.pattern, affectedSubsystem: input.affectedSubsystem }),
    state: "active",
    createdAt: now,
    updatedAt: now,
    category: input.category,
    reasonCodes: [...input.reasonCodes].sort(),
    affectedSubsystem: input.affectedSubsystem,
    occurrenceCount: input.occurrenceCount ?? 1,
    firstOccurrence: input.firstOccurrence ?? now,
    lastOccurrence: input.lastOccurrence ?? now,
    relatedIncidentIds: input.relatedIncidentIds ?? [],
    relatedEntryIds: input.relatedEntryIds ?? [],
    pattern: input.pattern,
    frequency: input.frequency ?? 1,
    recommendation: input.recommendation,
    requiresOperatorReview: input.requiresOperatorReview ?? true,
  };
  const clusterHash = stableHash("cluster", {
    clusterId: cluster.clusterId,
    category: cluster.category,
    reasonCodes: cluster.reasonCodes,
    occurrenceCount: cluster.occurrenceCount,
    pattern: cluster.pattern,
  });
  return { ...cluster, clusterHash };
}

export function updateExceptionCluster(
  cluster: ExceptionCluster,
  updates: {
    state?: ExceptionClusterState;
    occurrenceCount?: number;
    lastOccurrence?: string;
    recommendation?: string;
    operatorReviewed?: boolean;
    operatorReviewedBy?: string;
  },
): ExceptionCluster {
  const updated: ExceptionCluster = {
    ...cluster,
    ...updates,
    updatedAt: new Date().toISOString(),
    operatorReviewedAt: updates.operatorReviewed ? new Date().toISOString() : cluster.operatorReviewedAt,
    clusterHash: "",
  };
  const clusterHash = stableHash("cluster", {
    clusterId: updated.clusterId,
    state: updated.state,
    occurrenceCount: updated.occurrenceCount,
    recommendation: updated.recommendation,
  });
  return { ...updated, clusterHash };
}

export function createHistoricalTrustRecord(input: {
  workerId: string;
  trustLevel: string;
  attestationStatus: string;
  reasonCode: string;
  source: string;
  trustDelta: "elevated" | "maintained" | "reduced" | "revoked";
  operatorInvolved?: boolean;
  operatorId?: string;
  evidenceRef?: string;
}): HistoricalTrustRecord {
  return {
    recordId: stableHash("trust-record", { workerId: input.workerId, trustLevel: input.trustLevel, reasonCode: input.reasonCode }),
    workerId: input.workerId,
    trustLevel: input.trustLevel,
    attestationStatus: input.attestationStatus,
    recordedAt: new Date().toISOString(),
    reasonCode: input.reasonCode,
    source: input.source,
    evidenceRef: input.evidenceRef,
    trustDelta: input.trustDelta,
    operatorInvolved: input.operatorInvolved ?? false,
    operatorId: input.operatorId,
  };
}

export function createRoutingHistoryRecord(input: {
  requestId: string;
  intentId?: string;
  selectedCandidate: string;
  rejectedCandidates: string[];
  reasonCodes: string[];
  executionMode: "local" | "remote";
  degradedStates: string[];
  policyDecision: string;
  trustLevel: string;
  score: number;
}): RoutingHistoryRecord {
  return {
    recordId: stableHash("routing-record", { requestId: input.requestId, selectedCandidate: input.selectedCandidate }),
    requestId: input.requestId,
    intentId: input.intentId,
    selectedCandidate: input.selectedCandidate,
    rejectedCandidates: [...input.rejectedCandidates].sort(),
    reasonCodes: [...input.reasonCodes].sort(),
    routedAt: new Date().toISOString(),
    executionMode: input.executionMode,
    degradedStates: [...input.degradedStates].sort(),
    policyDecision: input.policyDecision,
    trustLevel: input.trustLevel,
    score: input.score,
  };
}

export function createReplayIntegrityIncident(input: {
  replayEnvelopeId?: string;
  severity: GovernanceIncidentSeverity;
  failureMode: string;
  failureReasons: string[];
  affectedIntentIds?: string[];
  affectedPlanIds?: string[];
  evidence?: string[];
}): ReplayIntegrityIncident {
  return {
    incidentId: stableHash("replay-integrity", { failureMode: input.failureMode, severity: input.severity }),
    replayEnvelopeId: input.replayEnvelopeId,
    detectedAt: new Date().toISOString(),
    severity: input.severity,
    failureMode: input.failureMode,
    failureReasons: [...input.failureReasons].sort(),
    affectedIntentIds: input.affectedIntentIds ?? [],
    affectedPlanIds: input.affectedPlanIds ?? [],
    evidence: input.evidence ?? [],
    operatorNotified: false,
    resolved: false,
  };
}

export function createAdjudicationRecord(input: {
  intentId: string;
  planId?: string;
  approvalId?: string;
  adjudicator: string;
  outcome: AdjudicationOutcome;
  reason: string;
  reasonCode: string;
  evidenceRefs?: string[];
  overrideApplied?: boolean;
  overrideReason?: string;
  priorDecisions?: string[];
  tags?: string[];
}): AdjudicationRecord {
  return {
    recordId: stableHash("adjudication", { intentId: input.intentId, outcome: input.outcome, adjudicator: input.adjudicator }),
    intentId: input.intentId,
    planId: input.planId,
    approvalId: input.approvalId,
    adjudicatedAt: new Date().toISOString(),
    adjudicator: input.adjudicator,
    outcome: input.outcome,
    reason: input.reason,
    reasonCode: input.reasonCode,
    evidenceRefs: input.evidenceRefs ?? [],
    overrideApplied: input.overrideApplied ?? false,
    overrideReason: input.overrideReason,
    priorDecisions: input.priorDecisions ?? [],
    tags: input.tags ?? [],
  };
}

export function buildInstitutionalMemorySnapshot(input: {
  entries: OperationalMemoryEntry[];
  incidents: GovernanceIncident[];
  clusters: ExceptionCluster[];
  trustRecords: HistoricalTrustRecord[];
  routingRecords: RoutingHistoryRecord[];
  replayIncidents: ReplayIntegrityIncident[];
  adjudications: AdjudicationRecord[];
}): InstitutionalMemorySnapshot {
  const snapshot: Omit<InstitutionalMemorySnapshot, "snapshotHash"> = {
    capturedAt: new Date().toISOString(),
    totalEntries: input.entries.length,
    totalIncidents: input.incidents.length,
    openIncidents: input.incidents.filter((i) => i.status === "open" || i.status === "investigating").length,
    totalClusters: input.clusters.length,
    activeClusters: input.clusters.filter((c) => c.state === "active").length,
    trustRecordCount: input.trustRecords.length,
    routingRecordCount: input.routingRecords.length,
    replayIncidentCount: input.replayIncidents.length,
    unresolvedReplayIncidents: input.replayIncidents.filter((i) => !i.resolved).length,
    adjudicationCount: input.adjudications.length,
    snapshotHash: "",
  };
  const snapshotHash = stableHash("memory-snapshot", {
    capturedAt: snapshot.capturedAt,
    totalEntries: snapshot.totalEntries,
    openIncidents: snapshot.openIncidents,
    activeClusters: snapshot.activeClusters,
    unresolvedReplayIncidents: snapshot.unresolvedReplayIncidents,
  });
  return { ...snapshot, snapshotHash };
}

export function queryOperationalMemory(
  entries: OperationalMemoryEntry[],
  query: OperationalMemoryQuery,
): OperationalMemoryEntry[] {
  let result = [...entries];

  if (query.types) {
    result = result.filter((e) => query.types!.includes(e.type));
  }
  if (query.timeRange) {
    const from = Date.parse(query.timeRange.from);
    const to = Date.parse(query.timeRange.to);
    result = result.filter((e) => {
      const t = Date.parse(e.recordedAt);
      return t >= from && t <= to;
    });
  }
  if (query.tags) {
    result = result.filter((e) => query.tags!.some((tag) => e.tags.includes(tag)));
  }
  if (query.source) {
    result = result.filter((e) => e.source === query.source);
  }
  if (query.actor) {
    result = result.filter((e) => e.provenance.actor === query.actor);
  }
  if (query.requestId) {
    result = result.filter((e) => e.provenance.requestId === query.requestId);
  }
  if (query.planId) {
    result = result.filter((e) => e.provenance.planId === query.planId);
  }

  result.sort((a, b) => a.sequence - b.sequence);

  const offset = query.offset ?? 0;
  const limit = query.limit ?? result.length;
  return result.slice(offset, offset + limit);
}

export function queryGovernanceIncidents(
  incidents: GovernanceIncident[],
  query: GovernanceIncidentQuery,
): GovernanceIncident[] {
  let result = [...incidents];

  if (query.severity) {
    result = result.filter((i) => query.severity!.includes(i.severity));
  }
  if (query.status) {
    result = result.filter((i) => query.status!.includes(i.status));
  }
  if (query.openOnly) {
    result = result.filter((i) => i.status === "open" || i.status === "investigating");
  }
  if (query.affectedSubsystem) {
    result = result.filter((i) => i.affectedSubsystem === query.affectedSubsystem);
  }
  if (query.tags) {
    result = result.filter((i) => query.tags!.some((tag) => i.tags.includes(tag)));
  }

  result.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  const limit = query.limit ?? result.length;
  return result.slice(0, limit);
}

export function queryExceptionClusters(
  clusters: ExceptionCluster[],
  query: ExceptionClusterQuery,
): ExceptionCluster[] {
  let result = [...clusters];

  if (query.state) {
    result = result.filter((c) => query.state!.includes(c.state));
  }
  if (query.category) {
    result = result.filter((c) => c.category === query.category);
  }
  if (query.minOccurrences) {
    result = result.filter((c) => c.occurrenceCount >= query.minOccurrences!);
  }
  if (query.requiresOperatorReview !== undefined) {
    result = result.filter((c) => c.requiresOperatorReview === query.requiresOperatorReview);
  }

  result.sort((a, b) => b.occurrenceCount - a.occurrenceCount);

  const limit = query.limit ?? result.length;
  return result.slice(0, limit);
}

export function clusterDegradedStates(
  entries: OperationalMemoryEntry[],
  minOccurrences: number = 3,
): ExceptionCluster[] {
  const degradedEntries = entries.filter((e) => e.type === "degraded_state");
  const byCategory = new Map<string, OperationalMemoryEntry[]>();

  for (const entry of degradedEntries) {
    const category = String((entry.payload as Record<string, unknown>)?.category ?? "unknown");
    if (!byCategory.has(category)) byCategory.set(category, []);
    byCategory.get(category)!.push(entry);
  }

  const clusters: ExceptionCluster[] = [];
  for (const [category, categoryEntries] of byCategory) {
    if (categoryEntries.length >= minOccurrences) {
      const reasonCodes = new Set<string>();
      for (const entry of categoryEntries) {
        const rc = String((entry.payload as Record<string, unknown>)?.reasonCode ?? "");
        if (rc) reasonCodes.add(rc);
      }
      clusters.push(
        createExceptionCluster({
          category,
          reasonCodes: Array.from(reasonCodes),
          affectedSubsystem: category,
          pattern: `recurring_degraded_state:${category}`,
          occurrenceCount: categoryEntries.length,
          firstOccurrence: categoryEntries[0].recordedAt,
          lastOccurrence: categoryEntries[categoryEntries.length - 1].recordedAt,
          relatedEntryIds: categoryEntries.map((e) => e.entryId),
          frequency: categoryEntries.length,
          recommendation: `Review recurring degraded state in ${category}`,
          requiresOperatorReview: true,
        }),
      );
    }
  }

  return clusters;
}
