// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Redaction audit: verify all PII/secrets are stripped from logs, metrics, payloads.
 *
 * Scans text for known patterns (API keys, tokens, emails, IPs, SSNs) and verifies
 * they are properly redacted. Used to assert that outgoing data has no leaked secrets.
 */

import { SECRET_PATTERNS } from "./secret-patterns";

// ── PII patterns ────────────────────────────────────────────────

const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const IPV4_PATTERN = /\b(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\b/g;
const IPV6_PATTERN = /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g;
const SSN_PATTERN = /\b\d{3}-\d{2}-\d{4}\b/g;
const CREDIT_CARD_PATTERN = /\b(?:\d{4}[-\s]?){3}\d{4}\b/g;
const PHONE_PATTERN = /(?:\+?1[-.\s]?)?(?:\(?[2-9]\d{2}\)?[-.\s]?[2-9]\d{2}[-.\s]?\d{4})\b/g;

export interface RedactionFinding {
  type: string;
  pattern: string;
  index: number;
  isRedacted: boolean;
}

export interface RedactionAuditResult {
  clean: boolean;
  findings: RedactionFinding[];
  summary: Record<string, number>;
}

const REDACTED_MARKERS = ["<REDACTED>", "****", "[STRIPPED_BY_MIGRATION]", "[MASKED]", "REDACTED"];

function isLikelyRedacted(match: string, fullText: string, index: number): boolean {
  const contextStart = Math.max(0, index - 20);
  const contextEnd = Math.min(fullText.length, index + match.length + 20);
  const context = fullText.slice(contextStart, contextEnd);
  return REDACTED_MARKERS.some((marker) => context.includes(marker));
}

function scanPattern(
  text: string,
  pattern: RegExp,
  type: string,
): RedactionFinding[] {
  const findings: RedactionFinding[] = [];
  pattern.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    findings.push({
      type,
      pattern: match[0],
      index: match.index,
      isRedacted: isLikelyRedacted(match[0], text, match.index),
    });
  }
  return findings;
}

/**
 * Scan text for PII and secret patterns, reporting whether each finding is redacted.
 */
export function auditRedaction(text: string): RedactionAuditResult {
  if (typeof text !== "string") {
    return { clean: true, findings: [], summary: {} };
  }

  const allPatterns: [RegExp, string][] = [
    ...SECRET_PATTERNS.map((p) => [p, "secret_token"] as [RegExp, string]),
    [EMAIL_PATTERN, "email"],
    [IPV4_PATTERN, "ipv4"],
    [IPV6_PATTERN, "ipv6"],
    [SSN_PATTERN, "ssn"],
    [CREDIT_CARD_PATTERN, "credit_card"],
    [PHONE_PATTERN, "phone"],
  ];

  const findings: RedactionFinding[] = [];
  for (const [pattern, type] of allPatterns) {
    findings.push(...scanPattern(text, pattern, type));
  }

  const summary: Record<string, number> = {};
  for (const finding of findings) {
    const key = finding.isRedacted ? `${finding.type}_redacted` : `${finding.type}_exposed`;
    summary[key] = (summary[key] ?? 0) + 1;
  }

  const clean = findings.every((f) => f.isRedacted);

  return { clean, findings, summary };
}

/**
 * Assert that a payload (stringified or object) contains no unredacted secrets.
 * Returns true if all detected patterns are redacted.
 */
export function assertPayloadRedacted(payload: unknown): boolean {
  const text = typeof payload === "string" ? payload : JSON.stringify(payload ?? "");
  return auditRedaction(text).clean;
}

/**
 * Get a human-readable summary of redaction audit findings.
 */
export function redactionSummary(result: RedactionAuditResult): string {
  if (result.clean) {
    return "All detected patterns are properly redacted.";
  }
  const exposed = result.findings.filter((f) => !f.isRedacted);
  const lines = exposed.map((f) => `  - ${f.type} at index ${f.index} (not redacted)`);
  return `Found ${exposed.length} unredacted pattern(s):\n${lines.join("\n")}`;
}
