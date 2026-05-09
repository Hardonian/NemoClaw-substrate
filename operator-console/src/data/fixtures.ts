import type {
  DegradedState,
  ExecutionReceipt,
  OperationalEvent,
  WorkerTrustDecision,
  WorkerCapabilityAttestation,
  WorkerIdentity,
  NodeDescriptor,
  ReplayEnvelope,
  HeterogeneousRoutingResult,
  HeterogeneousCandidate,
  SchedulerDryRunResult,
  LocalProbeSummary,
} from "../data/types";

export const T = "2026-05-09T00:00:00.000Z";

export function makeDegradedState(overrides?: Partial<DegradedState>): DegradedState {
  return {
    category: "healthy",
    reason: "ok",
    affectedSubsystem: "test",
    severity: "info",
    reasonCode: "none",
    explanation: "No issues detected.",
    sourceComponent: "test",
    timestamp: T,
    ...overrides,
  };
}

export function makeExecutionReceipt(overrides?: Partial<ExecutionReceipt>): ExecutionReceipt {
  return {
    version: "1",
    receiptId: "receipt-001",
    requestId: "req-001",
    createdAt: T,
    phases: [
      { phase: "received", at: T, notes: "control_request" },
      { phase: "policy", at: T, notes: "policy_default_allow" },
      { phase: "scheduling", at: T, notes: "node-a:local" },
      { phase: "completed", at: T },
    ],
    nodeId: "node-a",
    modelId: "nvidia/model",
    schedulingDecision: {
      selected: { nodeId: "node-a", modelId: "nvidia/model", score: 100, reasons: [{ code: "local_default", explanation: "Local node selected", source: "scheduler" }] },
      rejected: [],
      reasons: [{ code: "local_default", explanation: "Local node selected", source: "scheduler" }],
    },
    policyDecision: {
      allowed: true,
      requiredApproval: false,
      reasons: [{ code: "policy_default_allow", explanation: "Default allow policy", source: "default" }],
    },
    degradedEvents: [],
    fallbackAttempts: [],
    toolInvocations: [],
    timing: { totalMs: 120, queueMs: 10, executionMs: 110 },
    provenance: { source: "test", lineage: ["chat"], replayVersion: "1" },
    operatorOverrides: [],
    ...overrides,
  };
}

export function makeOperationalEvent(overrides?: Partial<OperationalEvent>): OperationalEvent {
  return {
    eventId: "op-001",
    occurredAt: T,
    sequence: 0,
    category: "receipt",
    source: "test",
    provenance: { requestId: "req-001", receiptId: "receipt-001" },
    payload: {},
    ...overrides,
  };
}

export function makeReplayEnvelope(overrides?: Partial<ReplayEnvelope>): ReplayEnvelope {
  return {
    version: "1",
    exportedAt: T,
    eventCount: 0,
    events: [],
    digest: "",
    ...overrides,
  };
}

export function makeWorkerTrustDecision(overrides?: Partial<WorkerTrustDecision>): WorkerTrustDecision {
  return {
    workerId: "worker-001",
    trustLevel: "unknown",
    eligibleForRemoteExecution: false,
    attestationStatus: "none",
    reasonCodes: ["trust_unknown"],
    decidedAt: T,
    ...overrides,
  };
}

export function makeWorkerAttestation(overrides?: Partial<WorkerCapabilityAttestation>): WorkerCapabilityAttestation {
  return {
    attestationId: "att-001",
    workerId: "worker-001",
    status: "none",
    source: "self_reported",
    stale: false,
    conflict: false,
    reasonCodes: ["attestation_missing"],
    provenance: { sourceRef: "test", claimIds: [] },
    ...overrides,
  };
}

export function makeWorkerIdentity(overrides?: Partial<WorkerIdentity>): WorkerIdentity {
  return {
    workerId: "worker-001",
    safeLabel: "worker-001",
    ...overrides,
  };
}

