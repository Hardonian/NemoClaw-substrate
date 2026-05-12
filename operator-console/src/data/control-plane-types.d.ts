// Type declarations for control-plane types used by operator-console.
// These mirror the types in src/lib/control-plane/ to avoid importing
// implementation files that have pre-existing type errors.

export type DegradedCategory =
  | "healthy"
  | "constrained"
  | "degraded"
  | "unavailable"
  | "partial_capability"
  | "approval_blocked"
  | "stale"
  | "unreachable"
  | "unknown";

export type DegradedReasonCode =
  | "none"
  | "node_missing"
  | "heartbeat_stale"
  | "capability_missing"
  | "transport_unreachable"
  | "policy_blocked"
  | "approval_required"
  | "constraint_unsatisfied"
  | "unknown_error";

export interface DegradedState {
  category: DegradedCategory;
  reason: string;
  affectedSubsystem: string;
  severity: "info" | "warning" | "error" | "critical";
  reasonCode: DegradedReasonCode;
  explanation: string;
  sourceComponent: string;
  timestamp: string;
  recoverySuggestion?: string;
}

export type NodeRole = "local" | "remote" | "edge" | "control";
export type NodeTransport = "unix" | "http" | "https" | "grpc" | "ssh" | "unknown";
export type DeviceHealthStatus = "healthy" | "stale" | "unreachable" | "unknown";
export type WorkerTrustLevel = "unknown" | "untrusted" | "observed" | "trusted_local" | "trusted_remote" | "revoked";
export type WorkerAttestationStatus = "none" | "self_reported" | "probe_observed" | "operator_approved" | "expired" | "revoked" | "conflict_detected";
export type WorkerTrustReasonCode =
  | "trust_unknown"
  | "self_reported_not_sufficient"
  | "probe_observed_requires_approval"
  | "operator_approved"
  | "policy_denied"
  | "worker_revoked"
  | "attestation_expired"
  | "attestation_conflict"
  | "attestation_missing";

export interface WorkerIdentity {
  workerId: string;
  safeLabel: string;
  provider?: string;
  endpoint?: string;
}

export interface WorkerCapabilityClaim {
  claimId: string;
  workerId: string;
  claimedAt: string;
  source: "self_reported" | "probe_observed" | "operator_approved";
  capabilities: Pick<CapabilitySnapshot, "runtimeBackend" | "executionMode" | "models" | "gpus">;
  provenance: { sourceRef: string; requestId?: string; receiptId?: string };
}

export interface WorkerCapabilityAttestation {
  attestationId: string;
  workerId: string;
  status: WorkerAttestationStatus;
  lastAttestedAt?: string;
  source: "self_reported" | "probe_observed" | "operator_approved";
  stale: boolean;
  conflict: boolean;
  reasonCodes: WorkerTrustReasonCode[];
  provenance: { sourceRef: string; claimIds: string[] };
}

export interface WorkerTrustDecision {
  workerId: string;
  trustLevel: WorkerTrustLevel;
  eligibleForRemoteExecution: boolean;
  attestationStatus: WorkerAttestationStatus;
  reasonCodes: WorkerTrustReasonCode[];
  decidedAt: string;
}

export interface GpuCapability {
  vendor: string;
  model: string;
  vramMb: number;
  count: number;
  computeCapability?: string;
  quantizationSupport?: string[];
}

export interface RuntimeCapabilityFlags {
  streaming: boolean;
  tools: boolean;
  batch: boolean;
  multimodal: boolean;
  quantization: boolean;
}

export interface ModelCapability {
  modelId: string;
  maxContextTokens: number;
  flags: RuntimeCapabilityFlags;
  inferenceConstraints: string[];
  executionRestrictions: string[];
}

export interface CapabilitySnapshot {
  version: string;
  capturedAt: string;
  source: string;
  runtimeBackend: string;
  executionMode: "local" | "remote";
  gpus: GpuCapability[];
  models: ModelCapability[];
  policyTags: string[];
  reliabilityTags: string[];
  runtimeTags: string[];
  transportRequirements: string[];
}

