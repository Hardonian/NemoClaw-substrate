// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Proofpack access controls: encrypt at rest, validate integrity before consumption.
 *
 * Provides access control checks, integrity validation, and encryption
 * helpers for proofpack data.
 */

import crypto from "node:crypto";

export type AccessLevel = "read" | "write" | "admin";

export interface AccessControlRule {
  role: string;
  allowedActions: AccessLevel[];
  resourcePattern: string;
}

export interface AccessCheckResult {
  allowed: boolean;
  reason: string;
  level?: AccessLevel;
}

export interface IntegrityCheckResult {
  valid: boolean;
  expectedHash: string;
  actualHash: string;
  algorithm: string;
}

export interface ProofpackAccessConfig {
  accessRules: AccessControlRule[];
  integrityAlgorithm: "sha256" | "sha384" | "sha512";
  encryptionAlgorithm: "aes-256-gcm" | "aes-256-cbc";
}

export const DEFAULT_PROOFPACK_CONFIG: ProofpackAccessConfig = {
  accessRules: [
    { role: "admin", allowedActions: ["read", "write", "admin"], resourcePattern: "*" },
    { role: "writer", allowedActions: ["read", "write"], resourcePattern: "*" },
    { role: "reader", allowedActions: ["read"], resourcePattern: "*" },
  ],
  integrityAlgorithm: "sha256",
  encryptionAlgorithm: "aes-256-gcm",
};

/**
 * Check if a role has the required access level for a resource.
 */
export function checkAccess(
  role: string,
  requiredLevel: AccessLevel,
  resource: string,
  config: ProofpackAccessConfig = DEFAULT_PROOFPACK_CONFIG,
): AccessCheckResult {
  const accessLevelOrder: AccessLevel[] = ["read", "write", "admin"];
  const requiredIdx = accessLevelOrder.indexOf(requiredLevel);

  for (const rule of config.accessRules) {
    if (rule.role !== role) continue;
    if (!matchesResourcePattern(rule.resourcePattern, resource)) continue;

    const maxAllowed = rule.allowedActions.reduce(
      (max, action) => {
        const idx = accessLevelOrder.indexOf(action);
        return idx > max ? idx : max;
      },
      -1,
    );

    if (maxAllowed >= requiredIdx) {
      return {
        allowed: true,
        reason: `Role "${role}" has "${requiredLevel}" access to "${resource}"`,
        level: accessLevelOrder[maxAllowed],
      };
    }

    return {
      allowed: false,
      reason: `Role "${role}" lacks "${requiredLevel}" access to "${resource}" (max: ${accessLevelOrder[maxAllowed] ?? "none"})`,
    };
  }

  return {
    allowed: false,
    reason: `No access rule found for role "${role}" on resource "${resource}"`,
  };
}

/**
 * Simple glob-style pattern matching for resource patterns.
 */
function matchesResourcePattern(pattern: string, resource: string): boolean {
  if (pattern === "*") return true;
  const regexPattern = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\\\*/g, ".*");
  return new RegExp(`^${regexPattern}$`).test(resource);
}

/**
 * Compute integrity hash of content using the configured algorithm.
 */
export function computeIntegrityHash(
  content: string | Buffer,
  algorithm: "sha256" | "sha384" | "sha512" = "sha256",
): string {
  const hash = crypto.createHash(algorithm);
  hash.update(typeof content === "string" ? Buffer.from(content, "utf-8") : content);
  return hash.digest("hex");
}

/**
 * Validate content integrity against an expected hash.
 */
export function validateIntegrity(
  content: string | Buffer,
  expectedHash: string,
  algorithm: "sha256" | "sha384" | "sha512" = "sha256",
): IntegrityCheckResult {
  const actualHash = computeIntegrityHash(content, algorithm);
  return {
    valid: actualHash === expectedHash,
    expectedHash,
    actualHash,
    algorithm,
  };
}

/**
 * Encrypt data at rest using AES-256-GCM.
 * Returns an object with ciphertext, iv, authTag, and algorithm.
 */
export function encryptAtRest(
  plaintext: string | Buffer,
  key: Buffer,
): { ciphertext: string; iv: string; authTag: string; algorithm: string } {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const plaintextBuffer = typeof plaintext === "string" ? Buffer.from(plaintext, "utf-8") : plaintext;
  const encrypted = Buffer.concat([cipher.update(plaintextBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString("hex"),
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
    algorithm: "aes-256-gcm",
  };
}

/**
 * Decrypt data encrypted with encryptAtRest.
 */
export function decryptAtRest(
  ciphertext: string,
  iv: string,
  authTag: string,
  key: Buffer,
): Buffer {
  const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(iv, "hex"), key);
  decipher.setAuthTag(Buffer.from(authTag, "hex"));

  const decrypted = decipher.update(Buffer.from(ciphertext, "hex"));
  const final = decipher.final();

  return Buffer.concat([decrypted, final]);
}

/**
 * Generate a secure random key for AES-256.
 */
export function generateAesKey(): Buffer {
  return crypto.randomBytes(32);
}

/**
 * Quick check: does a role have read access?
 */
export function canRead(role: string, resource: string, config?: ProofpackAccessConfig): boolean {
  return checkAccess(role, "read", resource, config).allowed;
}

/**
 * Quick check: does a role have write access?
 */
export function canWrite(role: string, resource: string, config?: ProofpackAccessConfig): boolean {
  return checkAccess(role, "write", resource, config).allowed;
}

/**
 * Quick check: does a role have admin access?
 */
export function canAdmin(role: string, resource: string, config?: ProofpackAccessConfig): boolean {
  return checkAccess(role, "admin", resource, config).allowed;
}
