// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export {
  auditRedaction,
  assertPayloadRedacted,
  redactionSummary,
} from "./redaction-audit";
export type { RedactionFinding, RedactionAuditResult } from "./redaction-audit";

export {
  classifyData,
  checkExportBoundary,
  isExportSafe,
  safeExport,
} from "./export-boundary";
export type {
  DataClassification,
  ExportPolicy,
  ExportBoundaryResult,
} from "./export-boundary";
export { DEFAULT_EXPORT_POLICY } from "./export-boundary";

export {
  checkEnvironmentSafety,
  isEnvironmentSafe,
  environmentSafetySummary,
} from "./environment-safety";
export type {
  FilePermissionCheck,
  NetworkExposureCheck,
  EnvironmentSafetyReport,
  EnvironmentSafetyOptions,
} from "./environment-safety";

export {
  validateTlsVersion,
  isCipherSuiteWeak,
  analyzeCipherSuite,
  validateTransportSafety,
  verifyCertificatePin,
  isTransportSafe,
  transportSafetySummary,
} from "./transport-safety";
export type {
  TlsValidationResult,
  CipherSuiteInfo,
  CertificatePin,
  TransportSafetyConfig,
} from "./transport-safety";
export { DEFAULT_TRANSPORT_SAFETY_CONFIG } from "./transport-safety";

export {
  sanitizeFixture,
  fixtureHasSecrets,
  sanitizeAndValidate,
  maskInlineValue,
} from "./fixture-sanitizer";
export type {
  FixtureSanitizerResult,
  FixtureSanitizerOptions,
} from "./fixture-sanitizer";

export {
  checkAccess,
  computeIntegrityHash,
  validateIntegrity,
  encryptAtRest,
  decryptAtRest,
  generateAesKey,
  canRead,
  canWrite,
  canAdmin,
} from "./proofpack-access";
export type {
  AccessLevel,
  AccessControlRule,
  AccessCheckResult,
  IntegrityCheckResult,
  ProofpackAccessConfig,
} from "./proofpack-access";
export { DEFAULT_PROOFPACK_CONFIG } from "./proofpack-access";

export {
  hashCredential,
} from "./credential-hash";
export {
  isCredentialField,
  isConfigValue,
  stripCredentials,
  sanitizeConfigFile,
  isSensitiveFile,
  CREDENTIAL_SENSITIVE_BASENAMES,
} from "./credential-filter";
export type { ConfigValue, ConfigObject } from "./credential-filter";
export {
  redact,
  redactFull,
  redactSensitiveText,
  redactError,
  writeRedactedResult,
  redactUrl,
} from "./redact";
export {
  TOKEN_PREFIX_PATTERNS,
  CONTEXT_PATTERNS,
  SECRET_PATTERNS,
  EXPECTED_SHELL_PREFIXES,
} from "./secret-patterns";

export {
  DEFAULT_SECURITY_POLICY,
  LOCAL_ONLY_SECURITY_POLICY,
  INSECURE_HTTP_TRANSPORT_POLICY,
  normalizeTimeoutMs,
  classifyNetworkHost,
  validateUrlForTransport,
  validateLocalOnlyUrl,
  validateRemoteUrl,
  redactSecurityString,
  redactSecurityPayload,
  payloadContainsSecrets,
  validateCommandDescriptor,
  commandDescriptorFromString,
  validateCommandString,
  buildSafeProofpackManifestMetadata,
  preflightProofpackExportPayload,
} from "./security-policy";
export type {
  SecurityReasonCode,
  SecurityDecision,
  NetworkAddressClass,
  NetworkPolicy,
  TransportPolicy,
  CommandExecutionPolicy,
  SecretRedactionPolicy,
  ProofpackExportPolicy,
  SecurityPolicy,
  UrlSafetyResult,
  CommandDescriptor,
  CommandSafetyResult,
  ProofpackManifestMetadata,
} from "./security-policy";
