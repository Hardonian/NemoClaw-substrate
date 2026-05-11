// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
  checkAccess,
  computeIntegrityHash,
  validateIntegrity,
  encryptAtRest,
  decryptAtRest,
  generateAesKey,
  canRead,
  canWrite,
  canAdmin,
} from "./proofpack-access";

describe("checkAccess", () => {
  it("allows admin all actions", () => {
    const result = checkAccess("admin", "admin", "resource");
    expect(result.allowed).toBe(true);
    expect(result.level).toBe("admin");
  });

  it("allows writer read and write", () => {
    expect(checkAccess("writer", "read", "resource").allowed).toBe(true);
    expect(checkAccess("writer", "write", "resource").allowed).toBe(true);
    expect(checkAccess("writer", "admin", "resource").allowed).toBe(false);
  });

  it("allows reader only read", () => {
    expect(checkAccess("reader", "read", "resource").allowed).toBe(true);
    expect(checkAccess("reader", "write", "resource").allowed).toBe(false);
    expect(checkAccess("reader", "admin", "resource").allowed).toBe(false);
  });

  it("denies unknown roles", () => {
    const result = checkAccess("unknown", "read", "resource");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("No access rule found");
  });

  it("respects resource patterns", () => {
    const config = {
      accessRules: [
        { role: "reader", allowedActions: ["read"], resourcePattern: "docs/*" },
      ],
      integrityAlgorithm: "sha256" as const,
      encryptionAlgorithm: "aes-256-gcm" as const,
    };

    expect(checkAccess("reader", "read", "docs/readme", config).allowed).toBe(true);
    expect(checkAccess("reader", "read", "secrets/key", config).allowed).toBe(false);
  });

  it("supports glob patterns in resource matching", () => {
    const config = {
      accessRules: [
        { role: "reader", allowedActions: ["read"], resourcePattern: "public/*" },
      ],
      integrityAlgorithm: "sha256" as const,
      encryptionAlgorithm: "aes-256-gcm" as const,
    };

    expect(checkAccess("reader", "read", "public/index", config).allowed).toBe(true);
    expect(checkAccess("reader", "read", "private/index", config).allowed).toBe(false);
  });
});

describe("computeIntegrityHash", () => {
  it("produces deterministic hashes", () => {
    const hash1 = computeIntegrityHash("hello world");
    const hash2 = computeIntegrityHash("hello world");
    expect(hash1).toBe(hash2);
  });

  it("produces different hashes for different content", () => {
    const hash1 = computeIntegrityHash("hello");
    const hash2 = computeIntegrityHash("world");
    expect(hash1).not.toBe(hash2);
  });

  it("supports different algorithms", () => {
    const sha256 = computeIntegrityHash("test", "sha256");
    const sha384 = computeIntegrityHash("test", "sha384");
    const sha512 = computeIntegrityHash("test", "sha512");
    expect(sha256.length).toBe(64);
    expect(sha384.length).toBe(96);
    expect(sha512.length).toBe(128);
    expect(sha256).not.toBe(sha384);
    expect(sha384).not.toBe(sha512);
  });

  it("accepts Buffer input", () => {
    const hash = computeIntegrityHash(Buffer.from("hello"));
    expect(typeof hash).toBe("string");
    expect(hash.length).toBe(64);
  });
});

describe("validateIntegrity", () => {
  it("validates matching hashes", () => {
    const content = "test content";
    const hash = computeIntegrityHash(content);
    const result = validateIntegrity(content, hash);
    expect(result.valid).toBe(true);
    expect(result.expectedHash).toBe(result.actualHash);
  });

  it("detects tampered content", () => {
    const content = "original content";
    const hash = computeIntegrityHash(content);
    const result = validateIntegrity("tampered content", hash);
    expect(result.valid).toBe(false);
    expect(result.expectedHash).not.toBe(result.actualHash);
  });

  it("includes algorithm in result", () => {
    const content = "test";
    const hash = computeIntegrityHash(content, "sha384");
    const result = validateIntegrity(content, hash, "sha384");
    expect(result.algorithm).toBe("sha384");
  });
});

describe("encryptAtRest", () => {
  it("encrypts and decrypts correctly", () => {
    const key = generateAesKey();
    const plaintext = "secret data to encrypt";
    const encrypted = encryptAtRest(plaintext, key);
    const decrypted = decryptAtRest(encrypted.ciphertext, encrypted.iv, encrypted.authTag, key);

    expect(decrypted.toString("utf-8")).toBe(plaintext);
  });

  it("produces different ciphertext for same plaintext (random IV)", () => {
    const key = generateAesKey();
    const plaintext = "same plaintext";
    const enc1 = encryptAtRest(plaintext, key);
    const enc2 = encryptAtRest(plaintext, key);

    expect(enc1.ciphertext).not.toBe(enc2.ciphertext);
    expect(enc1.iv).not.toBe(enc2.iv);
  });

  it("fails to decrypt with wrong key", () => {
    const key1 = generateAesKey();
    const key2 = generateAesKey();
    const plaintext = "secret";
    const encrypted = encryptAtRest(plaintext, key1);

    expect(() => {
      decryptAtRest(encrypted.ciphertext, encrypted.iv, encrypted.authTag, key2);
    }).toThrow();
  });

  it("fails to decrypt with tampered auth tag", () => {
    const key = generateAesKey();
    const plaintext = "secret";
    const encrypted = encryptAtRest(plaintext, key);
    const tamperedTag = "00".repeat(16);

    expect(() => {
      decryptAtRest(encrypted.ciphertext, encrypted.iv, tamperedTag, key);
    }).toThrow();
  });

  it("accepts Buffer input", () => {
    const key = generateAesKey();
    const plaintext = Buffer.from("binary data");
    const encrypted = encryptAtRest(plaintext, key);
    const decrypted = decryptAtRest(encrypted.ciphertext, encrypted.iv, encrypted.authTag, key);

    expect(decrypted.equals(plaintext)).toBe(true);
  });
});

describe("generateAesKey", () => {
  it("generates 32-byte keys", () => {
    const key = generateAesKey();
    expect(key.length).toBe(32);
  });

  it("generates different keys each time", () => {
    const key1 = generateAesKey();
    const key2 = generateAesKey();
    expect(key1.toString("hex")).not.toBe(key2.toString("hex"));
  });
});

describe("convenience access checkers", () => {
  it("canRead returns true for reader role", () => {
    expect(canRead("reader", "resource")).toBe(true);
    expect(canRead("writer", "resource")).toBe(true);
    expect(canRead("admin", "resource")).toBe(true);
  });

  it("canWrite returns true for writer and admin", () => {
    expect(canWrite("reader", "resource")).toBe(false);
    expect(canWrite("writer", "resource")).toBe(true);
    expect(canWrite("admin", "resource")).toBe(true);
  });

  it("canAdmin returns true only for admin", () => {
    expect(canAdmin("reader", "resource")).toBe(false);
    expect(canAdmin("writer", "resource")).toBe(false);
    expect(canAdmin("admin", "resource")).toBe(true);
  });

  it("accepts custom config", () => {
    const config = {
      accessRules: [
        { role: "custom", allowedActions: ["read", "write"], resourcePattern: "*" },
      ],
      integrityAlgorithm: "sha256" as const,
      encryptionAlgorithm: "aes-256-gcm" as const,
    };

    expect(canRead("custom", "resource", config)).toBe(true);
    expect(canWrite("custom", "resource", config)).toBe(true);
    expect(canAdmin("custom", "resource", config)).toBe(false);
  });
});