export function makeNodeDescriptor(nodeId: string, overrides?: Partial<NodeDescriptor>): NodeDescriptor {
  return {
    version: "1",
    nodeId,
    role: "local",
    transport: "unix",
    endpoint: "local:///sandbox",
    trustClass: "trusted",
    registeredAt: T,
    lastHeartbeatAt: T,
    health: "healthy",
    metadata: {},
    capabilities: {
      version: "1",
      capturedAt: T,
      source: "test",
      runtimeBackend: "openai-compatible",
      executionMode: "local",
      gpus: [{ vendor: "nvidia", model: "L40S", vramMb: 48000, count: 1 }],
      models: [{
        modelId: "nvidia/model",
        maxContextTokens: 128000,
        flags: { streaming: true, tools: true, batch: false, multimodal: false, quantization: true },
        inferenceConstraints: [],
        executionRestrictions: [],
      }],
      policyTags: [],
      reliabilityTags: [],
      runtimeTags: [],
      transportRequirements: [],
    },
    ...overrides,
  };
}

export function makeHeterogeneousCandidate(overrides?: Partial<HeterogeneousCandidate>): HeterogeneousCandidate {
  return {
    candidateId: "local:openai:nvidia/model",
    kind: "local_provider",
    identity: "openai/nvidia/model",
    capabilitySnapshotRef: "provider-request",
    policyEligibility: "allow",
    degradedStates: [],
    telemetryConfidence: "high",
    executionMode: "local",
    reasonCodes: ["local_default"],
    score: 100,
    status: "eligible",
    ...overrides,
  };
}

export function makeHeterogeneousRoutingResult(overrides?: Partial<HeterogeneousRoutingResult>): HeterogeneousRoutingResult {
  return {
    provider: "openai",
    model: "nvidia/model",
    selectedCandidate: makeHeterogeneousCandidate(),
    excludedCandidates: [],
    allCandidates: [makeHeterogeneousCandidate()],
    receipt: makeExecutionReceipt(),
    events: [],
    ...overrides,
  };
}

export function makeSchedulerDryRunResult(overrides?: Partial<SchedulerDryRunResult>): SchedulerDryRunResult {
  return {
    requestId: "req-001",
    selectedCandidate: "node-a:nvidia/model",
    excludedCandidates: [],
    policyResult: "allow",
    degradedStates: [],
    receipt: makeExecutionReceipt(),
    events: [],
    noExecution: true,
    ...overrides,
  };
}

export function makeLocalProbeSummary(overrides?: Partial<LocalProbeSummary>): LocalProbeSummary {
  return {
    outcomes: [{ probe: "provider-metadata", state: "healthy", detail: "provider=openai" }],
    degradedStates: [],
    telemetryAvailable: true,
    telemetry: {
      capturedAt: T,
      runtimeHealth: { state: "observed", value: "healthy", observedAt: T },
      backendVersion: { state: "observed", value: "1.0.0", observedAt: T },
      modelInventory: { state: "observed", value: ["nvidia/model"], observedAt: T },
      gpus: { state: "observed", observedAt: T, value: [{ vendor: "nvidia", model: "L40S", vramMb: 48000, uuid: "gpu-001" }] },
      runtimeMetrics: {},
    },
    receipt: makeExecutionReceipt(),
    events: [],
    ...overrides,
  };
}

