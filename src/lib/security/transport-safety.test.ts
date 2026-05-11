// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
  validateTlsVersion,
  isCipherSuiteWeak,
  analyzeCipherSuite,
  validateTransportSafety,
  verifyCertificatePin,
  isTransportSafe,
  transportSafetySummary,
} from "./transport-safety";

describe("validateTlsVersion", () => {
  it("validates TLS versions in order", () => {
    expect(validateTlsVersion("TLSv1.2", "TLSv1.2")).toEqual({ valid: true, meetsMinimum: true });
    expect(validateTlsVersion("TLSv1.3", "TLSv1.2")).toEqual({ valid: true, meetsMinimum: true });
    expect(validateTlsVersion("TLSv1.1", "TLSv1.2")).toEqual({ valid: true, meetsMinimum: false });
    expect(validateTlsVersion("TLSv1", "TLSv1.2")).toEqual({ valid: true, meetsMinimum: false });
  });

  it("rejects unknown TLS versions", () => {
    expect(validateTlsVersion("SSLv2", "TLSv1.2")).toEqual({ valid: false, meetsMinimum: false });
    expect(validateTlsVersion("invalid", "TLSv1.2")).toEqual({ valid: false, meetsMinimum: false });
  });

  it("handles unknown minimum versions gracefully", () => {
    const result = validateTlsVersion("TLSv1.2", "TLSv9.9");
    expect(result.valid).toBe(true);
  });

  it("handles whitespace in versions", () => {
    expect(validateTlsVersion(" TLSv1.2 ", " TLSv1.2 ")).toEqual({ valid: true, meetsMinimum: true });
  });
});

describe("isCipherSuiteWeak", () => {
  it("detects weak cipher suites", () => {
    expect(isCipherSuiteWeak("TLS_RSA_WITH_RC4_128_SHA")).toBe(true);
    expect(isCipherSuiteWeak("TLS_RSA_WITH_3DES_EDE_CBC_SHA")).toBe(true);
    expect(isCipherSuiteWeak("TLS_RSA_EXPORT_WITH_DES40_CBC_SHA")).toBe(true);
    expect(isCipherSuiteWeak("TLS_DH_anon_EXPORT_WITH_RC4_40_MD5")).toBe(true);
  });

  it("allows strong cipher suites", () => {
    expect(isCipherSuiteWeak("TLS_AES_256_GCM_SHA384")).toBe(false);
    expect(isCipherSuiteWeak("TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384")).toBe(false);
    expect(isCipherSuiteWeak("TLS_CHACHA20_POLY1305_SHA256")).toBe(false);
  });
});

describe("analyzeCipherSuite", () => {
  it("analyzes weak ciphers", () => {
    const info = analyzeCipherSuite("TLS_RSA_WITH_RC4_128_SHA");
    expect(info.isSecure).toBe(false);
    expect(info.issue).toContain("weak");
  });

  it("analyzes strong ciphers", () => {
    const info = analyzeCipherSuite("TLS_AES_256_GCM_SHA384");
    expect(info.isSecure).toBe(true);
    expect(info.issue).toBeNull();
  });

  it("identifies TLS 1.3 ciphers", () => {
    const info = analyzeCipherSuite("TLS_AES_256_GCM_SHA384_TLS13");
    expect(info.minTlsVersion).toBe("TLSv1.3");
  });
});

describe("validateTransportSafety", () => {
  it("passes with strong TLS and cipher", () => {
    const result = validateTransportSafety({}, "TLSv1.3", "TLS_AES_256_GCM_SHA384");
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("fails with weak TLS version", () => {
    expect(() =>
      validateTransportSafety({ failFast: true }, "TLSv1.1", "TLS_AES_256_GCM_SHA384"),
    ).toThrow("below minimum");
  });

  it("fails with weak cipher suite", () => {
    expect(() =>
      validateTransportSafety({ failFast: true }, "TLSv1.3", "TLS_RSA_WITH_RC4_128_SHA"),
    ).toThrow("weak");
  });

  it("fails with explicitly denied cipher suite", () => {
    expect(() =>
      validateTransportSafety(
        { failFast: true, deniedCipherSuites: ["CUSTOM_WEAK_CIPHER"] },
        "TLSv1.3",
        "CUSTOM_WEAK_CIPHER",
      ),
    ).toThrow("explicitly denied");
  });

  it("returns issues without throwing when failFast is false", () => {
    const result = validateTransportSafety(
      { failFast: false },
      "TLSv1.1",
      "TLS_AES_256_GCM_SHA384",
    );
    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("checks allowed cipher suite list", () => {
    const result = validateTransportSafety(
      { failFast: false, allowedCipherSuites: ["TLS_AES_256_GCM_SHA384"] },
      "TLSv1.3",
      "TLS_CHACHA20_POLY1305_SHA256",
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.includes("not in the allowed list"))).toBe(true);
  });

  it("handles missing TLS version and cipher", () => {
    const result = validateTransportSafety({}, undefined, undefined);
    expect(result.valid).toBe(true);
    expect(result.tlsVersion).toBeNull();
    expect(result.cipherSuite).toBeNull();
  });
});

describe("verifyCertificatePin", () => {
  it("matches fingerprint", () => {
    const pin = { fingerprint: "AB:CD:EF:12:34", algorithm: "sha256" as const };
    const result = verifyCertificatePin("ab:cd:ef:12:34", [pin]);
    expect(result.valid).toBe(true);
    expect(result.matchedPin).toBe(pin);
  });

  it("rejects non-matching fingerprint", () => {
    const pin = { fingerprint: "AB:CD:EF:12:34", algorithm: "sha256" as const };
    const result = verifyCertificatePin("00:00:00:00:00", [pin]);
    expect(result.valid).toBe(false);
    expect(result.matchedPin).toBeNull();
  });

  it("matches case-insensitively", () => {
    const pin = { fingerprint: "abcdef1234", algorithm: "sha256" as const };
    const result = verifyCertificatePin("ABCDEF1234", [pin]);
    expect(result.valid).toBe(true);
  });
});

describe("isTransportSafe", () => {
  it("returns true for safe configuration", () => {
    expect(isTransportSafe("TLSv1.3", "TLS_AES_256_GCM_SHA384")).toBe(true);
  });

  it("returns false for unsafe configuration", () => {
    expect(isTransportSafe("TLSv1.1", "TLS_AES_256_GCM_SHA384")).toBe(false);
  });
});

describe("transportSafetySummary", () => {
  it("returns pass message for valid results", () => {
    const result = { valid: true, issues: [], tlsVersion: "TLSv1.3", cipherSuite: "TLS_AES_256_GCM_SHA384" };
    expect(transportSafetySummary(result)).toBe("Transport safety check passed.");
  });

  it("returns issue details for invalid results", () => {
    const result = {
      valid: false,
      issues: ["TLS version below minimum"],
      tlsVersion: "TLSv1.1",
      cipherSuite: null,
    };
    const summary = transportSafetySummary(result);
    expect(summary).toContain("failed");
    expect(summary).toContain("TLSv1.1");
    expect(summary).toContain("TLS version below minimum");
  });
});
