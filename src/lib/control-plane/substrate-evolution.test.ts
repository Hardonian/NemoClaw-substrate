// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import {
  createIntentContract,
  createIntentLineage,
  createDelegatedAuthorityScope,
  createOperatorAuthority,
  createEscalationBoundary,
  recordIntentMutation,
  createExecutionAuthorizationEnvelope,
  createIntentReplayReference,
  validateIntentContract,
  validateIntentLineage,
  validateDelegationScope,
  validateOperatorAuthority,
  validateAuthorizationEnvelope,
  hashIntentContract,
  computeIntentLineageHash,
} from "./intent-contract";
import {
  createEvidenceNode,
  createEvidenceEdge,
  createProofpackEnvelope,
  createGovernanceSnapshot,
  createEvidenceReplayManifest,
  queryEvidenceGraph,
  validateEvidenceGraph,
  evidenceDigest,
} from "./evidence-graph";
import {
  createOperationalMemoryEntry,
  createGovernanceIncident,
  createExceptionCluster,
  createHistoricalTrustRecord,
  createRoutingHistoryRecord,
  createReplayIntegrityIncident,
  createAdjudicationRecord,
  buildInstitutionalMemorySnapshot,
  queryOperationalMemory,
  queryGovernanceIncidents,
  queryExceptionClusters,
  clusterDegradedStates,
  updateGovernanceIncident,
  updateExceptionCluster,
} from "./institutional-memory";
import {
  createAgentIdentity,
  createAgentAuthority,
  createAgentRelationship,
  createExecutionSponsorship,
  createQuorumApproval,
  approveQuorum,
  dissentQuorum,
  createContestedExecution,
  createSupervisoryReview,
  createChildAuthority,
  buildAgentGovernanceTopology,
  validateAgentAuthorityChain,
  resolveAuthorityChain,
  validateDelegationChain,
} from "./agent-governance";
import {
  simulateRouting,
  simulatePolicyImpact,
  simulateReplayForecast,
  simulateGovernanceDecision,
  createSimulationEnvelope,
} from "./governance-simulation";
import {
  calculateTrustCost,
  calculateExecutionCost,
  calculateEvidenceBurden,
  calculateDegradedPenalty,
  calculateReliabilityDecay,
  calculateCapabilityEconomicsScore,
  selectCandidateByEconomics,
  createEconomicsSnapshot,
} from "./capability-economics";
import {
  createEscalationBundle,
  updateEscalationBundle,
  escalateBundle,
  createOperatorTakeoverEnvelope,
  completeOperatorTakeover,
  createAdjudicationQueue,
  enqueueAdjudicationItem,
  dequeueAdjudicationItem,
  createReviewContract,
  createExecutionPauseResume,
  resumeExecution,
  createApprovalStage,
  approveStage,
  rejectStage,
  createConfidenceEscalation,
  buildEscalationTopology,
} from "./escalation";
import {
  createInvariantContract,
  createDefaultInvariantRules,
  detectInvariantViolations,
  validateConstitutionalRuntime,
  acknowledgeViolation,
  resolveViolation,
  dismissViolation,
  createConstitutionalRuntimeConfig,
} from "./constitutional-runtime";

const nowIso = new Date().toISOString();
const laterIso = new Date(Date.now() + 3600000).toISOString();

