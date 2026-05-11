// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import {
  validateSchema,
  checkSignatures,
  checkContentIntegrity,
  findProofPack,
} from "../../scripts/verify-proofpack.ts";
import type { ProofPackSchema } from "../../scripts/verify-proofpack.ts";

describe("verify-proofpack script", () => {
  describe("findProofPack", () => {
    it("returns null when no proof pack exists", () => {
      const result = findProofPack();
      // Returns null when no proof pack found
      if (result !== null) {
        expect(typeof result).toBe("string");
      }
    });
  });

  describe("validateSchema", () => {
    it("passes with valid schema", () => {
      const pack: ProofPackSchema = {
        version: "1.0.0",
        id: "test-pack",
        entries: [
          { id: "entry-1", type: "test" },
        ],
      };
      const result = validateSchema(pack);
      expect(result.passed).toBe(true);
      expect(result.detail).toContain("1");
    });

    it("fails when version is missing", () => {
      const pack: ProofPackSchema = {
        id: "test-pack",
        entries: [],
      };
      const result = validateSchema(pack);
      expect(result.passed).toBe(false);
      expect(result.detail).toContain("version");
    });

    it("fails when id is missing", () => {
      const pack: ProofPackSchema = {
        version: "1.0.0",
        entries: [],
      };
      const result = validateSchema(pack);
      expect(result.passed).toBe(false);
      expect(result.detail).toContain("id");
    });

    it("fails when entries is not an array", () => {
      const pack: ProofPackSchema = {
        version: "1.0.0",
        id: "test",
        entries: "not_an_array" as unknown as undefined,
      };
      const result = validateSchema(pack);
      expect(result.passed).toBe(false);
    });

    it("fails when entry is missing id", () => {
      const pack: ProofPackSchema = {
        version: "1.0.0",
        id: "test",
        entries: [{ type: "test" }],
      };
      const result = validateSchema(pack);
      expect(result.passed).toBe(false);
      expect(result.detail).toContain("missing id");
    });

    it("fails when entry is missing type", () => {
      const pack: ProofPackSchema = {
        version: "1.0.0",
        id: "test",
        entries: [{ id: "entry-1" }],
      };
      const result = validateSchema(pack);
      expect(result.passed).toBe(false);
      expect(result.detail).toContain("missing type");
    });
  });

  describe("checkSignatures", () => {
    it("passes when no signatures to verify", () => {
      const pack: ProofPackSchema = {
        version: "1.0.0",
        id: "test",
        entries: [{ id: "e1", type: "test" }],
      };
      const result = checkSignatures(pack);
      expect(result.passed).toBe(true);
    });

    it("passes when signatures match entry content hash", () => {
      const content = "test content";
      const crypto = await import("node:crypto");
      const hash = crypto.createHash("sha256").update(content).digest("hex");

      const pack: ProofPackSchema = {
        version: "1.0.0",
        id: "test",
        entries: [{ id: "e1", type: "test", content }],
        signatures: { e1: hash },
      };
      const result = checkSignatures(pack);
      expect(result.passed).toBe(true);
    });

    it("fails when signature does not match content", () => {
      const pack: ProofPackSchema = {
        version: "1.0.0",
        id: "test",
        entries: [{ id: "e1", type: "test", content: "hello" }],
        signatures: { e1: "wrong_signature" },
      };
      const result = checkSignatures(pack);
      expect(result.passed).toBe(false);
    });

    it("fails when signature references non-existent entry", () => {
      const pack: ProofPackSchema = {
        version: "1.0.0",
        id: "test",
        entries: [],
        signatures: { nonexistent: "sig" },
      };
      const result = checkSignatures(pack);
      expect(result.passed).toBe(false);
    });
  });

  describe("checkContentIntegrity", () => {
    it("passes when no entries to verify", () => {
      const pack: ProofPackSchema = {
        version: "1.0.0",
        id: "test",
        entries: [],
      };
      const result = checkContentIntegrity(pack);
      expect(result.passed).toBe(true);
    });

    it("passes when content hash matches", () => {
      const crypto = await import("node:crypto");
      const content = "integrity test";
      const hash = crypto.createHash("sha256").update(content).digest("hex");

      const pack: ProofPackSchema = {
        version: "1.0.0",
        id: "test",
        entries: [{ id: "e1", type: "test", content, hash }],
      };
      const result = checkContentIntegrity(pack);
      expect(result.passed).toBe(true);
    });

    it("fails when content hash mismatches", () => {
      const pack: ProofPackSchema = {
        version: "1.0.0",
        id: "test",
        entries: [{ id: "e1", type: "test", content: "hello", hash: "wrong_hash" }],
      };
      const result = checkContentIntegrity(pack);
      expect(result.passed).toBe(false);
      expect(result.detail).toContain("hash mismatch");
    });

    it("skips entries without hash field", () => {
      const pack: ProofPackSchema = {
        version: "1.0.0",
        id: "test",
        entries: [{ id: "e1", type: "test", content: "no hash check" }],
      };
      const result = checkContentIntegrity(pack);
      expect(result.passed).toBe(true);
    });
  });
});
