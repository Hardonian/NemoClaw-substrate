// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
  DEFAULT_SECURITY_POLICY,
  LOCAL_ONLY_SECURITY_POLICY,
  classifyNetworkHost,
  normalizeTimeoutMs,
  payloadContainsSecrets,
  preflightProofpackExportPayload,
  redactSecurityPayload,
  validateCommandDescriptor,
  validateLocalOnlyUrl,
  validateRemoteUrl,
  validateUrlForTransport,
} from "./security-policy";

describe("security policy URL and network safety", () => {
  it("strips embedded URL credentials deterministically", () => {
    const result = validateRemoteUrl("https://user:pass@example.com/v1?token=secret#frag");
    expect(result.decision.allowed).toBe(true);
    expect(result.hadEmbeddedCredentials).toBe(true);
    expect(result.url?.username).toBe("");
    expect(result.url?.password).toBe("");
    expect(result.url?.hash).toBe("");
    expect(result.url?.toString()).toBe("https://example.com/v1?token=secret");
  });

  it("rejects unsupported schemes", () => {
    const result = validateRemoteUrl("file:///etc/passwd");
    expect(result.decision).toMatchObject({ allowed: false, reasonCode: "unsupported_scheme" });
  });

  it("enforces local-only policy", () => {
    expect(validateLocalOnlyUrl("http://localhost:11434/api/tags").decision.allowed).toBe(true);
    expect(validateLocalOnlyUrl("http://127.0.0.1:11434/api/tags").decision.allowed).toBe(true);
    expect(validateLocalOnlyUrl("http://192.168.1.4:11434/api/tags").decision.reasonCode).toBe(
      "local_only_violation",
    );
    expect(validateLocalOnlyUrl("https://example.com/api/tags").decision.reasonCode).toBe(
      "local_only_violation",
    );
  });

  it("classifies private public and Tailscale/LAN ranges without DNS", () => {
    expect(classifyNetworkHost("10.1.2.3")).toBe("private");
    expect(classifyNetworkHost("172.20.0.1")).toBe("private");
    expect(classifyNetworkHost("192.168.1.5")).toBe("private");
    expect(classifyNetworkHost("169.254.1.5")).toBe("lan_link_local");
    expect(classifyNetworkHost("100.64.0.10")).toBe("tailscale_or_cgnat");
    expect(classifyNetworkHost("8.8.8.8")).toBe("public");
  });

  it("applies private/public network policy handling", () => {
    const publicOnly = {
      ...DEFAULT_SECURITY_POLICY,
      network: { ...DEFAULT_SECURITY_POLICY.network, allowPrivate: false, allowTailscaleLan: false },
    };
    expect(validateUrlForTransport("http://10.0.0.2:8080", publicOnly).decision.allowed).toBe(false);
    expect(validateUrlForTransport("https://example.com", publicOnly).decision.allowed).toBe(true);
  });

  it("normalizes timeout ceilings", () => {
    expect(validateRemoteUrl("https://example.com", 60_000).normalizedTimeoutMs).toBe(10_000);
    expect(normalizeTimeoutMs(1, LOCAL_ONLY_SECURITY_POLICY.transport)).toBe(250);
  });
});

describe("security policy redaction", () => {
  it("redacts auth headers bearer tokens API keys and URL credentials", () => {
    const payload = redactSecurityPayload({
      headers: { Authorization: "Bearer sk-proj-abcdefghijklmnopqrstuvwxyz", "x-api-key": "nvapi-1234567890abcdef" },
      url: "https://user:pass@example.com/path",
      env: "OPENAI_API_KEY=sk-abcdefghijklmnopqrstuvwxyz",
    });
    const text = JSON.stringify(payload);
    expect(text).not.toContain("sk-proj-abcdefghijklmnopqrstuvwxyz");
    expect(text).not.toContain("nvapi-1234567890abcdef");
    expect(text).not.toContain("user:pass");
    expect(text).toContain("<REDACTED>");
  });

  it("redacts receipt event diagnostics and export shaped payloads", () => {
    const payload = {
      receipt: { metadata: { token: "ghp_abcdefghijklmnopqrstuvwxyz" } },
      event: { payload: { apiKey: "hf_abcdefghijklmno" } },
      diagnostics: { Authorization: "Bearer secretsecretsecret" },
      proofpack: { url: "https://user:pass@example.com/proof" },
    };
    const redacted = redactSecurityPayload(payload);
    expect(JSON.stringify(redacted)).not.toContain("ghp_abcdefghijklmnopqrstuvwxyz");
    expect(JSON.stringify(redacted)).not.toContain("hf_abcdefghijklmno");
    expect(JSON.stringify(redacted)).not.toContain("secretsecretsecret");
    expect(JSON.stringify(redacted)).not.toContain("user:pass");
    expect(payloadContainsSecrets(payload)).toBe(true);
  });
});

describe("command safety policy", () => {
  it("rejects shell execution descriptors", () => {
    const result = validateCommandDescriptor({ name: "echo", argv: ["ok"], shell: true as false });
    expect(result.decision.reasonCode).toBe("command_shell_denied");
  });

  it("rejects command shell injection metacharacters", () => {
    const result = validateCommandDescriptor({ name: "echo", argv: ["ok; rm -rf /"], shell: false });
    expect(result.decision.allowed).toBe(false);
    expect(result.decision.reasonCode).toBe("command_descriptor_invalid");
  });

  it("returns explicit allowlist denial", () => {
    const result = validateCommandDescriptor(
      { name: "curl", argv: ["https://example.com"], shell: false },
      { ...DEFAULT_SECURITY_POLICY.commandExecution, allowlist: ["nvidia-smi"], denylist: [] },
    );
    expect(result.decision.reasonCode).toBe("command_allowlist_denied");
  });
});

describe("proofpack export safety", () => {
  it("blocks secret-bearing proofpack export payloads", () => {
    const result = preflightProofpackExportPayload(
      { receipt: { metadata: { Authorization: "Bearer nvapi-1234567890abcdef" } } },
      "2026-05-09T00:00:00.000Z",
    );
    expect(result.decision.reasonCode).toBe("proofpack_secret_detected");
    expect(JSON.stringify(result.redactedPayload)).not.toContain("nvapi-1234567890abcdef");
  });

  it("adds safe manifest metadata for clean proofpack exports", () => {
    const result = preflightProofpackExportPayload(
      { receipt: { metadata: { status: "ok" } } },
      "2026-05-09T00:00:00.000Z",
    );
    expect(result.decision.allowed).toBe(true);
    expect(result.manifest).toEqual({
      securityPolicyVersion: "1",
      generatedAt: "2026-05-09T00:00:00.000Z",
      redaction: "preflight_passed",
      secretBearingPayloadBlocked: true,
    });
  });
});
