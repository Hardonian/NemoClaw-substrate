// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from "vitest";
import { createDeviceRegistry } from "./device-registry";
import type { PolicyBundle } from "./governance";
import {
  computeOutputHash,
  executeRemoteWorkerProof,
  executeSignedHttps,
  executeSshCommand,
  parseRemoteExecutionConfig,
  runRemoteExecution,
  verifyResultHash,
} from "./remote-execution";

const allowPolicy: PolicyBundle = { version: "1", id: "b1", defaultEffect: "allow", rules: [] };
const now = "2026-05-09T00:00:00.000Z";

describe("remote worker proof", () => {
  describe("computeOutputHash", () => {
    it("produces a deterministic sha256 hex hash", () => {
      const h1 = computeOutputHash("hello");
      const h2 = computeOutputHash("hello");
      expect(h1).toBe(h2);
      expect(h1).toHaveLength(64);
      expect(computeOutputHash("hello")).not.toBe(computeOutputHash("world"));
    });
  });

  describe("verifyResultHash", () => {
    it("returns true when hash matches", () => {
      const output = "test output";
      const hash = computeOutputHash(output);
      expect(verifyResultHash(output, hash)).toBe(true);
    });

    it("returns false when hash mismatches", () => {
      expect(verifyResultHash("hello", "abc123")).toBe(false);
    });

    it("returns true when no expected hash provided", () => {
      expect(verifyResultHash("anything", "")).toBe(true);
      expect(verifyResultHash("anything", undefined as unknown as string)).toBe(true);
    });
  });

  describe("executeRemoteWorkerProof", () => {
    it("returns error for unsupported transport", async () => {
      const result = await executeRemoteWorkerProof(
        { transportType: "http" as never, credentials: {} as never, timeoutMs: 5000 },
        "echo test",
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe("unsupported_transport");
    });

    it("returns error for missing SSH credentials", async () => {
      const result = await executeRemoteWorkerProof(
        { transportType: "ssh", credentials: { host: "", user: "", port: 22 }, timeoutMs: 5000 },
        "echo test",
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe("missing_ssh_credentials");
    });

    it("returns error for missing signed HTTPS credentials", async () => {
      const result = await executeRemoteWorkerProof(
        { transportType: "https-signed", credentials: { endpoint: "", signingKey: "" }, timeoutMs: 5000 },
        "echo test",
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe("missing_signed_https_credentials");
    });

    it("detects hash mismatch when response succeeds but hash differs", async () => {
      const result = await executeRemoteWorkerProof(
        { transportType: "https-signed", credentials: { endpoint: "https://localhost:99999", signingKey: "key" }, timeoutMs: 100, expectedOutputHash: "wrong_hash" },
        "test",
      );
      expect(result.success).toBe(false);
      expect(result.hashMatches).toBe(false);
    });
  });

  describe("executeSignedHttps", () => {
    it("returns error status for unreachable endpoint", async () => {
      const result = await executeSignedHttps("https://localhost:1", "test", 1000, "key");
      expect(result.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("executeSshCommand", () => {
    it("returns error for unreachable host", async () => {
      const result = await executeSshCommand({ host: "localhost", port: 1, user: "test" }, "echo test", 1000);
      expect(result.exitCode).not.toBe(0);
    });
  });

  describe("runRemoteExecution with SSH transport", () => {
    it("blocks SSH transport when disabled", async () => {
      const transport = { execute: vi.fn() };
      const out = await runRemoteExecution({
        request: { requestId: "r-ssh-disabled", nowIso: now, action: "worker:execute", command: "echo hi", targetEndpoint: "ssh://host", transportType: "ssh" },
        config: { enabled: false, source: "default" },
        transport,
        policyBundle: allowPolicy,
        registry: createDeviceRegistry(),
      });
      expect(out.status).toBe("disabled");
      expect(transport.execute).not.toHaveBeenCalled();
    });

    it("blocks SSH transport when credentials missing", async () => {
      const transport = { execute: vi.fn() };
      const out = await runRemoteExecution({
        request: { requestId: "r-ssh-no-creds", nowIso: now, action: "worker:execute", command: "echo hi", targetEndpoint: "ssh://host", transportType: "ssh" },
        config: { enabled: true, source: "env" },
        transport,
        policyBundle: allowPolicy,
        registry: createDeviceRegistry(),
      });
      expect(out.status).toBe("failed");
      expect(out.degradedReason).toBe("missing_ssh_credentials");
    });

    it("blocks SSH transport for denied command", async () => {
      const transport = { execute: vi.fn() };
      const out = await runRemoteExecution({
        request: {
          requestId: "r-ssh-cmd-denied",
          nowIso: now,
          action: "worker:execute",
          command: "curl https://example.com",
          commandPolicy: { allowlist: ["echo"], denylist: [], timeoutCeilingMs: 10_000, defaultTimeoutMs: 2_000, stdoutMaxBytes: 100, stderrMaxBytes: 100, requireShellFalse: true },
          targetEndpoint: "ssh://host",
          transportType: "ssh",
          sshCredentials: { host: "localhost", port: 22, user: "test" },
        },
        config: { enabled: true, source: "env" },
        transport,
        policyBundle: allowPolicy,
        registry: createDeviceRegistry(),
      });
      expect(out.status).toBe("failed");
      expect(out.degradedReason).toBe("command_allowlist_denied");
    });
  });

  describe("runRemoteExecution with signed HTTPS transport", () => {
    it("blocks signed HTTPS transport when disabled", async () => {
      const transport = { execute: vi.fn() };
      const out = await runRemoteExecution({
        request: { requestId: "r-https-disabled", nowIso: now, action: "worker:execute", command: "echo hi", targetEndpoint: "https://host", transportType: "https-signed" },
        config: { enabled: false, source: "default" },
        transport,
        policyBundle: allowPolicy,
        registry: createDeviceRegistry(),
      });
      expect(out.status).toBe("disabled");
    });

    it("blocks signed HTTPS when endpoint missing", async () => {
      const transport = { execute: vi.fn() };
      const out = await runRemoteExecution({
        request: { requestId: "r-https-no-ep", nowIso: now, action: "worker:execute", command: "echo hi", transportType: "https-signed", auth: { headerName: "X-Key", token: "secret" } },
        config: { enabled: true, source: "env" },
        transport,
        policyBundle: allowPolicy,
        registry: createDeviceRegistry(),
      });
      expect(out.status).toBe("failed");
      expect(out.degradedReason).toBe("invalid_endpoint");
    });

    it("blocks signed HTTPS when signing key missing", async () => {
      const transport = { execute: vi.fn() };
      const out = await runRemoteExecution({
        request: { requestId: "r-https-no-key", nowIso: now, action: "worker:execute", command: "echo hi", targetEndpoint: "https://host", transportType: "https-signed" },
        config: { enabled: true, source: "env" },
        transport,
        policyBundle: allowPolicy,
        registry: createDeviceRegistry(),
      });
      expect(out.status).toBe("failed");
      expect(out.degradedReason).toBe("missing_signing_key");
    });
  });

  describe("runRemoteExecution HTTP with output hash verification", () => {
    it("succeeds when output hash matches", async () => {
      const output = "verified output";
      const expectedHash = computeOutputHash(output);
      const transport = { execute: vi.fn().mockResolvedValue({ status: 200, body: JSON.stringify({ status: "ok", output }) }) };
      const out = await runRemoteExecution({
        request: { requestId: "r-hash-ok", nowIso: now, action: "worker:execute", command: "echo hi", targetEndpoint: "https://host", expectedOutputHash: expectedHash },
        config: { enabled: true, source: "env" },
        transport,
        policyBundle: allowPolicy,
        registry: createDeviceRegistry(),
      });
      expect(out.status).toBe("succeeded");
      expect(out.outputHash).toBe(expectedHash);
    });

    it("fails when output hash mismatches", async () => {
      const transport = { execute: vi.fn().mockResolvedValue({ status: 200, body: JSON.stringify({ status: "ok", output: "real output" }) }) };
      const out = await runRemoteExecution({
        request: { requestId: "r-hash-fail", nowIso: now, action: "worker:execute", command: "echo hi", targetEndpoint: "https://host", expectedOutputHash: "wrong_hash" },
        config: { enabled: true, source: "env" },
        transport,
        policyBundle: allowPolicy,
        registry: createDeviceRegistry(),
      });
      expect(out.status).toBe("failed");
      expect(out.degradedReason).toBe("output_hash_mismatch");
    });
  });

  describe("opt-in default behavior", () => {
    it("remote execution is disabled by default", () => {
      expect(parseRemoteExecutionConfig({})).toEqual({ enabled: false, source: "default" });
    });

    it("requires explicit opt-in to enable", () => {
      expect(parseRemoteExecutionConfig({ NEMOCLAW_REMOTE_EXECUTION: "1" })).toEqual({ enabled: true, source: "env" });
      expect(parseRemoteExecutionConfig({ NEMOCLAW_REMOTE_EXECUTION: "0" })).toEqual({ enabled: false, source: "default" });
    });
  });

  describe("no background workers", () => {
    it("all transport functions complete synchronously without retries", async () => {
      const result = await executeRemoteWorkerProof(
        { transportType: "https-signed", credentials: { endpoint: "https://localhost:1", signingKey: "k" }, timeoutMs: 100 },
        "test",
      );
      expect(result.durationMs).toBeLessThan(2000);
    });
  });
});
