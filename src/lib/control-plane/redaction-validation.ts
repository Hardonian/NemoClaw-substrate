// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Redaction validation layer for evidence exports.
 *
 * Validates that:
 * - Secrets are never exported in evidence payloads
 * - Bearer/API keys are stripped from all exported data
 * - Auth metadata is redacted
 * - Receipt exports are safe
 *
 * No routing, execution lifecycle, orchestration, retries, remote execution, or daemon behavior.
 */

import { TOKEN_PREFIX_PATTERNS, CONTEXT_PATTERNS, SECRET_PATTERNS } from "../security/secret-patterns";
import {
  redactSecurityPayload,
  payloadContainsSecrets,
  DEFAULT_SECURITY_POLICY,
  type SecurityPolicy,
  type SecretRedactionPolicy,
} from "../security/security-policy";
import type { EvidenceBundle, ReplayEvidencePackage, EvidenceArtifact } from "./evidence-types";
import type { OperationalEvent } from "./operational-memory";
import type { ExecutionReceipt } from "./types";
import { deterministicSerialize } from "./serde";

export interface RedactionValidationResult {
  valid: boolean;
  violations: RedactionViolation[];
  checkedAt: string;
  totalFieldsChecked: number;
  secretsFound: number;
}

export interface RedactionViolation {
  path: string;
  type: "token_pattern" | "context_pattern" | "auth_header" | "url_credential" | "env_like_key";
  severity: "critical" | "warning";
  detail: string;
}

export interface RedactionReport {
  bundleId?: string;
  packageId?: string;
  validatedAt: string;
  result: RedactionValidationResult;
  securityPolicyVersion: string;
}

const AUTH_KEYS = new Set([
  "authorization",
  "proxy-authorization",
  "x-api-key",
  "api-key",
  "x-auth-token",
  "cookie",
  "set-cookie",
  "Authorization",
  "Proxy-Authorization",
  "X-API-Key",
  "API-Key",
  "X-Auth-Token",
  "Cookie",
  "Set-Cookie",
]);

const SECRET_KEY_PATTERNS = /(^|[_-])(api[_-]?key|auth|authorization|bearer|client[_-]?secret|credential|password|private[_-]?key|refresh[_-]?token|secret|session[_-]?token|token)([_-]|$)/i;

function collectPaths(value: unknown, prefix: string, paths: Map<string, unknown>): void {
  if (value === null || value === undefined || typeof value === "number" || typeof value === "boolean") return;
  if (typeof value === "string") {
    paths.set(prefix, value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => collectPaths(item, `${prefix}[${i}]`, paths));
    return;
  }
  if (typeof value === "object") {
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      collectPaths(val, prefix ? `${prefix}.${key}` : key, paths);
    }
  }
}

function checkStringValue(path: string, value: string): RedactionViolation[] {
  const violations: RedactionViolation[] = [];

  for (const pattern of TOKEN_PREFIX_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(value);
    if (match) {
      violations.push({
        path,
        type: "token_pattern",
        severity: "critical",
        detail: `Token pattern matched at ${path}: ${match[0].slice(0, 8)}...`,
      });
      break;
    }
  }

  for (const pattern of CONTEXT_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(value);
    if (match) {
      violations.push({
        path,
        type: "context_pattern",
        severity: "critical",
        detail: `Context secret pattern matched at ${path}: ${match[0].slice(0, 8)}...`,
      });
      break;
    }
  }

  if (/Bearer\s+[A-Za-z0-9_.+/=-]{10,}/i.test(value)) {
    violations.push({
      path,
      type: "auth_header",
      severity: "critical",
      detail: `Bearer token found at ${path}`,
    });
  }

  return violations;
}

function checkKeyValue(path: string, key: string): RedactionViolation[] {
  const violations: RedactionViolation[] = [];

  if (AUTH_KEYS.has(key)) {
    violations.push({
      path,
      type: "auth_header",
      severity: "critical",
      detail: `Auth header key found: ${key} at ${path}`,
    });
  } else if (SECRET_KEY_PATTERNS.test(key)) {
    violations.push({
      path,
      type: "env_like_key",
      severity: "warning",
      detail: `Secret-bearing key found: ${key} at ${path}`,
    });
  }

  return violations;
}

export function validateArtifactRedaction(artifact: EvidenceArtifact, policy: SecurityPolicy = DEFAULT_SECURITY_POLICY): RedactionValidationResult {
  const violations: RedactionViolation[] = [];
  const paths = new Map<string, unknown>();
  collectPaths(artifact.payload, "", paths);

  let secretsFound = 0;
  for (const [path, value] of paths) {
    if (typeof value === "string") {
      violations.push(...checkStringValue(path, value));
    }
  }

  for (const [path] of paths) {
    const keyParts = path.split(".");
    const lastKey = keyParts[keyParts.length - 1] ?? "";
    violations.push(...checkKeyValue(path, lastKey));
  }

  if (payloadContainsSecrets(artifact.payload, policy.secretRedaction)) {
    secretsFound = violations.filter((v) => v.severity === "critical").length;
  }

  return {
    valid: violations.length === 0,
    violations,
    checkedAt: new Date().toISOString(),
    totalFieldsChecked: paths.size,
    secretsFound,
  };
}