export interface NodeDescriptor {
  version: string;
  nodeId: string;
  role: NodeRole;
  transport: NodeTransport;
  endpoint: string;
  trustClass: "trusted" | "untrusted" | "restricted";
  registeredAt: string;
  lastHeartbeatAt: string;
  health: DeviceHealthStatus;
  metadata: Record<string, string | number | boolean>;
  capabilities: CapabilitySnapshot;
  workerIdentity?: WorkerIdentity;
  workerTrustLevel?: WorkerTrustLevel;
  workerAttestationStatus?: WorkerAttestationStatus;
  workerLastAttestedAt?: string;
  workerAttestationSource?: string;
  workerTrustReasonCodes?: WorkerTrustReasonCode[];
  workerCapabilityClaimProvenance?: { sourceRef: string; claimIds: string[] };
}

export interface ControlRequestEnvelope {
  version: string;
  requestId: string;
  receivedAt: string;
  source: string;
  actor: string;
  action: string;
  requestedModel?: string;
  constraints: string[];
  metadata: Record<string, string>;
}

export interface ControlDecisionReason { code: string; explanation: string; source: string; }
export interface SchedulingCandidate { nodeId: string; modelId: string; score: number; reasons: ControlDecisionReason[]; }
export interface SchedulingDecision { selected?: SchedulingCandidate; rejected: SchedulingCandidate[]; reasons: ControlDecisionReason[]; }
export interface PolicyDecisionReason { code: string; explanation: string; source: string; }
export interface PolicyDecision { allowed: boolean; reasons: PolicyDecisionReason[]; requiredApproval: boolean; }
export interface ControlDecision {
  version: string;
  requestId: string;
  decidedAt: string;
  scheduling: SchedulingDecision;
  policy: PolicyDecision;
  degradedStates: DegradedState[];
}

export type ExecutionPhase = "received" | "policy" | "scheduling" | "execution" | "completed" | "failed";

export interface ExecutionReceipt {
  version: string;
  receiptId: string;
  requestId: string;
  createdAt: string;
  phases: Array<{ phase: ExecutionPhase; at: string; notes?: string }>;
  nodeId?: string;
  modelId?: string;
  schedulingDecision?: SchedulingDecision;
  policyDecision?: PolicyDecision;
  degradedEvents: DegradedState[];
  fallbackAttempts: Array<{ at: string; reason: string; target?: string }>;
  toolInvocations: Array<{ name: string; at: string; durationMs?: number; status: "ok" | "failed" }>;
  timing: { totalMs?: number; queueMs?: number; executionMs?: number };
  provenance: { source: string; lineage: string[]; replayVersion: string; exportedAt?: string };
  operatorOverrides: Array<{ at: string; actor: string; reason: string }>;
}

export type OperationalEventCategory =
  | "receipt" | "policy_outcome" | "degraded" | "degraded_state"
  | "scheduler_outcome" | "operator_override" | "runtime_action"
  | "telemetry_probe_started" | "telemetry_probe_succeeded" | "telemetry_probe_failed"
  | "telemetry_parse_succeeded" | "telemetry_parse_partial" | "telemetry_parse_failed"
  | "telemetry_unavailable" | "telemetry_stale" | "telemetry_conflict_detected"
  | "telemetry_registry_update_applied" | "telemetry_registry_update_skipped"
  | "worker_identity_observed" | "capability_claim_recorded"
  | "capability_attestation_observed" | "capability_attestation_conflict"
  | "worker_trust_elevated" | "worker_trust_denied" | "worker_trust_revoked"
  | "worker_attestation_expired" | "diagnostics_snapshot" | "replay_metadata";

export interface OperationalEvent {
  eventId: string;
  occurredAt: string;
  sequence: number;
  category: OperationalEventCategory;
  source: string;
  provenance: { requestId?: string; receiptId?: string; sandboxName?: string; actor?: string };
  replayRef?: { lineage: string[]; replayVersion: string };
  payload: Record<string, unknown>;
}

