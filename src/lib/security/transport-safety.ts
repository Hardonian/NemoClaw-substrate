// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Transport safety: TLS validation, cipher suite checks, certificate pinning with fail-fast.
 *
 * Validates TLS configuration, checks cipher suites, and supports certificate
 * pinning verification. Fails fast on insecure configurations.
 */

export interface TlsValidationResult {
  valid: boolean;
  issues: string[];
  tlsVersion: string | null;
  cipherSuite: string | null;
}

export interface CipherSuiteInfo {
  name: string;
  minTlsVersion: string;
  isSecure: boolean;
  issue: string | null;
}

export interface CertificatePin {
  fingerprint: string;
  algorithm: "sha256" | "sha384" | "sha512";
  description?: string;
}

export interface TransportSafetyConfig {
  minTlsVersion: string;
  allowedCipherSuites: string[];
  deniedCipherSuites: string[];
  certificatePins: CertificatePin[];
  failFast: boolean;
}

export const DEFAULT_TRANSPORT_SAFETY_CONFIG: TransportSafetyConfig = {
  minTlsVersion: "TLSv1.2",
  allowedCipherSuites: [],
  deniedCipherSuites: [
    "TLS_RSA_WITH_RC4_128_SHA",
    "TLS_RSA_WITH_3DES_EDE_CBC_SHA",
    "TLS_RSA_WITH_AES_128_CBC_SHA",
    "TLS_RSA_WITH_AES_256_CBC_SHA",
    "TLS_ECDHE_RSA_WITH_RC4_128_SHA",
    "SSL_RSA_WITH_RC4_128_SHA",
    "SSL_RSA_WITH_3DES_EDE_CBC_SHA",
  ],
  certificatePins: [],
  failFast: true,
};

const TLS_VERSION_ORDER = ["SSLv3", "TLSv1", "TLSv1.1", "TLSv1.2", "TLSv1.3"];

const WEAK_CIPHER_PATTERNS = [
  /RC4/i,
  /DES/i,
  /MD5/i,
  /NULL/i,
  /EXPORT/i,
  /anon/i,
];

/**
 * Validate that a TLS version meets the minimum requirement.
 */
export function validateTlsVersion(
  version: string,
  minVersion: string,
): { valid: boolean; meetsMinimum: boolean } {
  const normalizedVersion = version.trim();
  const normalizedMin = minVersion.trim();

  const versionIdx = TLS_VERSION_ORDER.indexOf(normalizedVersion);
  const minIdx = TLS_VERSION_ORDER.indexOf(normalizedMin);

  if (versionIdx === -1) {
    return { valid: false, meetsMinimum: false };
  }
  if (minIdx === -1) {
    return { valid: true, meetsMinimum: true };
  }

  return { valid: true, meetsMinimum: versionIdx >= minIdx };
}

/**
 * Check if a cipher suite is considered weak or insecure.
 */
export function isCipherSuiteWeak(cipherName: string): boolean {
  return WEAK_CIPHER_PATTERNS.some((p) => p.test(cipherName));
}

/**
 * Analyze a cipher suite and return security information.
 */
export function analyzeCipherSuite(cipherName: string): CipherSuiteInfo {
  const isWeak = isCipherSuiteWeak(cipherName);
  let minTlsVersion = "TLSv1.2";
  let issue: string | null = null;

  if (cipherName.includes("TLS13") || cipherName.includes("TLSv1.3")) {
    minTlsVersion = "TLSv1.3";
  } else if (isWeak) {
    issue = `Cipher suite "${cipherName}" uses weak algorithm`;
    minTlsVersion = "TLSv1";
  }

  return {
    name: cipherName,
    minTlsVersion,
    isSecure: !isWeak,
    issue,
  };
}

/**
 * Validate a full TLS configuration against safety requirements.
 */
export function validateTransportSafety(
  config: Partial<TransportSafetyConfig> = {},
  actualTlsVersion?: string,
  actualCipherSuite?: string,
): TlsValidationResult {
  const fullConfig = { ...DEFAULT_TRANSPORT_SAFETY_CONFIG, ...config };
  const issues: string[] = [];

  // Check TLS version
  if (actualTlsVersion) {
    const versionResult = validateTlsVersion(actualTlsVersion, fullConfig.minTlsVersion);
    if (!versionResult.valid) {
      issues.push(`Unknown TLS version: ${actualTlsVersion}`);
    } else if (!versionResult.meetsMinimum) {
      issues.push(
        `TLS version ${actualTlsVersion} is below minimum ${fullConfig.minTlsVersion}`,
      );
    }
  }

  // Check cipher suite
  if (actualCipherSuite) {
    const cipherInfo = analyzeCipherSuite(actualCipherSuite);
    if (!cipherInfo.isSecure) {
      issues.push(cipherInfo.issue ?? `Cipher suite "${actualCipherSuite}" is insecure`);
    }
    if (fullConfig.deniedCipherSuites.includes(actualCipherSuite)) {
      issues.push(`Cipher suite "${actualCipherSuite}" is explicitly denied`);
    }
    if (
      fullConfig.allowedCipherSuites.length > 0 &&
      !fullConfig.allowedCipherSuites.includes(actualCipherSuite)
    ) {
      issues.push(
        `Cipher suite "${actualCipherSuite}" is not in the allowed list`,
      );
    }
  }

  const valid = issues.length === 0;

  if (!valid && fullConfig.failFast) {
    throw new Error(
      `Transport safety check failed: ${issues.join("; ")}`,
    );
  }

  return {
    valid,
    issues,
    tlsVersion: actualTlsVersion ?? null,
    cipherSuite: actualCipherSuite ?? null,
  };
}

/**
 * Verify a certificate fingerprint against a list of pins.
 */
export function verifyCertificatePin(
  fingerprint: string,
  pins: CertificatePin[],
): { valid: boolean; matchedPin: CertificatePin | null } {
  const normalizedFp = fingerprint.toLowerCase().trim();

  for (const pin of pins) {
    const normalizedPin = pin.fingerprint.toLowerCase().trim();
    if (normalizedFp === normalizedPin) {
      return { valid: true, matchedPin: pin };
    }
  }

  return { valid: false, matchedPin: null };
}

/**
 * Quick check: is the TLS configuration safe?
 */
export function isTransportSafe(
  tlsVersion?: string,
  cipherSuite?: string,
): boolean {
  try {
    return validateTransportSafety({}, tlsVersion, cipherSuite).valid;
  } catch {
    return false;
  }
}

/**
 * Generate a human-readable transport safety summary.
 */
export function transportSafetySummary(result: TlsValidationResult): string {
  if (result.valid) {
    return "Transport safety check passed.";
  }
  const lines = [
    `Transport safety check failed:`,
    `  TLS Version: ${result.tlsVersion ?? "not provided"}`,
    `  Cipher Suite: ${result.cipherSuite ?? "not provided"}`,
    ...result.issues.map((i) => `  - ${i}`),
  ];
  return lines.join("\n");
}