describe("Intent Contract Substrate", () => {
  describe("createIntentContract", () => {
    it("creates a valid intent contract with hash", () => {
      const contract = createIntentContract({
        intentId: "intent-001",
        actor: "operator-1",
        action: "execute:query",
        provider: "local",
        model: "test-model",
        executionMode: "local",
        constraints: {
          allowedDegradedCategories: [],
          requiredEvidenceCategories: ["receipt"],
          trustLevelMinimum: "observed",
          evidenceBurdenMinimum: "basic",
          mustReplayValidate: true,
          failClosed: true,
        },
        trustRequirements: {
          minimumTrustLevel: "observed",
          attestationRequired: false,
          operatorApprovalRequired: true,
          conflictingTrustDenies: true,
        },
        degradedRequirements: {
          allowedCategories: [],
          maxSeverity: "info",
          requireDisclosure: true,
          haltOnUnknown: true,
        },
        authoritySource: "auth-001",
        lineageId: "lineage-001",
      });

      expect(contract.intentId).toBe("intent-001");
      expect(contract.state).toBe("draft");
      expect(contract.intentHash).toBeTruthy();
      expect(contract.version).toBe("1");
      expect(contract.constraints.failClosed).toBe(true);
      expect(contract.constraints.mustReplayValidate).toBe(true);
    });
  });

  describe("validateIntentContract", () => {
    it("validates a correct contract", () => {
      const contract = createIntentContract({
        intentId: "intent-001",
        actor: "operator-1",
        action: "execute:query",
        executionMode: "local",
        constraints: {
          allowedDegradedCategories: [],
          requiredEvidenceCategories: [],
          trustLevelMinimum: "observed",
          evidenceBurdenMinimum: "none",
          mustReplayValidate: true,
          failClosed: true,
        },
        trustRequirements: {
          minimumTrustLevel: "observed",
          attestationRequired: false,
          operatorApprovalRequired: false,
          conflictingTrustDenies: true,
        },
        degradedRequirements: {
          allowedCategories: [],
          maxSeverity: "info",
          requireDisclosure: true,
          haltOnUnknown: false,
        },
        authoritySource: "auth-001",
        lineageId: "lineage-001",
      });

      const result = validateIntentContract(contract);
      expect(result.valid).toBe(true);
      expect(result.reasons).toHaveLength(0);
    });

    it("detects expired contracts", () => {
      const contract = createIntentContract({
        intentId: "intent-expired",
        actor: "operator-1",
        action: "execute:query",
        executionMode: "local",
        constraints: {
          allowedDegradedCategories: [],
          requiredEvidenceCategories: [],
          trustLevelMinimum: "observed",
          evidenceBurdenMinimum: "none",
          mustReplayValidate: true,
          failClosed: true,
        },
        trustRequirements: {
          minimumTrustLevel: "observed",
          attestationRequired: false,
          operatorApprovalRequired: false,
          conflictingTrustDenies: true,
        },
        degradedRequirements: {
          allowedCategories: [],
          maxSeverity: "info",
          requireDisclosure: true,
          haltOnUnknown: false,
        },
        authoritySource: "auth-001",
        lineageId: "lineage-001",
        expirationAt: "2020-01-01T00:00:00.000Z",
      });

      const result = validateIntentContract(contract, nowIso);
      expect(result.reasons).toContain("intent_expired");
    });
  });

  describe("createIntentLineage", () => {
    it("creates a valid lineage chain", () => {
      const lineage = createIntentLineage({
        rootIntentId: "intent-root",
        entries: [
          {
            intentId: "intent-root",
            parentIntentId: undefined,
            parentLineageId: undefined,
            relationship: "root",
            at: nowIso,
            actor: "operator-1",
            reason: "original intent",
          },
          {
            intentId: "intent-derived",
            parentIntentId: "intent-root",
            parentLineageId: undefined,
            relationship: "derived",
            at: laterIso,
            actor: "agent-1",
            reason: "delegated execution",
          },
        ],
      });

      expect(lineage.rootIntentId).toBe("intent-root");
      expect(lineage.depth).toBe(2);
      expect(lineage.lineageHash).toBeTruthy();
      expect(lineage.chain).toHaveLength(2);
    });
  });

  describe("validateDelegationScope", () => {
    it("validates a correct delegation scope", () => {
      const scope = createDelegatedAuthorityScope({
        grantorAuthorityId: "auth-001",
        granteeActor: "agent-1",
        scope: "execute_bounded",
        allowedActions: ["execute:query", "execute:tool"],
        allowedTargets: ["node-1"],
        reason: "delegated execution",
      });

      const result = validateDelegationScope(scope);
      expect(result.valid).toBe(true);
    });

    it("detects expired delegation", () => {
      const scope = createDelegatedAuthorityScope({
        grantorAuthorityId: "auth-001",
        granteeActor: "agent-1",
        scope: "execute_bounded",
        allowedActions: ["execute:query"],
        allowedTargets: ["node-1"],
        expiresAt: "2020-01-01T00:00:00.000Z",
        reason: "delegated execution",
      });

      const result = validateDelegationScope(scope, nowIso);
      expect(result.reasons).toContain("delegation_expired");
    });
  });

  describe("validateAuthorizationEnvelope", () => {
    it("validates envelope against contract", () => {
      const contract = createIntentContract({
        intentId: "intent-001",
        actor: "operator-1",
        action: "execute:query",
        executionMode: "local",
        constraints: {
          allowedDegradedCategories: [],
          requiredEvidenceCategories: [],
          trustLevelMinimum: "observed",
          evidenceBurdenMinimum: "none",
          mustReplayValidate: true,
          failClosed: true,
        },
        trustRequirements: {
          minimumTrustLevel: "observed",
          attestationRequired: false,
          operatorApprovalRequired: false,
          conflictingTrustDenies: true,
        },
        degradedRequirements: {
          allowedCategories: [],
          maxSeverity: "info",
          requireDisclosure: true,
          haltOnUnknown: false,
        },
        authoritySource: "auth-001",
        lineageId: "lineage-001",
      });

      const envelope = createExecutionAuthorizationEnvelope({
        intentId: contract.intentId,
        authorityId: "auth-001",
        authorizedBy: "operator-1",
        constraints: contract.constraints,
        trustRequirements: contract.trustRequirements,
        intentHash: contract.intentHash,
      });

      const result = validateAuthorizationEnvelope(envelope, contract);
      expect(result.valid).toBe(true);
    });

    it("detects intent hash mismatch", () => {
      const contract = createIntentContract({
        intentId: "intent-001",
        actor: "operator-1",
        action: "execute:query",
        executionMode: "local",
        constraints: {
          allowedDegradedCategories: [],
          requiredEvidenceCategories: [],
          trustLevelMinimum: "observed",
          evidenceBurdenMinimum: "none",
          mustReplayValidate: true,
          failClosed: true,
        },
        trustRequirements: {
          minimumTrustLevel: "observed",
          attestationRequired: false,
          operatorApprovalRequired: false,
          conflictingTrustDenies: true,
        },
        degradedRequirements: {
          allowedCategories: [],
          maxSeverity: "info",
          requireDisclosure: true,
          haltOnUnknown: false,
        },
        authoritySource: "auth-001",
        lineageId: "lineage-001",
      });

      const envelope = createExecutionAuthorizationEnvelope({
        intentId: contract.intentId,
        authorityId: "auth-001",
        authorizedBy: "operator-1",
        constraints: contract.constraints,
        trustRequirements: contract.trustRequirements,
        intentHash: "wrong-hash",
      });

      const result = validateAuthorizationEnvelope(envelope, contract);
      expect(result.reasons).toContain("envelope_intent_hash_mismatch");
    });
  });

  describe("recordIntentMutation", () => {
    it("records mutation with before/after hashes", () => {
      const before = createIntentContract({
        intentId: "intent-001",
        actor: "operator-1",
        action: "execute:query",
        executionMode: "local",
        constraints: {
          allowedDegradedCategories: [],
          requiredEvidenceCategories: [],
          trustLevelMinimum: "observed",
          evidenceBurdenMinimum: "none",
          mustReplayValidate: true,
          failClosed: true,
        },
        trustRequirements: {
          minimumTrustLevel: "observed",
          attestationRequired: false,
          operatorApprovalRequired: false,
          conflictingTrustDenies: true,
        },
        degradedRequirements: {
          allowedCategories: [],
          maxSeverity: "info",
          requireDisclosure: true,
          haltOnUnknown: false,
        },
        authoritySource: "auth-001",
        lineageId: "lineage-001",
      });

      const after = createIntentContract({
        intentId: "intent-001",
        actor: "operator-1",
        action: "execute:query:expanded",
        executionMode: "local",
        constraints: before.constraints,
        trustRequirements: before.trustRequirements,
        degradedRequirements: before.degradedRequirements,
        authoritySource: "auth-001",
        lineageId: "lineage-001",
      });

      const mutation = recordIntentMutation({
        intentId: "intent-001",
        mutationType: "scope_expansion",
        beforeContract: before,
        afterContract: after,
        mutatedBy: "operator-1",
        reason: "expanded scope",
        authorized: true,
      });

      expect(mutation.beforeHash).toBe(before.intentHash);
      expect(mutation.afterHash).toBe(after.intentHash);
      expect(mutation.authorized).toBe(true);
      expect(mutation.mutationType).toBe("scope_expansion");
    });
  });
});