export const sampleDegradedStates: DegradedState[] = [
  makeDegradedState(),
  makeDegradedState({ category: "constrained", reason: "limited resources", affectedSubsystem: "gpu", severity: "warning", reasonCode: "capability_missing", explanation: "GPU memory below threshold.", sourceComponent: "scheduler", recoverySuggestion: "Free GPU memory or add capacity." }),
  makeDegradedState({ category: "degraded", reason: "slow response", affectedSubsystem: "provider", severity: "warning", reasonCode: "transport_unreachable", explanation: "Provider response time exceeded SLA.", sourceComponent: "runtime" }),
  makeDegradedState({ category: "unavailable", reason: "node offline", affectedSubsystem: "remote-worker", severity: "error", reasonCode: "node_missing", explanation: "Remote worker node not responding.", sourceComponent: "device-registry" }),
  makeDegradedState({ category: "unknown", reason: "insufficient data", affectedSubsystem: "trust", severity: "warning", reasonCode: "unknown_error", explanation: "Trust assessment could not be completed.", sourceComponent: "worker-trust" }),
  makeDegradedState({ category: "stale", reason: "heartbeat overdue", affectedSubsystem: "registry", severity: "warning", reasonCode: "heartbeat_stale", explanation: "Node heartbeat exceeded stale threshold.", sourceComponent: "device-registry" }),
  makeDegradedState({ category: "approval_blocked", reason: "awaiting approval", affectedSubsystem: "policy", severity: "warning", reasonCode: "approval_required", explanation: "Execution blocked pending operator approval.", sourceComponent: "governance" }),
  makeDegradedState({ category: "unreachable", reason: "network unreachable", affectedSubsystem: "transport", severity: "error", reasonCode: "transport_unreachable", explanation: "Network path to node is unreachable.", sourceComponent: "network" }),
  makeDegradedState({ category: "partial_capability", reason: "missing tools", affectedSubsystem: "runtime", severity: "info", reasonCode: "capability_missing", explanation: "Tool execution not available.", sourceComponent: "runtime" }),
];

export const sampleReceipts: ExecutionReceipt[] = [
  makeExecutionReceipt({
    receiptId: "receipt-001",
    requestId: "req-001",
    nodeId: "node-a",
    modelId: "nvidia/model",
    phases: [
      { phase: "received", at: T, notes: "control_request" },
      { phase: "policy", at: T, notes: "policy_default_allow" },
      { phase: "scheduling", at: T, notes: "node-a:local" },
      { phase: "completed", at: T },
    ],
    timing: { totalMs: 120, queueMs: 10, executionMs: 110 },
  }),
  makeExecutionReceipt({
    receiptId: "receipt-002",
    requestId: "req-002",
    nodeId: "remote-worker-1",
    modelId: "nvidia/model",
    phases: [
      { phase: "received", at: T, notes: "control_request" },
      { phase: "policy", at: T, notes: "policy_rule_allow" },
      { phase: "scheduling", at: T, notes: "remote-worker-1:remote" },
      { phase: "execution", at: T, notes: "remote_dispatch" },
      { phase: "failed", at: T, notes: "remote_timeout" },
    ],
    degradedEvents: [
      makeDegradedState({ category: "degraded", reason: "remote timeout", affectedSubsystem: "remote-execution", severity: "error", reasonCode: "transport_unreachable", explanation: "Remote execution timed out.", sourceComponent: "remote-execution" }),
    ],
    fallbackAttempts: [{ at: T, reason: "remote_timeout", target: "openai/nvidia/model" }],
    timing: { totalMs: 30500, queueMs: 5, executionMs: 30495 },
  }),
  makeExecutionReceipt({
    receiptId: "receipt-003",
    requestId: "req-003",
    phases: [
      { phase: "received", at: T, notes: "control_request" },
      { phase: "policy", at: T, notes: "policy_rule_approval_required" },
      { phase: "failed", at: T, notes: "approval_required" },
    ],
    policyDecision: {
      allowed: true,
      requiredApproval: true,
      reasons: [{ code: "policy_rule_approval_required", explanation: "High-risk action requires approval.", source: "policy-rule-1" }],
    },
    degradedEvents: [
      makeDegradedState({ category: "approval_blocked", reason: "awaiting operator approval", affectedSubsystem: "governance", severity: "warning", reasonCode: "approval_required", explanation: "Request blocked pending operator approval.", sourceComponent: "governance" }),
    ],
    operatorOverrides: [{ at: T, actor: "admin@example.com", reason: "Approved for urgent request" }],
    timing: { totalMs: 45000 },
  }),
];

