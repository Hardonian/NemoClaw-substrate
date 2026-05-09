export type {
  DegradedCategory,
  DegradedReasonCode,
  DegradedState,
  NodeRole,
  NodeTransport,
  DeviceHealthStatus,
  WorkerTrustLevel,
  WorkerAttestationStatus,
  WorkerTrustReasonCode,
  WorkerIdentity,
  WorkerCapabilityClaim,
  WorkerCapabilityAttestation,
  WorkerTrustDecision,
  GpuCapability,
  RuntimeCapabilityFlags,
  ModelCapability,
  CapabilitySnapshot,
  NodeDescriptor,
  ControlRequestEnvelope,
  ControlDecisionReason,
  SchedulingCandidate,
  SchedulingDecision,
  PolicyDecisionReason,
  PolicyDecision,
  ControlDecision,
  ExecutionPhase,
  ExecutionReceipt,
} from "../../../src/lib/control-plane/types";

export type { TaskClassification } from "../../../src/lib/control-plane/task-classification";

export type {
  OperationalEventCategory,
  OperationalEvent,
  OperationalMemoryStore,
  InMemoryOperationalStore,
  OperationalMemoryLog,
} from "../../../src/lib/control-plane/operational-memory";

export type { ReplayEnvelope } from "../../../src/lib/control-plane/replay";
export { buildReplayEnvelope, validateReplayEnvelope } from "../../../src/lib/control-plane/replay";

export {
  summarizePolicyOutcomes,
  summarizeDegradedTimeline,
  summarizeFallbackFrequency,
  summarizeStaleNodes,
  summarizeTelemetryEventCounts,
  summarizeTelemetryDimensions,
} from "../../../src/lib/control-plane/observability";

export type {
  PolicyEffect,
  PolicyReasonCode,
  PolicyRule,
  PolicyBundle,
  PolicyEvaluationContext,
  PolicyEvaluationResult,
} from "../../../src/lib/control-plane/governance";

export type {
  HeterogeneousCandidate,
  HeterogeneousRoutingResult,
} from "../../../src/lib/control-plane/heterogeneous-routing";
export { summarizeHeterogeneousDiagnostics } from "../../../src/lib/control-plane/heterogeneous-routing";

export type {
  PolicyCandidateReason,
  PolicyCandidate,
  PolicyPromotionProposal,
} from "../../../src/lib/control-plane/policy-promotion";

export type {
  DispatchStatus,
  DispatchIntegrationResult,
} from "../../../src/lib/control-plane/runtime-dispatch-integration";

export {
  buildWorkerIdentity,
  createCapabilityClaimFromProbe,
  compareClaims,
  markAttestationStatus,
  decideWorkerTrust,
} from "../../../src/lib/control-plane/worker-trust";

export type { HealthSummary, DeviceRegistry } from "../../../src/lib/control-plane/device-registry";

export type { SchedulerDryRunResult } from "../../../src/lib/control-plane/scheduler-dry-run-bridge";

export type {
  LocalProbeType,
  ProbeOutcome,
  LocalProbeSummary,
} from "../../../src/lib/control-plane/local-runtime-probes";

export { summarizeLocalDiagnostics } from "../../../src/lib/control-plane/local-diagnostics";
