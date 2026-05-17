// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Export boundary checks: no sensitive data leaves process without explicit policy.
 *
 * Classifies data as public/internal/secret and enforces policy before export.
 * Used at process boundaries (HTTP responses, file writes, IPC) to prevent leaks.
 */

import { payloadContainsSecrets, redactSecurityPayload } from "./security-policy";

export type DataClassification = "public" | "internal" | "secret";

export interface ExportPolicy {
  allowedClassifications: DataClassification[];
  autoRedact: boolean;
  failOpen: boolean;
}

export interface ExportBoundaryResult {
  allowed: boolean;
  classification: DataClassification;
  redacted?: unknown;
  reason: string;
}

export const DEFAULT_EXPORT_POLICY: ExportPolicy = {
  allowedClassifications: ["public"],
  autoRedact: true,
  failOpen: false,
};

/**
 * Classify data sensitivity based on content analysis.
 * Walks the payload and returns the highest sensitivity level found.
 */
export function classifyData(payload: unknown): DataClassification {
  if (payload === null || payload === undefined) return "public";
  if (typeof payload === "boolean" || typeof payload === "number") return "public";

  if (typeof payload === "string") {
    const lower = payload.toLowerCase();
    if (hasSecretIndicator(lower) || hasPiiIndicator(lower)) return "secret";
    if (hasInternalIndicator(lower)) return "internal";
    return "public";
  }

  if (Array.isArray(payload)) {
    let maxClass: DataClassification = "public";
    for (const item of payload) {
      const itemClass = classifyData(item);
      maxClass = mergeClassification(maxClass, itemClass);
    }
    return maxClass;
  }

  if (typeof payload === "object") {
    let maxClass: DataClassification = "public";
    const obj = payload as Record<string, unknown>;
    for (const [key, value] of Object.entries(obj)) {
      const keyClass = classifyKey(key);
      const valueClass = classifyData(value);
      maxClass = mergeClassification(maxClass, keyClass);
      maxClass = mergeClassification(maxClass, valueClass);
    }
    return maxClass;
  }

  return "public";
}

const SECRET_KEY_PATTERNS = [
  /(?:api[_-]?key|apikey|secret|password|passwd|token|credential|auth|private[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret)/i,
];

const SECRET_VALUE_PATTERNS = [
  /(?:nvapi-|nvcf-|ghp_|sk-proj-|sk-ant-|sk-[A-Za-z0-9]{20,}|xox[bpsa]-|AKIA[A-Z0-9]{16}|hf_[A-Za-z0-9]{10,}|glpat-|gsk_[A-Za-z0-9]{10,}|pypi-[A-Za-z0-9]{10,})/,
  /(?:Bearer\s+\S+)/i,
];

const PII_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/, // SSN
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/, // email
];

const INTERNAL_PATTERNS = [
  /(?:internal|staging|dev[_-]?env|test[_-]?data|debug|trace|log[_-]?level)/i,
];

function hasSecretIndicator(text: string): boolean {
  return SECRET_VALUE_PATTERNS.some((p) => p.test(text));
}

function hasPiiIndicator(text: string): boolean {
  return PII_PATTERNS.some((p) => p.test(text));
}

function hasInternalIndicator(text: string): boolean {
  return INTERNAL_PATTERNS.some((p) => p.test(text));
}

function classifyKey(key: string): DataClassification {
  if (SECRET_KEY_PATTERNS.some((p) => p.test(key))) return "secret";
  if (INTERNAL_PATTERNS.some((p) => p.test(key))) return "internal";
  return "public";
}

function mergeClassification(a: DataClassification, b: DataClassification): DataClassification {
  const order: DataClassification[] = ["public", "internal", "secret"];
  const aIdx = order.indexOf(a);
  const bIdx = order.indexOf(b);
  return order[Math.max(aIdx, bIdx)];
}

/**
 * Check if a payload is allowed to be exported under the given policy.
 * If autoRedact is true, returns the redacted version alongside the decision.
 */
export function checkExportBoundary(
  payload: unknown,
  policy: ExportPolicy = DEFAULT_EXPORT_POLICY,
): ExportBoundaryResult {
  const classification = classifyData(payload);
  const isAllowed = policy.allowedClassifications.includes(classification);

  if (isAllowed) {
    return {
      allowed: true,
      classification,
      redacted: payload,
      reason: `Classification "${classification}" is allowed for export`,
    };
  }

  if (policy.autoRedact) {
    const redacted = redactSecurityPayload(payload);
    const redactedClassification = classifyData(redacted);
    if (policy.allowedClassifications.includes(redactedClassification)) {
      return {
        allowed: true,
        classification,
        redacted,
        reason: `Originally "${classification}", allowed after redaction`,
      };
    }
  }

  if (policy.failOpen) {
    return {
      allowed: true,
      classification,
      redacted: policy.autoRedact ? redactSecurityPayload(payload) : payload,
      reason: `Fail-open: allowing "${classification}" despite policy`,
    };
  }

  return {
    allowed: false,
    classification,
    reason: `Classification "${classification}" not in allowed list: ${policy.allowedClassifications.join(", ")}`,
  };
}

/**
 * Quick check: is this payload safe to export as public data?
 */
export function isExportSafe(payload: unknown): boolean {
  return checkExportBoundary(payload, DEFAULT_EXPORT_POLICY).allowed;
}

/**
 * Export payload safely: redacts if needed, blocks if policy forbids.
 * Throws on policy violation when failOpen is false.
 */
export function safeExport(
  payload: unknown,
  policy: ExportPolicy = DEFAULT_EXPORT_POLICY,
): unknown {
  const result = checkExportBoundary(payload, policy);
  if (!result.allowed) {
    throw new Error(`Export boundary violation: ${result.reason}`);
  }
  return result.redacted ?? payload;
}
