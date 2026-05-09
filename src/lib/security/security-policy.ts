// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { redactFull, redactUrl } from "./redact";

export type SecurityReasonCode =
  | "allowed"
  | "auth_header_redacted"
  | "command_allowlist_denied"
  | "command_denylist_denied"
  | "command_shell_denied"
  | "command_descriptor_invalid"
  | "embedded_url_credentials_stripped"
  | "invalid_timeout"
  | "local_only_violation"
  | "network_policy_blocked"
  | "proofpack_secret_detected"
  | "secret_redacted"
  | "transport_url_invalid"
  | "unsupported_scheme";

export interface SecurityDecision {
  allowed: boolean;
  reasonCode: SecurityReasonCode;
  explanation: string;
  sanitized?: string;
  metadata?: Record<string, string | number | boolean>;
}

export type NetworkAddressClass =
  | "loopback"
  | "private"
  | "tailscale_or_cgnat"
  | "lan_link_local"
  | "public"
  | "hostname"
  | "unknown";

export interface NetworkPolicy {
  mode: "local_only" | "remote";
  allowLoopback: boolean;
  allowPrivate: boolean;
  allowTailscaleLan: boolean;
  allowPublic: boolean;
}

export interface TransportPolicy {
  allowedSchemes: readonly string[];
  timeoutCeilingMs: number;
  defaultTimeoutMs: number;
  minimumTimeoutMs: number;
  stripEmbeddedCredentials: boolean;
}

export interface CommandExecutionPolicy {
  allowlist?: readonly string[];
  denylist: readonly string[];
  timeoutCeilingMs: number;
  defaultTimeoutMs: number;
  stdoutMaxBytes: number;
  stderrMaxBytes: number;
  requireShellFalse: boolean;
}

export interface SecretRedactionPolicy {
  replacement: string;
  redactAuthHeaders: boolean;
  redactEnvLikeKeys: boolean;
  redactUrlCredentials: boolean;
  maxDepth: number;
}

export interface ProofpackExportPolicy {
  blockSecretBearingPayloads: boolean;
  includeSafeManifestMetadata: boolean;
}

export interface SecurityPolicy {
  network: NetworkPolicy;
  transport: TransportPolicy;
  commandExecution: CommandExecutionPolicy;
  secretRedaction: SecretRedactionPolicy;
  proofpackExport: ProofpackExportPolicy;
}

export const DEFAULT_SECURITY_POLICY: SecurityPolicy = {
  network: {
    mode: "remote",
    allowLoopback: true,
    allowPrivate: true,
    allowTailscaleLan: true,
    allowPublic: true,
  },
  transport: {
    allowedSchemes: ["http:", "https:"],
    timeoutCeilingMs: 10_000,
    defaultTimeoutMs: 2_000,
    minimumTimeoutMs: 250,
    stripEmbeddedCredentials: true,
  },
  commandExecution: {
    denylist: ["bash", "sh", "zsh", "fish", "powershell", "pwsh", "cmd", "curl", "wget", "nc", "netcat"],
    timeoutCeilingMs: 10_000,
    defaultTimeoutMs: 2_000,
    stdoutMaxBytes: 64_000,
    stderrMaxBytes: 16_000,
    requireShellFalse: true,
  },
  secretRedaction: {
    replacement: "<REDACTED>",
    redactAuthHeaders: true,
    redactEnvLikeKeys: true,
    redactUrlCredentials: true,
    maxDepth: 12,
  },
  proofpackExport: {
    blockSecretBearingPayloads: true,
    includeSafeManifestMetadata: true,
  },
};

export const LOCAL_ONLY_SECURITY_POLICY: SecurityPolicy = {
  ...DEFAULT_SECURITY_POLICY,
  network: {
    mode: "local_only",
    allowLoopback: true,
    allowPrivate: false,
    allowTailscaleLan: false,
    allowPublic: false,
  },
};