export const sampleEvents: OperationalEvent[] = [
  makeOperationalEvent({ eventId: "op-001", sequence: 0, category: "receipt", provenance: { requestId: "req-001", receiptId: "receipt-001" }, payload: { receiptId: "receipt-001" } }),
  makeOperationalEvent({ eventId: "op-002", sequence: 1, category: "policy_outcome", provenance: { requestId: "req-001", receiptId: "receipt-001" }, payload: { policyDecision: { allowed: true, requiredApproval: false } } }),
  makeOperationalEvent({ eventId: "op-003", sequence: 2, category: "scheduler_outcome", provenance: { requestId: "req-001", receiptId: "receipt-001" }, payload: { selected: "node-a" } }),
  makeOperationalEvent({ eventId: "op-004", sequence: 3, category: "degraded_state", provenance: { requestId: "req-002", receiptId: "receipt-002" }, payload: { degraded: { reasonCode: "transport_unreachable" } } }),
  makeOperationalEvent({ eventId: "op-005", sequence: 4, category: "fallback", provenance: { requestId: "req-002", receiptId: "receipt-002" }, payload: { fallback: { reason: "remote_timeout" } } }),
  makeOperationalEvent({ eventId: "op-006", sequence: 5, category: "operator_override", provenance: { requestId: "req-003", receiptId: "receipt-003", actor: "admin@example.com" }, payload: { override: { actor: "admin@example.com", reason: "Approved" } } }),
  makeOperationalEvent({ eventId: "op-007", sequence: 6, category: "telemetry_probe_started", provenance: { requestId: "req-001" }, payload: { sourceRuntime: "openai" } }),
  makeOperationalEvent({ eventId: "op-008", sequence: 7, category: "telemetry_probe_succeeded", provenance: { requestId: "req-001" }, payload: { confidence: "medium" } }),
  makeOperationalEvent({ eventId: "op-009", sequence: 8, category: "telemetry_unavailable", provenance: { requestId: "req-002" }, payload: { reasonCode: "nvidia_smi_unavailable" } }),
  makeOperationalEvent({ eventId: "op-010", sequence: 9, category: "worker_trust_elevated", provenance: { requestId: "req-001" }, payload: { workerId: "worker-001", trustLevel: "trusted_local" } }),
];

export const sampleWorkerIdentities: WorkerIdentity[] = [
  makeWorkerIdentity({ workerId: "worker-001", safeLabel: "worker-001@10.0.0.5", provider: "nvidia", endpoint: "https://10.0.0.5:8080" }),
  makeWorkerIdentity({ workerId: "worker-002", safeLabel: "worker-002@10.0.0.6", provider: "openai", endpoint: "https://10.0.0.6:8080" }),
  makeWorkerIdentity({ workerId: "worker-003", safeLabel: "worker-003@edge-node" }),
];

export const sampleWorkerTrustDecisions: WorkerTrustDecision[] = [
  makeWorkerTrustDecision({ workerId: "worker-001", trustLevel: "trusted_local", eligibleForRemoteExecution: true, attestationStatus: "operator_approved", reasonCodes: ["operator_approved"], decidedAt: T }),
  makeWorkerTrustDecision({ workerId: "worker-002", trustLevel: "observed", eligibleForRemoteExecution: false, attestationStatus: "probe_observed", reasonCodes: ["probe_observed_requires_approval"], decidedAt: T }),
  makeWorkerTrustDecision({ workerId: "worker-003", trustLevel: "unknown", eligibleForRemoteExecution: false, attestationStatus: "none", reasonCodes: ["attestation_missing"], decidedAt: T }),
  makeWorkerTrustDecision({ workerId: "worker-004", trustLevel: "untrusted", eligibleForRemoteExecution: false, attestationStatus: "conflict_detected", reasonCodes: ["attestation_conflict"], decidedAt: T }),
];