describe("Evidence Graph + ProofPack Chain", () => {
  describe("createEvidenceNode", () => {
    it("creates a node with digest", () => {
      const node = createEvidenceNode({
        type: "receipt",
        source: "test",
        payload: { receiptId: "receipt-001", requestId: "req-001" },
        provenance: { requestId: "req-001", receiptId: "receipt-001" },
        lineageTags: ["test"],
      });

      expect(node.type).toBe("receipt");
      expect(node.digest.algorithm).toBe("sha256");
      expect(node.digest.value).toBeTruthy();
      expect(node.status).toBe("confirmed");
    });
  });

  describe("createEvidenceEdge", () => {
    it("creates an edge between nodes", () => {
      const node1 = createEvidenceNode({
        type: "receipt",
        source: "test",
        payload: { id: "1" },
        provenance: {},
      });
      const node2 = createEvidenceNode({
        type: "operational_event",
        source: "test",
        payload: { id: "2" },
        provenance: {},
      });

      const edge = createEvidenceEdge({
        fromNodeId: node1.nodeId,
        toNodeId: node2.nodeId,
        edgeType: "evidence_of",
      });

      expect(edge.fromNodeId).toBe(node1.nodeId);
      expect(edge.toNodeId).toBe(node2.nodeId);
      expect(edge.edgeType).toBe("evidence_of");
    });
  });

  describe("createProofpackEnvelope", () => {
    it("creates a valid envelope", () => {
      const nodes = [
        createEvidenceNode({ type: "receipt", source: "test", payload: { id: "1" }, provenance: {} }),
        createEvidenceNode({ type: "operational_event", source: "test", payload: { id: "2" }, provenance: {} }),
      ];
      const edges = [createEvidenceEdge({ fromNodeId: nodes[0].nodeId, toNodeId: nodes[1].nodeId, edgeType: "evidence_of" })];

      const envelope = createProofpackEnvelope({ nodes, edges });

      expect(envelope.version).toBe("1");
      expect(envelope.nodeIds).toHaveLength(2);
      expect(envelope.edgeIds).toHaveLength(1);
      expect(envelope.rootNodes).toContain(nodes[0].nodeId);
      expect(envelope.terminalNodes).toContain(nodes[1].nodeId);
      expect(envelope.integrityVerified).toBe(true);
    });
  });

  describe("validateEvidenceGraph", () => {
    it("validates a correct graph", () => {
      const nodes = [
        createEvidenceNode({ type: "receipt", source: "test", payload: { id: "1" }, provenance: {} }),
        createEvidenceNode({ type: "operational_event", source: "test", payload: { id: "2" }, provenance: {} }),
      ];
      const edges = [createEvidenceEdge({ fromNodeId: nodes[0].nodeId, toNodeId: nodes[1].nodeId, edgeType: "evidence_of" })];

      const result = validateEvidenceGraph(nodes, edges);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.cycleDetected).toBe(false);
    });

    it("detects orphan nodes", () => {
      const nodes = [
        createEvidenceNode({ type: "receipt", source: "test", payload: { id: "1" }, provenance: {} }),
        createEvidenceNode({ type: "operational_event", source: "test", payload: { id: "2" }, provenance: {} }),
      ];
      const edges: ReturnType<typeof createEvidenceEdge>[] = [];

      const result = validateEvidenceGraph(nodes, edges);
      expect(result.orphanNodes).toHaveLength(2);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("detects digest tampering", () => {
      const node = createEvidenceNode({
        type: "receipt",
        source: "test",
        payload: { id: "1" },
        provenance: {},
      });
      node.digest = { algorithm: "sha256", value: "tampered" };

      const result = validateEvidenceGraph([node], []);
      expect(result.errors.some((e) => e.startsWith("digest_mismatch"))).toBe(true);
    });
  });

  describe("createEvidenceReplayManifest", () => {
    it("creates a valid replay manifest", () => {
      const nodes = [
        createEvidenceNode({ type: "receipt", source: "test", payload: { id: "1" }, provenance: {} }),
        createEvidenceNode({ type: "operational_event", source: "test", payload: { id: "2" }, provenance: {} }),
      ];
      const edges = [createEvidenceEdge({ fromNodeId: nodes[0].nodeId, toNodeId: nodes[1].nodeId, edgeType: "evidence_of" })];
      const envelope = createProofpackEnvelope({ nodes, edges });

      const manifest = createEvidenceReplayManifest({ envelope, nodes, edges });

      expect(manifest.version).toBe("1");
      expect(manifest.nodeCount).toBe(2);
      expect(manifest.edgeCount).toBe(1);
      expect(manifest.tamperDetected).toBe(false);
      expect(manifest.lineageRoots).toContain(nodes[0].nodeId);
    });
  });

  describe("queryEvidenceGraph", () => {
    it("filters by node type", () => {
      const nodes = [
        createEvidenceNode({ type: "receipt", source: "test", payload: { id: "1" }, provenance: {} }),
        createEvidenceNode({ type: "operational_event", source: "test", payload: { id: "2" }, provenance: {} }),
      ];

      const result = queryEvidenceGraph(nodes, [], { nodeTypes: ["receipt"] });
      expect(result.matchedCount).toBe(1);
      expect(result.nodes[0].type).toBe("receipt");
    });
  });

  describe("evidenceDigest", () => {
    it("produces deterministic digest", () => {
      const nodes = [
        createEvidenceNode({ type: "receipt", source: "test", payload: { id: "1" }, provenance: {} }),
        createEvidenceNode({ type: "operational_event", source: "test", payload: { id: "2" }, provenance: {} }),
      ];

      const digest1 = evidenceDigest(nodes);
      const digest2 = evidenceDigest([...nodes].reverse());

      expect(digest1).toBe(digest2);
    });
  });
});

describe("Institutional Operational Memory", () => {
  describe("createOperationalMemoryEntry", () => {
    it("creates a memory entry with hash", () => {
      const entry = createOperationalMemoryEntry({
        type: "adjudication",
        source: "test",
        sequence: 0,
        payload: { decision: "approved" },
        provenance: { requestId: "req-001" },
      });

      expect(entry.type).toBe("adjudication");
      expect(entry.sequence).toBe(0);
      expect(entry.entryHash).toBeTruthy();
    });
  });

  describe("createGovernanceIncident", () => {
    it("creates an incident with hash", () => {
      const incident = createGovernanceIncident({
        severity: "error",
        title: "Test incident",
        description: "A test incident",
        affectedSubsystem: "routing",
        reasonCode: "test_reason",
        detectedBy: "system",
      });

      expect(incident.severity).toBe("error");
      expect(incident.status).toBe("open");
      expect(incident.incidentHash).toBeTruthy();
    });
  });

  describe("updateGovernanceIncident", () => {
    it("updates incident status", () => {
      const incident = createGovernanceIncident({
        severity: "error",
        title: "Test incident",
        description: "A test incident",
        affectedSubsystem: "routing",
        reasonCode: "test_reason",
        detectedBy: "system",
      });

      const updated = updateGovernanceIncident(incident, {
        status: "resolved",
        resolvedBy: "operator-1",
        resolution: "fixed",
      });

      expect(updated.status).toBe("resolved");
      expect(updated.resolvedBy).toBe("operator-1");
      expect(updated.resolvedAt).toBeTruthy();
    });
  });

  describe("createExceptionCluster", () => {
    it("creates a cluster with hash", () => {
      const cluster = createExceptionCluster({
        category: "degraded_routing",
        reasonCodes: ["no_eligible_candidate"],
        affectedSubsystem: "routing",
        pattern: "recurring_degraded_state:routing",
        occurrenceCount: 5,
      });

      expect(cluster.category).toBe("degraded_routing");
      expect(cluster.occurrenceCount).toBe(5);
      expect(cluster.requiresOperatorReview).toBe(true);
      expect(cluster.clusterHash).toBeTruthy();
    });
  });

  describe("clusterDegradedStates", () => {
    it("clusters recurring degraded states", () => {
      const entries = [
        createOperationalMemoryEntry({ type: "degraded_state", source: "test", sequence: 0, payload: { category: "routing", reasonCode: "no_candidate" } }),
        createOperationalMemoryEntry({ type: "degraded_state", source: "test", sequence: 1, payload: { category: "routing", reasonCode: "no_candidate" } }),
        createOperationalMemoryEntry({ type: "degraded_state", source: "test", sequence: 2, payload: { category: "routing", reasonCode: "no_candidate" } }),
      ];

      const clusters = clusterDegradedStates(entries, 3);
      expect(clusters.length).toBeGreaterThan(0);
      expect(clusters[0].occurrenceCount).toBe(3);
    });
  });

  describe("queryGovernanceIncidents", () => {
    it("filters by severity", () => {
      const incidents = [
        createGovernanceIncident({ severity: "error", title: "Error incident", description: "desc", affectedSubsystem: "routing", reasonCode: "test", detectedBy: "system" }),
        createGovernanceIncident({ severity: "warning", title: "Warning incident", description: "desc", affectedSubsystem: "routing", reasonCode: "test", detectedBy: "system" }),
      ];

      const result = queryGovernanceIncidents(incidents, { severity: ["error"] });
      expect(result).toHaveLength(1);
      expect(result[0].severity).toBe("error");
    });
  });

  describe("buildInstitutionalMemorySnapshot", () => {
    it("builds a snapshot with hash", () => {
      const entries = [createOperationalMemoryEntry({ type: "adjudication", source: "test", sequence: 0, payload: {} })];
      const incidents = [createGovernanceIncident({ severity: "error", title: "Test", description: "desc", affectedSubsystem: "routing", reasonCode: "test", detectedBy: "system" })];
      const clusters = [createExceptionCluster({ category: "test", reasonCodes: ["test"], affectedSubsystem: "routing", pattern: "test" })];

      const snapshot = buildInstitutionalMemorySnapshot({
        entries,
        incidents,
        clusters,
        trustRecords: [],
        routingRecords: [],
        replayIncidents: [],
        adjudications: [],
      });

      expect(snapshot.totalEntries).toBe(1);
      expect(snapshot.totalIncidents).toBe(1);
      expect(snapshot.snapshotHash).toBeTruthy();
    });
  });
});

describe("Multi-Agent Governance + Delegation", () => {
  describe("createAgentAuthority", () => {
    it("creates authority with correct delegation settings", () => {
      const auth = createAgentAuthority({
        agentId: "agent-1",
        authorityType: "direct",
        grantedBy: "operator-1",
        scope: ["execute:query"],
        delegationAllowed: true,
        maxDelegationDepth: 2,
      });

      expect(auth.agentId).toBe("agent-1");
      expect(auth.delegationAllowed).toBe(true);
      expect(auth.maxDelegationDepth).toBe(2);
      expect(auth.currentDelegationDepth).toBe(0);
    });
  });

  describe("validateAgentAuthorityChain", () => {
    it("validates a correct chain", () => {
      const authorities = [
        createAgentAuthority({
          agentId: "agent-1",
          authorityType: "direct",
          grantedBy: "operator-1",
          scope: ["execute:query"],
        }),
      ];
      const relationships: ReturnType<typeof createAgentRelationship>[] = [];

      const result = validateAgentAuthorityChain("agent-1", authorities, relationships);
      expect(result.valid).toBe(true);
    });

    it("fails when no authority exists", () => {
      const result = validateAgentAuthorityChain("agent-nonexistent", [], []);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.startsWith("no_authority_for_agent"))).toBe(true);
    });
  });

  describe("resolveAuthorityChain", () => {
    it("resolves chain through parent relationships", () => {
      const authorities = [
        createAgentAuthority({ agentId: "agent-child", authorityType: "delegated", grantedBy: "agent-parent", sourceAuthorityId: "auth-parent", scope: ["execute:query"] }),
        createAgentAuthority({ agentId: "agent-parent", authorityType: "direct", grantedBy: "operator-1", scope: ["execute:query"] }),
      ];
      const relationships = [
        createAgentRelationship({
          supervisorAgentId: "agent-parent",
          subordinateAgentId: "agent-child",
          relationshipType: "supervises",
          establishedBy: "operator-1",
        }),
      ];

      const chain = resolveAuthorityChain("agent-child", authorities, relationships);
      expect(chain.length).toBeGreaterThan(0);
    });
  });

  describe("createQuorumApproval", () => {
    it("creates quorum with required approvals", () => {
      const quorum = createQuorumApproval({
        intentId: "intent-001",
        requiredApprovals: 2,
      });

      expect(quorum.requiredApprovals).toBe(2);
      expect(quorum.receivedApprovals).toBe(0);
      expect(quorum.achieved).toBe(false);
    });
  });

  describe("approveQuorum", () => {
    it("achieves quorum when enough approvals", () => {
      let quorum = createQuorumApproval({
        intentId: "intent-001",
        requiredApprovals: 2,
        approvers: [{ agentId: "agent-1", reason: "approved" }],
      });

      expect(quorum.achieved).toBe(false);

      quorum = approveQuorum(quorum, "agent-2", "approved");
      expect(quorum.receivedApprovals).toBe(2);
      expect(quorum.achieved).toBe(true);
      expect(quorum.completedAt).toBeTruthy();
    });

    it("prevents duplicate approval", () => {
      const quorum = createQuorumApproval({
        intentId: "intent-001",
        requiredApprovals: 2,
        approvers: [{ agentId: "agent-1", reason: "approved" }],
      });

      const quorum2 = approveQuorum(quorum, "agent-1", "approved again");
      expect(quorum2.receivedApprovals).toBe(1);
    });
  });

  describe("dissentQuorum", () => {
    it("records dissent", () => {
      const quorum = createQuorumApproval({
        intentId: "intent-001",
        requiredApprovals: 2,
      });

      const dissented = dissentQuorum(quorum, "agent-1", "not approved");
      expect(dissented.dissenters).toHaveLength(1);
      expect(dissented.dissenters[0].agentId).toBe("agent-1");
    });
  });

  describe("buildAgentGovernanceTopology", () => {
    it("builds topology with hash", () => {
      const topology = buildAgentGovernanceTopology({
        agents: [createAgentIdentity({ agentId: "agent-1", agentType: "worker", agentLabel: "Test Agent" })],
        relationships: [],
        authorities: [],
        delegations: [],
        sponsorships: [],
        activeContests: [],
        pendingReviews: [],
      });

      expect(topology.agents).toHaveLength(1);
      expect(topology.topologyHash).toBeTruthy();
    });
  });
});

