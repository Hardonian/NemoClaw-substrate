// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
  auditRedaction,
  assertPayloadRedacted,
  redactionSummary,
} from "./redaction-audit";

describe("auditRedaction", () => {
  it("returns clean for text with no sensitive patterns", () => {
    const result = auditRedaction("Hello, this is safe text with no secrets.");
    expect(result.clean).toBe(true);
    expect(result.findings).toHaveLength(0);
    expect(result.summary).toEqual({});
  });

  it("detects exposed secret tokens", () => {
    const result = auditRedaction("key: nvapi-abcdefghij1234567890");
    expect(result.clean).toBe(false);
    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.findings.some((f) => f.type === "secret_token" && !f.isRedacted)).toBe(true);
  });

  it("detects redacted secret tokens", () => {
    const result = auditRedaction("key: nvapi-**** (redacted)");
    const tokenFindings = result.findings.filter((f) => f.type === "secret_token");
    expect(tokenFindings.length).toBeGreaterThan(0);
    expect(tokenFindings.some((f) => f.isRedacted)).toBe(true);
  });

  it("detects exposed email addresses", () => {
    const result = auditRedaction("contact: user@example.com");
    expect(result.clean).toBe(false);
    expect(result.findings.some((f) => f.type === "email" && !f.isRedacted)).toBe(true);
  });

  it("detects exposed IPv4 addresses", () => {
    const result = auditRedaction("server: 192.168.1.100");
    expect(result.clean).toBe(false);
    expect(result.findings.some((f) => f.type === "ipv4" && !f.isRedacted)).toBe(true);
  });

  it("detects exposed SSN patterns", () => {
    const result = auditRedaction("ssn: 123-45-6789");
    expect(result.clean).toBe(false);
    expect(result.findings.some((f) => f.type === "ssn" && !f.isRedacted)).toBe(true);
  });

  it("detects exposed credit card patterns", () => {
    const result = auditRedaction("card: 4111-1111-1111-1111");
    expect(result.clean).toBe(false);
    expect(result.findings.some((f) => f.type === "credit_card" && !f.isRedacted)).toBe(true);
  });

  it("handles empty string", () => {
    const result = auditRedaction("");
    expect(result.clean).toBe(true);
    expect(result.findings).toHaveLength(0);
  });

  it("produces summary with exposed and redacted counts", () => {
    const result = auditRedaction("email: user@test.com ssn: 123-45-6789 token: nvapi-**** redacted");
    expect(result.summary["email_exposed"]).toBe(1);
    expect(result.summary["ssn_exposed"]).toBe(1);
  });
});

describe("assertPayloadRedacted", () => {
  it("returns true for clean objects", () => {
    expect(assertPayloadRedacted({ name: "test", value: 42 })).toBe(true);
  });

  it("returns false for objects with exposed secrets", () => {
    expect(assertPayloadRedacted("nvapi-abcdefghij1234567890")).toBe(false);
  });

  it("returns true for objects with redacted values", () => {
    expect(assertPayloadRedacted("nvapi-**** is <REDACTED>")).toBe(true);
  });

  it("handles null payload", () => {
    expect(assertPayloadRedacted(null)).toBe(true);
  });
});

describe("redactionSummary", () => {
  it("returns pass message for clean results", () => {
    const result = auditRedaction("safe text");
    expect(redactionSummary(result)).toBe("All detected patterns are properly redacted.");
  });

  it("returns exposed findings for dirty results", () => {
    const result = auditRedaction("ssn: 123-45-6789");
    const summary = redactionSummary(result);
    expect(summary).toContain("1 unredacted pattern");
    expect(summary).toContain("ssn");
    expect(summary).toContain("not redacted");
  });
});