export interface OperationalMemoryStore {
  append(event: OperationalEvent): void;
  list(): OperationalEvent[];
  clear(): void;
}

export class InMemoryOperationalStore implements OperationalMemoryStore {
  append(event: OperationalEvent): void;
  list(): OperationalEvent[];
  clear(): void;
}

export class OperationalMemoryLog {
  append(input: Omit<OperationalEvent, "eventId" | "sequence">): OperationalEvent;
  list(): OperationalEvent[];
}

export interface ReplayEnvelope {
  version: "1";
  exportedAt: string;
  eventCount: number;
  events: OperationalEvent[];
  digest: string;
}

export function buildReplayEnvelope(events: OperationalEvent[], exportedAt: string): ReplayEnvelope;
export function validateReplayEnvelope(envelope: ReplayEnvelope): { ok: boolean; reasons: string[] };

export function summarizePolicyOutcomes(events: OperationalEvent[]): Record<string, number>;
export function summarizeDegradedTimeline(events: OperationalEvent[]): string[];
export function summarizeFallbackFrequency(events: OperationalEvent[]): Record<string, number>;
export function summarizeStaleNodes(nodes: NodeDescriptor[], now: string, staleAfterMs?: number): string[];
export function summarizeTelemetryEventCounts(events: OperationalEvent[]): Record<string, number>;
export function summarizeTelemetryDimensions(events: OperationalEvent[]): { confidence: Record<string, number>; source: Record<string, number> };

export type PolicyEffect = "allow" | "deny" | "approval_required";
export type PolicyReasonCode =
  | "policy_default_allow"
  | "policy_default_deny"
  | "policy_rule_allow"
  | "policy_rule_deny"
  | "policy_rule_approval_required";

export interface PolicyRule {
  id: string;
  order: number;
  description: string;
  effect: PolicyEffect;
  matches: (context: PolicyEvaluationContext) => boolean;
  reasonCode: PolicyReasonCode;
}

export interface PolicyBundle {
  id: string;
  version: string;
  defaultEffect: Exclude<PolicyEffect, "approval_required">;
  rules: PolicyRule[];
}

export interface PolicyEvaluationContext {
  request: ControlRequestEnvelope;
  nodeId?: string;
  modelId?: string;
  actionClass: string;
}

export interface PolicyEvaluationResult {
  decision: PolicyEffect;
  allowed: boolean;
  requiredApproval: boolean;
  reasonCode: PolicyReasonCode;
  sourceRuleId: string;
  matchedRuleDescription: string;
  matchedRuleIds: string[];
}

export type CandidateKind = "local_provider" | "remote_worker";
export type CandidateStatus = "eligible" | "excluded";

export interface HeterogeneousCandidate {
  candidateId: string;
  kind: CandidateKind;
  identity: string;
  capabilitySnapshotRef: string;
  policyEligibility: "allow" | "deny" | "approval_required";
  degradedStates: string[];
  telemetryConfidence: "high" | "medium" | "low";
  executionMode: "local" | "remote";
  reasonCodes: string[];
  score: number;
  status: CandidateStatus;
}

export interface HeterogeneousRoutingResult {
  provider: string;
  model: string;
  selectedCandidate?: HeterogeneousCandidate;
  excludedCandidates: HeterogeneousCandidate[];
  allCandidates: HeterogeneousCandidate[];
  receipt: ExecutionReceipt;
  events: OperationalEvent[];
  remoteStatus?: string;
}

export function summarizeHeterogeneousDiagnostics(input: { routing: { enabled: boolean; source: string }; governedEnabled: boolean; remote: { enabled: boolean; source: string }; result?: HeterogeneousRoutingResult }): string[];

export type PolicyCandidateReason = "repeated_deny" | "repeated_override" | "repeated_degraded" | "repeated_fallback";