describe("Digital Twin + Governance Simulation", () => {
  describe("simulateRouting", () => {
    it("simulates routing with candidate selection", () => {
      const simulation = simulateRouting({
        intent: {
          requestId: "req-001",
          actor: "operator-1",
          action: "execute:query",
          executionMode: "local",
          metadata: {},
        },
        candidates: [
          { nodeId: "local-1", candidateClass: "local_provider", trustLevel: "trusted_local", health: "healthy", degradedStates: [], policyAllowed: true, policyRequiredApproval: false },
          { nodeId: "remote-1", candidateClass: "remote_worker", trustLevel: "trusted_remote", health: "healthy", degradedStates: [], policyAllowed: true, policyRequiredApproval: false },
        ],
      });

      expect(simulation.selectedCandidate).toBeDefined();
      expect(simulation.policyDecision).toBeDefined();
      expect(simulation.assumptions.length).toBeGreaterThan(0);
      expect(simulation.simulationHash).toBeTruthy();
    });

    it("handles no eligible candidates", () => {
      const simulation = simulateRouting({
        intent: {
          requestId: "req-001",
          actor: "operator-1",
          action: "execute:query",
          executionMode: "local",
          metadata: {},
        },
        candidates: [
          { nodeId: "remote-1", candidateClass: "remote_worker", trustLevel: "untrusted", health: "unhealthy", degradedStates: [], policyAllowed: false, policyRequiredApproval: false },
        ],
      });

      expect(simulation.selectedCandidate).toBeUndefined();
    });
  });

  describe("simulateReplayForecast", () => {
    it("creates replay forecast", () => {
      const forecast = simulateReplayForecast({
        intentId: "intent-001",
        expectedLineage: ["lineage-1", "lineage-2"],
        expectedEvidenceNodes: ["evidence-1"],
        authorityChain: ["auth-1"],
        delegationChain: [],
        degradedStates: [],
      });

      expect(forecast.wouldReplayValidate).toBe(true);
      expect(forecast.authorityChainValid).toBe(true);
      expect(forecast.assumptions.length).toBeGreaterThan(0);
    });
  });

  describe("simulateGovernanceDecision", () => {
    it("produces dry-run simulation", () => {
      const policyBundle = {
        id: "test-policy",
        version: "1",
        defaultEffect: "allow" as const,
        rules: [],
      };

      const result = simulateGovernanceDecision({
        type: "what_if",
        intent: {
          requestId: "req-001",
          actor: "operator-1",
          action: "execute:query",
          executionMode: "local",
          metadata: {},
        },
        policyBundle,
        policyContext: {
          request: {
            version: "1",
            requestId: "req-001",
            receivedAt: nowIso,
            source: "test",
            actor: "operator-1",
            action: "execute:query",
            constraints: [],
            metadata: {},
          },
          actionClass: "generic",
        },
        candidates: [
          { nodeId: "local-1", candidateClass: "local_provider", trustLevel: "trusted_local", health: "healthy", degradedStates: [] },
        ],
      });

      expect(result.status).toBe("completed");
      expect(result.envelope.metadata["dry_run"]).not.toBeDefined();
      expect(result.simulationHash).toBeTruthy();
    });
  });
});