export function validateBundleRedaction(bundle: EvidenceBundle, policy: SecurityPolicy = DEFAULT_SECURITY_POLICY): RedactionValidationResult {
  const allViolations: RedactionViolation[] = [];
  let totalFields = 0;
  let totalSecrets = 0;

  for (const artifact of bundle.artifacts) {
    const result = validateArtifactRedaction(artifact, policy);
    allViolations.push(...result.violations);
    totalFields += result.totalFieldsChecked;
    totalSecrets += result.secretsFound;
  }

  return {
    valid: allViolations.length === 0,
    violations: allViolations,
    checkedAt: new Date().toISOString(),
    totalFieldsChecked: totalFields,
    secretsFound: totalSecrets,
  };
}

export function validateReplayPackageRedaction(pkg: ReplayEvidencePackage, policy: SecurityPolicy = DEFAULT_SECURITY_POLICY): RedactionValidationResult {
  const bundleResult = validateBundleRedaction(pkg.evidenceBundle, policy);
  const violations = [...bundleResult.violations];

  const eventPayloads: Record<string, unknown>[] = [];
  for (const event of pkg.governanceEvents) {
    eventPayloads.push(event.payload);
  }
  for (const event of pkg.diagnosticsSnapshots) {
    eventPayloads.push(event.payload);
  }
  for (const event of pkg.degradedStateTriggerEvidence) {
    eventPayloads.push(event.payload);
  }
  for (const event of pkg.approvalLineage) {
    eventPayloads.push(event.payload);
  }

  for (const payload of eventPayloads) {
    if (payloadContainsSecrets(payload, policy.secretRedaction)) {
      const serialized = deterministicSerialize(payload);
      for (const pattern of SECRET_PATTERNS) {
        pattern.lastIndex = 0;
        const match = pattern.exec(serialized);
        if (match) {
          violations.push({
            path: "event_payload",
            type: "token_pattern",
            severity: "critical",
            detail: `Secret pattern in event payload: ${match[0].slice(0, 8)}...`,
          });
        }
      }
      const bearerMatch = /Bearer\s+[A-Za-z0-9_.+/=-]{10,}/i.exec(serialized);
      if (bearerMatch) {
        violations.push({
          path: "event_payload",
          type: "auth_header",
          severity: "critical",
          detail: `Bearer token in event payload`,
        });
      }
    }
  }

  return {
    valid: violations.length === 0,
    violations,
    checkedAt: new Date().toISOString(),
    totalFieldsChecked: bundleResult.totalFieldsChecked + eventPayloads.length,
    secretsFound: violations.filter((v) => v.severity === "critical").length,
  };
}

export function validateReceiptRedaction(receipt: ExecutionReceipt, policy: SecurityPolicy = DEFAULT_SECURITY_POLICY): RedactionValidationResult {
  const payload = { receipt } as Record<string, unknown>;
  const violations: RedactionViolation[] = [];
  const paths = new Map<string, unknown>();
  collectPaths(payload, "", paths);

  for (const [path, value] of paths) {
    if (typeof value === "string") {
      violations.push(...checkStringValue(path, value));
    }
  }

  for (const [path] of paths) {
    const keyParts = path.split(".");
    const lastKey = keyParts[keyParts.length - 1] ?? "";
    violations.push(...checkKeyValue(path, lastKey));
  }

  return {
    valid: violations.length === 0,
    violations,
    checkedAt: new Date().toISOString(),
    totalFieldsChecked: paths.size,
    secretsFound: violations.filter((v) => v.severity === "critical").length,
  };
}

export function validateEventRedaction(event: OperationalEvent, policy: SecurityPolicy = DEFAULT_SECURITY_POLICY): RedactionValidationResult {
  const violations: RedactionViolation[] = [];
  const paths = new Map<string, unknown>();
  collectPaths(event.payload, "", paths);

  for (const [path, value] of paths) {
    if (typeof value === "string") {
      violations.push(...checkStringValue(path, value));
    }
  }

  return {
    valid: violations.length === 0,
    violations,
    checkedAt: new Date().toISOString(),
    totalFieldsChecked: paths.size,
    secretsFound: violations.filter((v) => v.severity === "critical").length,
  };
}

export function generateRedactionReport(input: {
  bundle?: EvidenceBundle;
  pkg?: ReplayEvidencePackage;
  policy?: SecurityPolicy;
}): RedactionReport {
  const policy = input.policy ?? DEFAULT_SECURITY_POLICY;
  let result: RedactionValidationResult;

  if (input.pkg) {
    result = validateReplayPackageRedaction(input.pkg, policy);
  } else if (input.bundle) {
    result = validateBundleRedaction(input.bundle, policy);
  } else {
    result = {
      valid: true,
      violations: [],
      checkedAt: new Date().toISOString(),
      totalFieldsChecked: 0,
      secretsFound: 0,
    };
  }

  return {
    bundleId: input.bundle?.bundleId,
    packageId: input.pkg?.packageId,
    validatedAt: new Date().toISOString(),
    result,
    securityPolicyVersion: "1",
  };
}

export function redactPayloadForExport<T>(payload: T, policy: SecretRedactionPolicy = DEFAULT_SECURITY_POLICY.secretRedaction): T {
  return redactSecurityPayload(payload, policy);
}

export function isExportSafe(payload: unknown, policy: SecretRedactionPolicy = DEFAULT_SECURITY_POLICY.secretRedaction): boolean {
  return !payloadContainsSecrets(payload, policy);
}