export interface PolicyCandidate {
  key: string;
  reason: PolicyCandidateReason;
  eventIds: string[];
  count: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface PolicyPromotionProposal {
  proposalId: string;
  candidate: PolicyCandidate;
  status: "review_required";
  reviewer?: string;
  notes: string;
}

export type DispatchStatus = "ok" | "blocked" | "degraded";

export interface DispatchIntegrationResult<T> {
  status: DispatchStatus;
  result?: T;
  error?: string;
  events: OperationalEvent[];
  receiptId?: string;
  diagnostics: string[];
}

export function buildWorkerIdentity(input: { workerId: string; endpoint?: string; provider?: string }): WorkerIdentity;
export function createCapabilityClaimFromProbe(input: { claimId: string; workerId: string; claimedAt: string; sourceRef: string; capabilities: CapabilitySnapshot; requestId?: string; receiptId?: string }): WorkerCapabilityClaim;
export function compareClaims(claimed: WorkerCapabilityClaim, observed: WorkerCapabilityClaim): { conflicts: string[] };
export function markAttestationStatus(input: { workerId: string; nowIso: string; claim: WorkerCapabilityClaim; observed?: WorkerCapabilityClaim; maxAgeMs: number }): WorkerCapabilityAttestation;
export function decideWorkerTrust(input: { workerId: string; nowIso: string; attestation: WorkerCapabilityAttestation; policyAllowsElevation: boolean; revoked?: boolean; requireFreshAttestation?: boolean }): WorkerTrustDecision;

export interface HealthSummary {
  total: number;
  byHealth: Record<DeviceHealthStatus, number>;
  staleNodes: string[];
}

export class DeviceRegistry {
  registerNode(node: NodeDescriptor): void;
  removeNode(nodeId: string): boolean;
  updateHeartbeat(nodeId: string, timestamp: string): { ok: boolean; reasonCode?: DegradedReasonCode };
  updateCapabilities(nodeId: string, updater: NodeDescriptor["capabilities"]): { ok: boolean; reasonCode?: DegradedReasonCode };
  getNode(nodeId: string): NodeDescriptor | null;
  listNodes(): NodeDescriptor[];
  list(): NodeDescriptor[];
  register(node: NodeDescriptor): void;
  summarizeHealth(nowIso: string, staleAfterMs: number): HealthSummary;
}

export interface SchedulerDryRunResult {
  requestId: string;
  selectedCandidate?: string;
  excludedCandidates: string[];
  policyResult: string;
  degradedStates: DegradedState[];
  receipt: ExecutionReceipt;
  events: OperationalEvent[];
  noExecution: true;
}

export type LocalProbeType = "provider-metadata" | "command-availability" | "ollama-http" | "vllm-http" | "llamacpp-http" | "nim-http" | "gpu-nvidia-smi" | "gpu-rocm";

export interface ProbeOutcome {
  probe: LocalProbeType;
  state: "healthy" | "degraded" | "unavailable";
  detail: string;
  degradedState?: DegradedState;
}

export interface ProbeTelemetrySnapshot {
  capturedAt: string;
  runtimeHealth: { state: string; value?: string; observedAt?: string; reason?: string };
  backendVersion: { state: string; value?: string; observedAt?: string; reason?: string };
  modelInventory: { state: string; value?: string[]; observedAt?: string; reason?: string };
  gpus: { state: string; observedAt?: string; value?: Array<{ vendor: string; model: string; vramMb: number; uuid: string }>; reason?: string };
  runtimeMetrics: Record<string, unknown>;
}

export interface LocalProbeSummary {
  outcomes: ProbeOutcome[];
  degradedStates: DegradedState[];
  telemetryAvailable: boolean;
  telemetry: ProbeTelemetrySnapshot;
  receipt: ExecutionReceipt;
  events: OperationalEvent[];
}

export function summarizeLocalDiagnostics(input: {
  probeSummary: LocalProbeSummary;
  registry: DeviceRegistry;
  governedRouting: { enabled: boolean; source: string };
  dryRun?: SchedulerDryRunResult;
}): string[];