export const sampleWorkerAttestations: WorkerCapabilityAttestation[] = [
  makeWorkerAttestation({ attestationId: "att-001", workerId: "worker-001", status: "operator_approved", lastAttestedAt: T, source: "operator_approved", stale: false, conflict: false, reasonCodes: [], provenance: { sourceRef: "manual-approval", claimIds: ["claim-001"] } }),
  makeWorkerAttestation({ attestationId: "att-002", workerId: "worker-002", status: "probe_observed", lastAttestedAt: T, source: "probe_observed", stale: false, conflict: false, reasonCodes: ["probe_observed_requires_approval"], provenance: { sourceRef: "probe-002", claimIds: ["claim-002"] } }),
  makeWorkerAttestation({ attestationId: "att-003", workerId: "worker-003", status: "none", source: "self_reported", stale: false, conflict: false, reasonCodes: ["attestation_missing"], provenance: { sourceRef: "self-report", claimIds: [] } }),
  makeWorkerAttestation({ attestationId: "att-004", workerId: "worker-004", status: "conflict_detected", lastAttestedAt: T, source: "probe_observed", stale: false, conflict: true, reasonCodes: ["attestation_conflict"], provenance: { sourceRef: "probe-004", claimIds: ["claim-004a", "claim-004b"] } }),
];

export const sampleNodes: NodeDescriptor[] = [
  makeNodeDescriptor("node-a", { role: "local", health: "healthy" }),
  makeNodeDescriptor("node-b", { role: "remote", health: "healthy", trustClass: "trusted" }),
  makeNodeDescriptor("node-c", { role: "remote", health: "stale", trustClass: "restricted" }),
  makeNodeDescriptor("node-d", { role: "edge", health: "unreachable", trustClass: "untrusted" }),
];

export const sampleRoutingResult: HeterogeneousRoutingResult = makeHeterogeneousRoutingResult({
  provider: "openai",
  model: "nvidia/model",
  selectedCandidate: makeHeterogeneousCandidate(),
  excludedCandidates: [
    makeHeterogeneousCandidate({ candidateId: "remote:node-c:nvidia/model", kind: "remote_worker", identity: "node-c", capabilitySnapshotRef: "node-c@ts", policyEligibility: "approval_required", degradedStates: ["stale"], telemetryConfidence: "low", executionMode: "remote", reasonCodes: ["excluded"], score: 120, status: "excluded" }),
    makeHeterogeneousCandidate({ candidateId: "remote:node-d:nvidia/model", kind: "remote_worker", identity: "node-d", capabilitySnapshotRef: "node-d@ts", policyEligibility: "deny", degradedStates: ["unreachable"], telemetryConfidence: "low", executionMode: "remote", reasonCodes: ["excluded"], score: 120, status: "excluded" }),
  ],
  allCandidates: [
    makeHeterogeneousCandidate(),
    makeHeterogeneousCandidate({ candidateId: "remote:node-c:nvidia/model", kind: "remote_worker", identity: "node-c", capabilitySnapshotRef: "node-c@ts", policyEligibility: "approval_required", degradedStates: ["stale"], telemetryConfidence: "low", executionMode: "remote", reasonCodes: ["excluded"], score: 120, status: "excluded" }),
    makeHeterogeneousCandidate({ candidateId: "remote:node-d:nvidia/model", kind: "remote_worker", identity: "node-d", capabilitySnapshotRef: "node-d@ts", policyEligibility: "deny", degradedStates: ["unreachable"], telemetryConfidence: "low", executionMode: "remote", reasonCodes: ["excluded"], score: 120, status: "excluded" }),
  ],
});

export const sampleDryRunResult: SchedulerDryRunResult = makeSchedulerDryRunResult();

export const sampleProbeSummary: LocalProbeSummary = makeLocalProbeSummary({
  outcomes: [
    { probe: "provider-metadata", state: "healthy", detail: "provider=openai" },
    { probe: "command-availability", state: "healthy", detail: "commands=3" },
    { probe: "gpu-nvidia-smi", state: "healthy", detail: "observed" },
    { probe: "gpu-rocm", state: "unavailable", detail: "not implemented" },
  ],
});

export const validReplayEnvelope: ReplayEnvelope = {
  version: "1",
  exportedAt: T,
  eventCount: sampleEvents.length,
  events: sampleEvents,
  digest: "sample-digest",
};

export const emptyReplayEnvelope: ReplayEnvelope = {
  version: "1",
  exportedAt: T,
  eventCount: 0,
  events: [],
  digest: "",
};

export const invalidReplayEnvelope: ReplayEnvelope = {
  version: "1",
  exportedAt: T,
  eventCount: 99,
  events: [],
  digest: "wrong-digest",
};