describe("Capability Economics Engine", () => {
  describe("calculateTrustCost", () => {
    it("calculates cost for trusted remote", () => {
      const cost = calculateTrustCost({
        trustLevel: "trusted_remote",
        attestationRequired: true,
        operatorReviewRequired: false,
        attestationFresh: true,
        conflictDetected: false,
        revoked: false,
      });

      expect(cost.totalTrustCost).toBeGreaterThan(0);
      expect(cost.attestationCost).toBe(0.5);
      expect(cost.verificationOverhead).toBe(0.3);
    });

    it("calculates high cost for revoked trust", () => {
      const cost = calculateTrustCost({
        trustLevel: "revoked",
        attestationRequired: false,
        operatorReviewRequired: false,
        attestationFresh: false,
        conflictDetected: false,
        revoked: true,
      });

      expect(cost.revokedTrustPenalty).toBe(2.0);
      expect(cost.totalTrustCost).toBeGreaterThan(2.0);
    });
  });

  describe("calculateExecutionCost", () => {
    it("calculates execution cost", () => {
      const cost = calculateExecutionCost({
        computeBase: 1.0,
        governanceOverhead: 0.15,
      });

      expect(cost.computeCost).toBe(1.0);
      expect(cost.governanceOverhead).toBe(0.15);
      expect(cost.totalExecutionCost).toBeGreaterThan(1.0);
    });
  });

  describe("calculateReliabilityDecay", () => {
    it("calculates decay over time", () => {
      const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
      const decay = calculateReliabilityDecay({
        componentId: "node-1",
        currentReliability: 1.0,
        decayRate: 0.1,
        lastAttestedAt: oneHourAgo,
      });

      expect(decay.decayedReliability).toBeLessThan(1.0);
      expect(decay.decayedReliability).toBeGreaterThan(0);
    });
  });

  describe("calculateCapabilityEconomicsScore", () => {
    it("produces a full economics score", () => {
      const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
      const score = calculateCapabilityEconomicsScore({
        requestId: "req-001",
        candidateId: "candidate-1",
        candidateClass: "remote_worker",
        trustLevel: "trusted_remote",
        attestationRequired: true,
        operatorReviewRequired: false,
        attestationFresh: true,
        conflictDetected: false,
        revoked: false,
        computeBase: 1.0,
        degradedStates: [],
        policyComplexity: 2,
        currentReliability: 0.95,
        decayRate: 0.01,
        lastAttestedAt: oneHourAgo,
      });

      expect(score.totalScore).toBeGreaterThan(0);
      expect(score.scoreHash).toBeTruthy();
      expect(score.trustCost.totalTrustCost).toBeGreaterThan(0);
      expect(score.executionCost.totalExecutionCost).toBeGreaterThan(0);
    });
  });

  describe("selectCandidateByEconomics", () => {
    it("selects lowest cost candidate", () => {
      const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
      const scores = [
        calculateCapabilityEconomicsScore({
          candidateId: "expensive",
          candidateClass: "remote_worker",
          trustLevel: "untrusted",
          attestationRequired: true,
          operatorReviewRequired: true,
          attestationFresh: false,
          conflictDetected: true,
          revoked: false,
          computeBase: 5.0,
          degradedStates: [{ category: "routing", reasonCode: "no_candidate", severity: "error" }],
          policyComplexity: 10,
          currentReliability: 0.5,
          decayRate: 0.1,
          lastAttestedAt: oneHourAgo,
        }),
        calculateCapabilityEconomicsScore({
          candidateId: "cheap",
          candidateClass: "local_provider",
          trustLevel: "trusted_local",
          attestationRequired: false,
          operatorReviewRequired: false,
          attestationFresh: false,
          conflictDetected: false,
          revoked: false,
          computeBase: 1.0,
          degradedStates: [],
          policyComplexity: 1,
          currentReliability: 0.99,
          decayRate: 0.001,
          lastAttestedAt: oneHourAgo,
        }),
      ];

      const selection = selectCandidateByEconomics(scores);
      expect(selection).toBeDefined();
      expect(selection!.selectedCandidateId).toBe("cheap");
    });
  });

  describe("createEconomicsSnapshot", () => {
    it("creates snapshot with hash", () => {
      const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
      const score = calculateCapabilityEconomicsScore({
        candidateId: "candidate-1",
        candidateClass: "local_provider",
        trustLevel: "trusted_local",
        attestationRequired: false,
        operatorReviewRequired: false,
        attestationFresh: false,
        conflictDetected: false,
        revoked: false,
        computeBase: 1.0,
        degradedStates: [],
        policyComplexity: 1,
        currentReliability: 0.99,
        decayRate: 0.001,
        lastAttestedAt: oneHourAgo,
      });

      const snapshot = createEconomicsSnapshot({
        scores: [score],
        selectedCandidate: "candidate-1",
        selectionReason: "lowest_cost",
      });

      expect(snapshot.snapshotHash).toBeTruthy();
      expect(snapshot.scores).toHaveLength(1);
    });
  });
});

