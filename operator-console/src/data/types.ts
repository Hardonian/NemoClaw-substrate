// Re-exports from local type declarations that mirror the control-plane types.
// We use local declarations to avoid importing implementation files that have
// pre-existing type errors in the main project.

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
} from "./control-plane-types";

export type {
  OperationalEventCategory,
  OperationalEvent,
  OperationalMemoryStore,
  InMemoryOperationalStore,
  OperationalMemoryLog,
} from "./control-plane-types";

export type { ReplayEnvelope } from "./control-plane-types";
export { buildReplayEnvelope, validateReplayEnvelope } from "./control-plane-runtime";

export {
  summarizePolicyOutcomes,
  summarizeDegradedTimeline,
  summarizeFallbackFrequency,
  summarizeStaleNodes,
  summarizeTelemetryEventCounts,
  summarizeTelemetryDimensions,
} from "./control-plane-runtime";

export type {
  PolicyEffect,
  PolicyReasonCode,
  PolicyRule,
  PolicyBundle,
  PolicyEvaluationContext,
  PolicyEvaluationResult,
} from "./control-plane-types";

export type {
  HeterogeneousCandidate,
  HeterogeneousRoutingResult,
} from "./control-plane-types";
export { summarizeHeterogeneousDiagnostics } from "./control-plane-runtime";

export type {
  PolicyCandidateReason,
  PolicyCandidate,
  PolicyPromotionProposal,
} from "./control-plane-types";

export type {
  DispatchStatus,
  DispatchIntegrationResult,
} from "./control-plane-types";

export type { HealthSummary, DeviceRegistry } from "./control-plane-types";

export type { SchedulerDryRunResult } from "./control-plane-types";

export type {
  LocalProbeType,
  ProbeOutcome,
  LocalProbeSummary,
} from "./control-plane-types";

export { summarizeLocalDiagnostics } from "./control-plane-runtime";
