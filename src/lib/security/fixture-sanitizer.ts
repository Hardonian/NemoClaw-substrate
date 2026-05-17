// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Fixture sanitizer: scan and mask secrets in test fixtures before inclusion in test suites.
 *
 * Removes stale credentials, masks secrets, and ensures test fixtures
 * don't leak real secrets into version control or test output.
 */

import { SECRET_PATTERNS, TOKEN_PREFIX_PATTERNS } from "./secret-patterns";

export interface FixtureSanitizerResult {
  sanitized: string;
  secretsFound: number;
  secretsMasked: number;
  patterns: string[];
}

export interface FixtureSanitizerOptions {
  maskString?: string;
  maskTokens?: boolean;
  maskEmails?: boolean;
  maskIps?: boolean;
  maskSsns?: boolean;
}

const DEFAULT_MASK = "***MASKED***";

const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const IPV4_PATTERN = /\b(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\b/g;
const SSN_PATTERN = /\b\d{3}-\d{2}-\d{4}\b/g;

const DEFAULT_OPTIONS: Required<FixtureSanitizerOptions> = {
  maskString: DEFAULT_MASK,
  maskTokens: true,
  maskEmails: true,
  maskIps: false,
  maskSsns: true,
};

/**
 * Sanitize a fixture string by masking secrets and sensitive patterns.
 */
export function sanitizeFixture(
  content: string,
  options: FixtureSanitizerOptions = {},
): FixtureSanitizerResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let sanitized = content;
  const patterns: string[] = [];
  let secretsFound = 0;
  let secretsMasked = 0;

  // Mask secret tokens
  if (opts.maskTokens) {
    for (const pattern of SECRET_PATTERNS) {
      pattern.lastIndex = 0;
      const matches = sanitized.match(pattern);
      if (matches) {
        secretsFound += matches.length;
        patterns.push(pattern.source);
        sanitized = sanitized.replace(pattern, opts.maskString);
        secretsMasked += matches.length;
      }
    }

    // Also mask KEY=..., TOKEN=..., etc. patterns
    const envPattern = /(?:API_KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL|_KEY)=['"]?[A-Za-z0-9_.+/=-]{10,}['"]?/gi;
    const envMatches = sanitized.match(envPattern);
    if (envMatches) {
      secretsFound += envMatches.length;
      patterns.push("env_assignment");
      sanitized = sanitized.replace(
        envPattern,
        (match) => match.replace(/=['"]?[A-Za-z0-9_.+/=-]{10,}['"]?/, `=${opts.maskString}`),
      );
      secretsMasked += envMatches.length;
    }

    // Mask Bearer tokens
    const bearerPattern = /Bearer\s+[A-Za-z0-9_.+/=-]{10,}/gi;
    const bearerMatches = sanitized.match(bearerPattern);
    if (bearerMatches) {
      secretsFound += bearerMatches.length;
      patterns.push("bearer_token");
      sanitized = sanitized.replace(bearerPattern, `Bearer ${opts.maskString}`);
      secretsMasked += bearerMatches.length;
    }
  }

  // Mask emails
  if (opts.maskEmails) {
    const emailMatches = sanitized.match(EMAIL_PATTERN);
    if (emailMatches) {
      secretsFound += emailMatches.length;
      patterns.push("email");
      sanitized = sanitized.replace(EMAIL_PATTERN, opts.maskString);
      secretsMasked += emailMatches.length;
    }
  }

  // Mask IPs
  if (opts.maskIps) {
    const ipMatches = sanitized.match(IPV4_PATTERN);
    if (ipMatches) {
      secretsFound += ipMatches.length;
      patterns.push("ipv4");
      sanitized = sanitized.replace(IPV4_PATTERN, opts.maskString);
      secretsMasked += ipMatches.length;
    }
  }

  // Mask SSNs
  if (opts.maskSsns) {
    const ssnMatches = sanitized.match(SSN_PATTERN);
    if (ssnMatches) {
      secretsFound += ssnMatches.length;
      patterns.push("ssn");
      sanitized = sanitized.replace(SSN_PATTERN, opts.maskString);
      secretsMasked += ssnMatches.length;
    }
  }

  return {
    sanitized,
    secretsFound,
    secretsMasked,
    patterns,
  };
}

/**
 * Check if a fixture contains any unmasked secrets.
 */
export function fixtureHasSecrets(content: string): boolean {
  for (const pattern of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) return true;
  }

  const envPattern = /(?:API_KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL|_KEY)=['"]?[A-Za-z0-9_.+/=-]{10,}['"]?/gi;
  if (envPattern.test(content)) return true;

  const bearerPattern = /Bearer\s+[A-Za-z0-9_.+/=-]{10,}/gi;
  if (bearerPattern.test(content)) return true;

  return false;
}

/**
 * Sanitize a fixture file content and assert no secrets remain.
 * Throws if secrets are still present after sanitization.
 */
export function sanitizeAndValidate(
  content: string,
  options?: FixtureSanitizerOptions,
): FixtureSanitizerResult {
  const result = sanitizeFixture(content, options);
  if (fixtureHasSecrets(result.sanitized)) {
    throw new Error(
      `Fixture still contains secrets after sanitization. Found patterns: ${result.patterns.join(", ")}`,
    );
  }
  return result;
}

/**
 * Mask a specific value inline (for selective masking in fixtures).
 */
export function maskInlineValue(
  content: string,
  value: string,
  maskString: string = DEFAULT_MASK,
): string {
  if (!value) return content;
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(escaped, "g");
  return content.replace(pattern, maskString);
}