describe("Human Escalation Infrastructure", () => {
  describe("createEscalationBundle", () => {
    it("creates bundle with hash", () => {
      const bundle = createEscalationBundle({
        intentId: "intent-001",
        level: "required",
        reason: "trust below threshold",
        reasonCode: "trust_below_threshold",
        source: "constitutional-runtime",
        affectedSubsystem: "trust",
      });

      expect(bundle.level).toBe("required");
      expect(bundle.state).toBe("pending");
      expect(bundle.bundleHash).toBeTruthy();
    });
  });

  describe("escalateBundle", () => {
    it("escalates to next step", () => {
      const bundle = createEscalationBundle({
        intentId: "intent-001",
        level: "required",
        reason: "trust below threshold",
        reasonCode: "trust_below_threshold",
        source: "constitutional-runtime",
        affectedSubsystem: "trust",
        maxEscalationSteps: 3,
      });

      const escalated = escalateBundle(bundle, "operator-2", "escalated for review");
      expect(escalated.currentEscalationStep).toBe(2);
      expect(escalated.assignedTo).toBe("operator-2");
    });

    it("caps at max escalation steps", () => {
      const bundle = createEscalationBundle({
        intentId: "intent-001",
        level: "critical",
        reason: "invariant violation",
        reasonCode: "invariant_violation",
        source: "constitutional-runtime",
        affectedSubsystem: "trust",
        maxEscalationSteps: 1,
        currentEscalationStep: 1,
      } as Parameters<typeof createEscalationBundle>[0] & { currentEscalationStep?: number });

      const escalated = escalateBundle(bundle, "operator-2", "final escalation");
      expect(escalated.state).toBe("escalated");
    });
  });

  describe("createOperatorTakeoverEnvelope", () => {
    it("creates takeover envelope", () => {
      const envelope = createOperatorTakeoverEnvelope({
        escalationBundleId: "bundle-001",
        intentId: "intent-001",
        operatorId: "operator-1",
        authorityId: "auth-001",
        initiatedBy: "system",
        takeoverScope: ["execute:query"],
        takeoverReason: "operator takeover required",
      });

      expect(envelope.takeoverState).toBe("initiated");
      expect(envelope.pauseExecution).toBe(true);
      expect(envelope.envelopeHash).toBeTruthy();
    });
  });

  describe("completeOperatorTakeover", () => {
    it("completes takeover", () => {
      const envelope = createOperatorTakeoverEnvelope({
        escalationBundleId: "bundle-001",
        intentId: "intent-001",
        operatorId: "operator-1",
        authorityId: "auth-001",
        initiatedBy: "system",
        takeoverScope: ["execute:query"],
        takeoverReason: "operator takeover required",
      });

      const completed = completeOperatorTakeover(envelope, "operator-1", "execution completed successfully");
      expect(completed.takeoverState).toBe("completed");
      expect(completed.completedBy).toBe("operator-1");
    });
  });

  describe("createAdjudicationQueue", () => {
    it("creates an empty queue", () => {
      const queue = createAdjudicationQueue();
      expect(queue.state).toBe("active");
      expect(queue.items).toHaveLength(0);
    });
  });

  describe("enqueueAdjudicationItem", () => {
    it("adds item to queue", () => {
      const queue = createAdjudicationQueue();
      const item = {
        itemId: "item-001",
        intentId: "intent-001",
        enqueuedAt: nowIso,
        priority: "high" as const,
        reason: "needs review",
        reasonCode: "operator_review_required",
        evidenceRefs: [],
        metadata: {},
      };

      const updated = enqueueAdjudicationItem(queue, item);
      expect(updated.items).toHaveLength(1);
      expect(updated.items[0].itemId).toBe("item-001");
    });
  });

  describe("dequeueAdjudicationItem", () => {
    it("removes item from queue", () => {
      const queue = createAdjudicationQueue();
      const item = {
        itemId: "item-001",
        intentId: "intent-001",
        enqueuedAt: nowIso,
        priority: "high" as const,
        reason: "needs review",
        reasonCode: "operator_review_required",
        evidenceRefs: [],
        metadata: {},
      };

      const enqueued = enqueueAdjudicationItem(queue, item);
      const dequeued = dequeueAdjudicationItem(enqueued, "item-001");
      expect(dequeued.items).toHaveLength(0);
      expect(dequeued.processedCount).toBe(1);
    });
  });

  describe("createExecutionPauseResume", () => {
    it("creates a pause", () => {
      const pause = createExecutionPauseResume({
        intentId: "intent-001",
        pausedBy: "operator-1",
        pauseReason: "safety review required",
        pauseReasonCode: "safety_review",
      });

      expect(pause.state).toBe("paused");
      expect(pause.expired).toBe(false);
      expect(pause.overridden).toBe(false);
    });
  });

  describe("resumeExecution", () => {
    it("resumes paused execution", () => {
      const pause = createExecutionPauseResume({
        intentId: "intent-001",
        pausedBy: "operator-1",
        pauseReason: "safety review required",
        pauseReasonCode: "safety_review",
      });

      const resumed = resumeExecution(pause, "operator-1", "safety review passed");
      expect(resumed.state).toBe("resumed");
      expect(resumed.resumedBy).toBe("operator-1");
    });
  });

  describe("createApprovalStage", () => {
    it("creates a multi-stage approval", () => {
      const stage = createApprovalStage({
        intentId: "intent-001",
        stageNumber: 1,
        stageName: "Initial Review",
        requiredApprovers: ["operator-1", "operator-2"],
      });

      expect(stage.state).toBe("pending");
      expect(stage.requiredApprovers).toHaveLength(2);
      expect(stage.receivedApprovals).toHaveLength(0);
    });
  });

  describe("approveStage", () => {
    it("approves when all approvers approve", () => {
      const stage = createApprovalStage({
        intentId: "intent-001",
        stageNumber: 1,
        stageName: "Initial Review",
        requiredApprovers: ["operator-1"],
      });

      const approved = approveStage(stage, "operator-1");
      expect(approved.state).toBe("approved");
      expect(approved.completedAt).toBeTruthy();
    });

    it("prevents duplicate approval", () => {
      const stage = createApprovalStage({
        intentId: "intent-001",
        stageNumber: 1,
        stageName: "Initial Review",
        requiredApprovers: ["operator-1"],
      });

      const first = approveStage(stage, "operator-1");
      const second = approveStage(first, "operator-1");
      expect(second.receivedApprovals).toHaveLength(1);
    });
  });

  describe("createConfidenceEscalation", () => {
    it("creates confidence-based escalation", () => {
      const escalation = createConfidenceEscalation({
        intentId: "intent-001",
        confidenceThreshold: 0.9,
        actualConfidence: 0.5,
        triggerReason: "confidence below threshold",
      });

      expect(escalation.confidenceGap).toBe(0.4);
      expect(escalation.escalationLevel).toBe("mandatory");
      expect(escalation.state).toBe("pending");
    });
  });

  describe("buildEscalationTopology", () => {
    it("builds topology with hash", () => {
      const topology = buildEscalationTopology({
        bundles: [],
        takeovers: [],
        queues: [createAdjudicationQueue()],
        reviews: [],
        pauses: [],
        approvalStages: [],
        confidenceEscalations: [],
      });

      expect(topology.queues).toHaveLength(1);
      expect(topology.topologyHash).toBeTruthy();
    });
  });
});