export interface UrlSafetyResult {
  decision: SecurityDecision;
  url?: URL;
  addressClass: NetworkAddressClass;
  normalizedTimeoutMs: number;
  hadEmbeddedCredentials: boolean;
}

export interface CommandDescriptor {
  name: string;
  argv: readonly string[];
  shell: false;
  timeoutMs?: number;
  stdoutMaxBytes?: number;
  stderrMaxBytes?: number;
}

export interface CommandSafetyResult {
  decision: SecurityDecision;
  descriptor?: Required<CommandDescriptor>;
}

export interface ProofpackManifestMetadata {
  securityPolicyVersion: "1";
  generatedAt: string;
  redaction: "preflight_passed";
  secretBearingPayloadBlocked: boolean;
}

const ENV_KEY_PATTERN =
  /(^|[_-])(api[_-]?key|auth|authorization|bearer|client[_-]?secret|credential|password|private[_-]?key|refresh[_-]?token|secret|session[_-]?token|token)([_-]|$)/i;
const AUTH_HEADER_PATTERN = /^(authorization|proxy-authorization|x-api-key|api-key|x-auth-token|cookie|set-cookie)$/i;
const SIMPLE_COMMAND_NAME = /^[A-Za-z0-9._:-]+$/;
const SHELL_META = /[;&|`$<>(){}[\]\n\r]/;

function allow(reasonCode: SecurityReasonCode, explanation: string, metadata?: SecurityDecision["metadata"]): SecurityDecision {
  return { allowed: true, reasonCode, explanation, metadata };
}

function deny(reasonCode: SecurityReasonCode, explanation: string, metadata?: SecurityDecision["metadata"]): SecurityDecision {
  return { allowed: false, reasonCode, explanation, metadata };
}

export function normalizeTimeoutMs(
  timeoutMs: number | undefined,
  policy: { defaultTimeoutMs: number; timeoutCeilingMs: number; minimumTimeoutMs?: number },
): number {
  const minimumTimeoutMs = policy.minimumTimeoutMs ?? 250;
  if (typeof timeoutMs !== "number" || !Number.isFinite(timeoutMs)) return policy.defaultTimeoutMs;
  return Math.max(minimumTimeoutMs, Math.min(policy.timeoutCeilingMs, Math.trunc(timeoutMs)));
}

export function classifyNetworkHost(hostname: string): NetworkAddressClass {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host) return "unknown";
  if (host === "localhost" || host.endsWith(".localhost") || host === "::1") return "loopback";
  if (host === "0.0.0.0") return "private";

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (ipv4) {
    const parts = ipv4.slice(1).map(Number);
    if (parts.some((part) => part < 0 || part > 255)) return "unknown";
    const [a, b] = parts;
    if (a === 127) return "loopback";
    if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return "private";
    if (a === 169 && b === 254) return "lan_link_local";
    if (a === 100 && b >= 64 && b <= 127) return "tailscale_or_cgnat";
    return "public";
  }

  if (host === "fe80::" || host.startsWith("fe80:")) return "lan_link_local";
  if (host.startsWith("fc") || host.startsWith("fd")) return "private";
  if (host.includes(":")) return "public";
  return "hostname";
}

function isAddressClassAllowed(addressClass: NetworkAddressClass, policy: NetworkPolicy): boolean {
  if (addressClass === "loopback") return policy.allowLoopback;
  if (addressClass === "private" || addressClass === "lan_link_local") return policy.allowPrivate;
  if (addressClass === "tailscale_or_cgnat") return policy.allowTailscaleLan;
  if (addressClass === "public" || addressClass === "hostname") return policy.allowPublic;
  return false;
}

export function validateUrlForTransport(
  rawUrl: string,
  policy: SecurityPolicy = DEFAULT_SECURITY_POLICY,
  timeoutMs?: number,
): UrlSafetyResult {
  const normalizedTimeoutMs = normalizeTimeoutMs(timeoutMs, policy.transport);
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return {
      decision: deny("transport_url_invalid", "URL could not be parsed"),
      addressClass: "unknown",
      normalizedTimeoutMs,
      hadEmbeddedCredentials: false,
    };
  }

  if (!policy.transport.allowedSchemes.includes(parsed.protocol)) {
    return {
      decision: deny("unsupported_scheme", `Scheme ${parsed.protocol} is not supported`),
      addressClass: classifyNetworkHost(parsed.hostname),
      normalizedTimeoutMs,
      hadEmbeddedCredentials: Boolean(parsed.username || parsed.password),
    };
  }

  const hadEmbeddedCredentials = Boolean(parsed.username || parsed.password);
  if (hadEmbeddedCredentials && policy.transport.stripEmbeddedCredentials) {
    parsed.username = "";
    parsed.password = "";
  }
  parsed.hash = "";

  const addressClass = classifyNetworkHost(parsed.hostname);
  if (!isAddressClassAllowed(addressClass, policy.network)) {
    const reasonCode = policy.network.mode === "local_only" ? "local_only_violation" : "network_policy_blocked";
    return {
      decision: deny(reasonCode, `${addressClass} endpoint is blocked by ${policy.network.mode} policy`, {
        addressClass,
      }),
      url: parsed,
      addressClass,
      normalizedTimeoutMs,
      hadEmbeddedCredentials,
    };
  }

  return {
    decision: {
      ...allow(
        hadEmbeddedCredentials ? "embedded_url_credentials_stripped" : "allowed",
        hadEmbeddedCredentials ? "Embedded URL credentials were stripped" : "Transport URL allowed",
        { addressClass },
      ),
      sanitized: parsed.toString(),
    },
    url: parsed,
    addressClass,
    normalizedTimeoutMs,
    hadEmbeddedCredentials,
  };
}

export function validateLocalOnlyUrl(rawUrl: string, timeoutMs?: number): UrlSafetyResult {
  return validateUrlForTransport(rawUrl, LOCAL_ONLY_SECURITY_POLICY, timeoutMs);
}

export function validateRemoteUrl(rawUrl: string, timeoutMs?: number): UrlSafetyResult {
  return validateUrlForTransport(rawUrl, DEFAULT_SECURITY_POLICY, timeoutMs);
}

function isSensitiveKey(key: string, policy: SecretRedactionPolicy): boolean {
  return (policy.redactAuthHeaders && AUTH_HEADER_PATTERN.test(key)) || (policy.redactEnvLikeKeys && ENV_KEY_PATTERN.test(key));
}

export function redactSecurityString(value: string, policy: SecretRedactionPolicy = DEFAULT_SECURITY_POLICY.secretRedaction): string {
  const urlRedacted = policy.redactUrlCredentials ? (redactUrl(value) ?? value) : value;
  return redactFull(urlRedacted);
}

export function redactSecurityPayload<T>(
  payload: T,
  policy: SecretRedactionPolicy = DEFAULT_SECURITY_POLICY.secretRedaction,
): T {
  const walk = (value: unknown, depth: number, parentKey?: string): unknown => {
    if (parentKey && isSensitiveKey(parentKey, policy)) return policy.replacement;
    if (depth > policy.maxDepth) return "[REDACTION_DEPTH_LIMIT]";
    if (typeof value === "string") return redactSecurityString(value, policy);
    if (value === null || typeof value !== "object") return value;
    if (Array.isArray(value)) return value.map((item) => walk(item, depth + 1));
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        walk(item, depth + 1, key),
      ]),
    );
  };
  return walk(payload, 0) as T;
}

export function payloadContainsSecrets(payload: unknown, policy: SecretRedactionPolicy = DEFAULT_SECURITY_POLICY.secretRedaction): boolean {
  return JSON.stringify(payload) !== JSON.stringify(redactSecurityPayload(payload, policy));
}

export function validateCommandDescriptor(
  descriptor: Partial<CommandDescriptor>,
  policy: CommandExecutionPolicy = DEFAULT_SECURITY_POLICY.commandExecution,
): CommandSafetyResult {
  if (policy.requireShellFalse && descriptor.shell !== false) {
    return { decision: deny("command_shell_denied", "Command descriptors must set shell=false") };
  }
  const name = typeof descriptor.name === "string" ? descriptor.name.trim() : "";
  if (!name || !SIMPLE_COMMAND_NAME.test(name) || SHELL_META.test(name)) {
    return { decision: deny("command_descriptor_invalid", "Command name is empty or contains unsafe characters") };
  }
  const argv = Array.isArray(descriptor.argv) ? descriptor.argv : [];
  if (argv.some((arg) => typeof arg !== "string" || arg.includes("\0") || SHELL_META.test(arg))) {
    return { decision: deny("command_descriptor_invalid", "Command argv contains unsafe shell metacharacters") };
  }
  if (policy.denylist.includes(name)) {
    return { decision: deny("command_denylist_denied", `${name} is denied by command policy`) };
  }
  if (policy.allowlist && !policy.allowlist.includes(name)) {
    return { decision: deny("command_allowlist_denied", `${name} is not in the command allowlist`) };
  }
  return {
    decision: allow("allowed", "Command descriptor allowed", {
      stdoutMaxBytes: descriptor.stdoutMaxBytes ?? policy.stdoutMaxBytes,
      stderrMaxBytes: descriptor.stderrMaxBytes ?? policy.stderrMaxBytes,
    }),
    descriptor: {
      name,
      argv,
      shell: false,
      timeoutMs: normalizeTimeoutMs(descriptor.timeoutMs, policy),
      stdoutMaxBytes: descriptor.stdoutMaxBytes ?? policy.stdoutMaxBytes,
      stderrMaxBytes: descriptor.stderrMaxBytes ?? policy.stderrMaxBytes,
    },
  };
}

export function commandDescriptorFromString(command: string, timeoutMs?: number): Partial<CommandDescriptor> {
  if (SHELL_META.test(command)) return { name: command, argv: [], shell: false, timeoutMs };
  const [name = "", ...argv] = command.trim().split(/\s+/).filter(Boolean);
  return { name, argv, shell: false, timeoutMs };
}

export function validateCommandString(
  command: string,
  policy: CommandExecutionPolicy = DEFAULT_SECURITY_POLICY.commandExecution,
  timeoutMs?: number,
): CommandSafetyResult {
  return validateCommandDescriptor(commandDescriptorFromString(command, timeoutMs), policy);
}

export function buildSafeProofpackManifestMetadata(generatedAt: string): ProofpackManifestMetadata {
  return {
    securityPolicyVersion: "1",
    generatedAt,
    redaction: "preflight_passed",
    secretBearingPayloadBlocked: true,
  };
}

export function preflightProofpackExportPayload(
  payload: unknown,
  generatedAt: string,
  policy: SecurityPolicy = DEFAULT_SECURITY_POLICY,
): { decision: SecurityDecision; manifest?: ProofpackManifestMetadata; redactedPayload?: unknown } {
  const redactedPayload = redactSecurityPayload(payload, policy.secretRedaction);
  if (policy.proofpackExport.blockSecretBearingPayloads && JSON.stringify(payload) !== JSON.stringify(redactedPayload)) {
    return {
      decision: deny("proofpack_secret_detected", "Proofpack/export payload contains secret-bearing fields"),
      redactedPayload,
    };
  }
  return {
    decision: allow("allowed", "Proofpack/export preflight passed"),
    manifest: policy.proofpackExport.includeSafeManifestMetadata
      ? buildSafeProofpackManifestMetadata(generatedAt)
      : undefined,
    redactedPayload,
  };
}
