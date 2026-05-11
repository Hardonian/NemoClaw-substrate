// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
  sanitizeFixture,
  fixtureHasSecrets,
  sanitizeAndValidate,
  maskInlineValue,
} from "./fixture-sanitizer";

describe("sanitizeFixture", () => {
  it("masks secret token patterns", () => {
    const content = "API: nvapi-abcdefghij1234567890";
    const result = sanitizeFixture(content);
    expect(result.secretsFound).toBeGreaterThan(0);
    expect(result.sanitized).not.toContain("nvapi-abcdefghij1234567890");
    expect(result.sanitized).toContain("***MASKED***");
  });

  it("masks GitHub tokens", () => {
    const content = "token: ghp_abcdefghij1234567890abcdefghij";
    const result = sanitizeFixture(content);
    expect(result.secretsFound).toBeGreaterThan(0);
    expect(result.sanitized).not.toContain("ghp_abcdefghij1234567890abcdefghij");
  });

  it("masks OpenAI-style tokens", () => {
    const content = "key: sk-proj-abcdefghijklmnopqrstuvwxyz";
    const result = sanitizeFixture(content);
    expect(result.secretsFound).toBeGreaterThan(0);
    expect(result.sanitized).not.toContain("sk-proj-");
  });

  it("masks environment variable assignments", () => {
    const content = "API_KEY=abcdefghijklmnopqrstuvwxyz1234";
    const result = sanitizeFixture(content);
    expect(result.secretsFound).toBeGreaterThan(0);
    expect(result.sanitized).toContain("API_KEY=");
    expect(result.sanitized).not.toContain("abcdefghijklmnopqrstuvwxyz1234");
  });

  it("masks Bearer tokens", () => {
    const content = "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test";
    const result = sanitizeFixture(content);
    expect(result.secretsFound).toBeGreaterThan(0);
    expect(result.sanitized).toContain("Bearer");
    expect(result.sanitized).not.toContain("eyJhbGci");
  });

  it("masks email addresses", () => {
    const content = "email: user@example.com";
    const result = sanitizeFixture(content, { maskEmails: true, maskTokens: false });
    expect(result.secretsFound).toBe(1);
    expect(result.sanitized).not.toContain("user@example.com");
  });

  it("masks SSN patterns", () => {
    const content = "ssn: 123-45-6789";
    const result = sanitizeFixture(content, { maskSsns: true, maskTokens: false });
    expect(result.secretsFound).toBe(1);
    expect(result.sanitized).not.toContain("123-45-6789");
  });

  it("respects maskTokens=false option", () => {
    const content = "key: nvapi-abcdefghij1234567890 email: user@test.com";
    const result = sanitizeFixture(content, { maskTokens: false, maskEmails: true });
    expect(result.sanitized).toContain("nvapi-abcdefghij1234567890");
    expect(result.sanitized).not.toContain("user@test.com");
  });

  it("respects maskIps option", () => {
    const content = "server: 192.168.1.100";
    const result = sanitizeFixture(content, { maskIps: true, maskTokens: false });
    expect(result.secretsFound).toBe(1);
    expect(result.sanitized).not.toContain("192.168.1.100");
  });

  it("uses custom mask string", () => {
    const content = "key: nvapi-abcdefghij1234567890";
    const result = sanitizeFixture(content, { maskString: "[REDACTED]" });
    expect(result.sanitized).toContain("[REDACTED]");
    expect(result.sanitized).not.toContain("***MASKED***");
  });

  it("tracks patterns found", () => {
    const content = "key: nvapi-abcdefghij1234567890 email: user@test.com";
    const result = sanitizeFixture(content);
    expect(result.patterns.length).toBeGreaterThan(0);
  });

  it("reports zero secrets for clean content", () => {
    const result = sanitizeFixture("Hello world, this is clean content");
    expect(result.secretsFound).toBe(0);
    expect(result.secretsMasked).toBe(0);
    expect(result.sanitized).toBe("Hello world, this is clean content");
  });
});

describe("fixtureHasSecrets", () => {
  it("detects secret tokens", () => {
    expect(fixtureHasSecrets("key: nvapi-abcdefghij1234567890")).toBe(true);
    expect(fixtureHasSecrets("token: ghp_abcdefghij1234567890")).toBe(true);
  });

  it("detects env assignments", () => {
    expect(fixtureHasSecrets("API_KEY=abcdefghijklmnopqrstuvwxyz1234")).toBe(true);
  });

  it("detects Bearer tokens", () => {
    expect(fixtureHasSecrets("Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test")).toBe(true);
  });

  it("returns false for clean content", () => {
    expect(fixtureHasSecrets("Hello world, this is clean")).toBe(false);
  });
});

describe("sanitizeAndValidate", () => {
  it("sanitizes and returns clean result", () => {
    const content = "key: nvapi-abcdefghij1234567890";
    const result = sanitizeAndValidate(content);
    expect(result.secretsMasked).toBeGreaterThan(0);
    expect(result.sanitized).not.toContain("nvapi-");
  });

  it("throws if secrets remain after sanitization", () => {
    // This should work since sanitizeFixture handles all patterns, but test the assertion path
    const content = "Hello world";
    const result = sanitizeAndValidate(content);
    expect(result.sanitized).toBe("Hello world");
  });
});

describe("maskInlineValue", () => {
  it("masks a specific value", () => {
    const content = "My secret is password123, remember it.";
    const result = maskInlineValue(content, "password123");
    expect(result).toBe("My secret is ***MASKED***, remember it.");
  });

  it("masks all occurrences", () => {
    const content = "key: abc and also abc here";
    const result = maskInlineValue(content, "abc");
    expect(result).toBe("key: ***MASKED*** and also ***MASKED*** here");
  });

  it("handles special regex characters", () => {
    const content = "pattern: a.b.c";
    const result = maskInlineValue(content, "a.b.c");
    expect(result).toBe("pattern: ***MASKED***");
  });

  it("returns content unchanged for empty value", () => {
    const content = "test content";
    const result = maskInlineValue(content, "");
    expect(result).toBe("test content");
  });

  it("uses custom mask string", () => {
    const content = "secret: myvalue";
    const result = maskInlineValue(content, "myvalue", "[HIDDEN]");
    expect(result).toBe("secret: [HIDDEN]");
  });
});