describe("Constitutional Runtime Layer", () => {
  describe("createDefaultInvariantRules", () => {
    it("creates all default invariants", () => {
      const rules = createDefaultInvariantRules();
      expect(rules.length).toBe(15);
      expect(rules.every((r) => r.invariantHash)).toBe(true);
      expect(rules.some((r) => r.category === "operator_supremacy")).toBe(true);
      expect(rules.some((r) => r.category === "anti_theatre")).toBe(true);
      expect(rules.some((r) => r.category === "non_fabrication")).toBe(true);
      expect(rules.some((r) => r.category === "fail_closed")).toBe(true);
    });
  });

  describe("createInvariantContract", () => {
    it("creates contract with all default rules", () => {
      const contract = createInvariantContract();
      expect(contract.rules.length).toBe(15);
      expect(contract.operatorSupremacyGuaranteed).toBe(true);
      expect(contract.failClosedGuaranteed).toBe(true);
      expect(contract.antiTheatreEnforced).toBe(true);
      expect(contract.nonFabricationEnforced).toBe(true);
      expect(contract.boundedAutonomyEnforced).toBe(true);
      expect(contract.contractHash).toBeTruthy();
    });
  });

  describe("validateConstitutionalRuntime", () => {
    it("passes when all checks pass", () => {
      const contract = createInvariantContract();
      const config = createConstitutionalRuntimeConfig();
      const checks: Record<string, boolean> = {};
      for (const rule of contract.rules) {
        checks[rule.invariantId] = true;
      }

      const result = validateConstitutionalRuntime({
        contract,
        config,
        context: {},
        checks,
      });

      expect(result.allPassed).toBe(true);
      expect(result.blocked).toBe(false);
      expect(result.violationsFound).toBe(0);
    });

    it("blocks on critical violation", () => {
      const contract = createInvariantContract();
      const config = createConstitutionalRuntimeConfig();
      const checks: Record<string, boolean> = {};
      for (const rule of contract.rules) {
        checks[rule.invariantId] = true;
      }
      checks["INV-001"] = false;

      const result = validateConstitutionalRuntime({
        contract,
        config,
        context: {},
        checks,
      });

      expect(result.allPassed).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.violationsFound).toBeGreaterThan(0);
    });

    it("skips validation when disabled", () => {
      const contract = createInvariantContract();
      const config = createConstitutionalRuntimeConfig({ enforcementMode: "disabled" });

      const result = validateConstitutionalRuntime({
        contract,
        config,
        context: {},
        checks: {},
      });

      expect(result.allPassed).toBe(true);
      expect(result.blocked).toBe(false);
      expect(result.warnings).toContain("constitutional_runtime_disabled");
    });

    it("audit mode warns but does not block", () => {
      const contract = createInvariantContract();
      const config = createConstitutionalRuntimeConfig({ enforcementMode: "audit", blockOnViolation: false });
      const checks: Record<string, boolean> = {};
      for (const rule of contract.rules) {
        checks[rule.invariantId] = true;
      }
      checks["INV-001"] = false;

      const result = validateConstitutionalRuntime({
        contract,
        config,
        context: {},
        checks,
      });

      expect(result.violationsFound).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes("audit_mode"))).toBe(true);
    });
  });

  describe("acknowledgeViolation", () => {
    it("acknowledges a violation", () => {
      const contract = createInvariantContract();
      const checks: Record<string, boolean> = { "INV-001": false };
      const violations = detectInvariantViolations({ contract, context: {}, checks });

      expect(violations.length).toBeGreaterThan(0);
      const acknowledged = acknowledgeViolation(violations[0], "operator-1");
      expect(acknowledged.state).toBe("acknowledged");
      expect(acknowledged.acknowledgedBy).toBe("operator-1");
    });
  });

  describe("resolveViolation", () => {
    it("resolves a violation", () => {
      const contract = createInvariantContract();
      const checks: Record<string, boolean> = { "INV-001": false };
      const violations = detectInvariantViolations({ contract, context: {}, checks });

      const resolved = resolveViolation(violations[0], "operator-1", "fixed");
      expect(resolved.state).toBe("resolved");
      expect(resolved.resolvedBy).toBe("operator-1");
    });
  });

  describe("dismissViolation", () => {
    it("dismisses a violation with reason", () => {
      const contract = createInvariantContract();
      const checks: Record<string, boolean> = { "INV-001": false };
      const violations = detectInvariantViolations({ contract, context: {}, checks });

      const dismissed = dismissViolation(violations[0], "operator-1", "false positive");
      expect(dismissed.state).toBe("dismissed");
      expect(dismissed.dismissalReason).toBe("false positive");
    });
  });
});

describe("Cross-Domain Integration", () => {
  it("links intent contract to escalation to constitutional validation", () => {
    const contract = createIntentContract({
      intentId: "intent-001",
      actor: "operator-1",
      action: "execute:query",
      executionMode: "local",
      constraints: {
        allowedDegradedCategories: [],
        requiredEvidenceCategories: [],
        trustLevelMinimum: "trusted_remote",
        evidenceBurdenMinimum: "full",
        mustReplayValidate: true,
        failClosed: true,
      },
      trustRequirements: {
        minimumTrustLevel: "trusted_remote",
        attestationRequired: true,
        operatorApprovalRequired: true,
        conflictingTrustDenies: true,
      },
      degradedRequirements: {
        allowedCategories: [],
        maxSeverity: "info",
        requireDisclosure: true,
        haltOnUnknown: true,
      },
      authoritySource: "auth-001",
      lineageId: "lineage-001",
    });

    const bundle = createEscalationBundle({
      intentId: contract.intentId,
      level: "critical",
      reason: "trust below threshold",
      reasonCode: "trust_below_threshold",
      source: "constitutional-runtime",
      affectedSubsystem: "trust",
    });

    const takeover = createOperatorTakeoverEnvelope({
      escalationBundleId: bundle.bundleId,
      intentId: contract.intentId,
      operatorId: "operator-1",
      authorityId: contract.authoritySource,
      initiatedBy: "system",
      takeoverScope: [contract.action],
      takeoverReason: "operator takeover for trust review",
    });

    const constitutionalContract = createInvariantContract();
    const config = createConstitutionalRuntimeConfig();
    const checks: Record<string, boolean> = {};
    for (const rule of constitutionalContract.rules) {
      checks[rule.invariantId] = true;
    }
    checks["INV-010"] = false;

    const validation = validateConstitutionalRuntime({
      contract: constitutionalContract,
      config,
      context: { intentId: contract.intentId, escalationBundleId: bundle.bundleId },
      checks,
      intentId: contract.intentId,
    });

    expect(validation.blocked).toBe(true);
    expect(validation.violationsFound).toBeGreaterThan(0);
    expect(takeover.envelopeHash).toBeTruthy();
  });

  it("evidence graph links to institutional memory", () => {
    const entry = createOperationalMemoryEntry({
      type: "governance_incident",
      source: "test",
      sequence: 0,
      payload: { incidentId: "incident-001" },
      provenance: { requestId: "req-001" },
    });

    const incident = createGovernanceIncident({
      severity: "error",
      title: "Evidence integrity test",
      description: "Testing evidence-to-memory linkage",
      affectedSubsystem: "evidence",
      reasonCode: "test",
      detectedBy: "system",
      relatedEntryIds: [entry.entryId],
    });

    const node = createEvidenceNode({
      type: "governance_event" as any,
      source: "test",
      payload: { incidentId: incident.incidentId, entryId: entry.entryId },
      provenance: { requestId: "req-001" },
      lineageTags: [incident.incidentId],
    });

    expect(node.lineageTags).toContain(incident.incidentId);
    expect(incident.relatedEntryIds).toContain(entry.entryId);
  });

  it("economics engine integrates with degraded states", () => {
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const score = calculateCapabilityEconomicsScore({
      candidateId: "degraded-candidate",
      candidateClass: "remote_worker",
      trustLevel: "observed",
      attestationRequired: true,
      operatorReviewRequired: true,
      attestationFresh: false,
      conflictDetected: false,
      revoked: false,
      computeBase: 2.0,
      degradedStates: [
        { category: "routing", reasonCode: "no_candidate", severity: "warning" },
        { category: "trust", reasonCode: "attestation_missing", severity: "error" },
      ],
      policyComplexity: 3,
      currentReliability: 0.8,
      decayRate: 0.05,
      lastAttestedAt: oneHourAgo,
    });

    expect(score.degradedPenalties).toHaveLength(2);
    expect(score.trustCost.operatorReviewCost).toBe(0.7);
    expect(score.totalScore).toBeGreaterThan(0);
  });
});
