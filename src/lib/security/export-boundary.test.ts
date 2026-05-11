// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
  classifyData,
  checkExportBoundary,
  isExportSafe,
  safeExport,
} from "./export-boundary";

describe("classifyData", () => {
  it("classifies null and primitives as public", () => {
    expect(classifyData(null)).toBe("public");
    expect(classifyData(undefined)).toBe("public");
    expect(classifyData(true)).toBe("public");
    expect(classifyData(42)).toBe("public");
    expect(classifyData("hello")).toBe("public");
  });

  it("classifies strings with secret indicators as secret", () => {
    expect(classifyData("nvapi-abcdefghij1234567890")).toBe("secret");
    expect(classifyData("sk-proj-abcdefghijklmnopqrstuvwxyz")).toBe("secret");
    expect(classifyData("Bearer someSecretToken123456")).toBe("secret");
  });

  it("classifies strings with PII as secret", () => {
    expect(classifyData("123-45-6789")).toBe("secret");
    expect(classifyData("user@example.com")).toBe("secret");
  });

  it("classifies strings with internal indicators as internal", () => {
    expect(classifyData("internal debug trace")).toBe("internal");
    expect(classifyData("staging data")).toBe("internal");
  });

  it("classifies objects with secret keys as secret", () => {
    expect(classifyData({ apiKey: "sk-1234567890abcdefghijklmnop" })).toBe("secret");
    expect(classifyData({ password: "hunter2" })).toBe("secret");
    expect(classifyData({ token: "abc123" })).toBe("secret");
  });

  it("classifies objects with secret values as secret", () => {
    expect(classifyData({ data: "nvapi-abcdefghij1234567890" })).toBe("secret");
  });

  it("classifies arrays by their highest-sensitivity element", () => {
    expect(classifyData(["safe", "also safe"])).toBe("public");
    expect(classifyData(["safe", "internal trace"])).toBe("internal");
    expect(classifyData(["safe", "nvapi-abcdefghij1234567890"])).toBe("secret");
  });

  it("classifies nested objects recursively", () => {
    expect(
      classifyData({
        public: { name: "test" },
        nested: { deep: { apiKey: "sk-1234567890abcdefghijklmnop" } },
      }),
    ).toBe("secret");
  });
});

describe("checkExportBoundary", () => {
  it("allows public data with default policy", () => {
    const result = checkExportBoundary({ name: "test", value: 42 });
    expect(result.allowed).toBe(true);
    expect(result.classification).toBe("public");
  });

  it("blocks secret data with default policy", () => {
    const result = checkExportBoundary({ apiKey: "sk-1234567890abcdefghijklmnop" });
    expect(result.allowed).toBe(false);
    expect(result.classification).toBe("secret");
  });

  it("allows data after auto-redaction", () => {
    const result = checkExportBoundary(
      { name: "test", data: "nvapi-abcdefghij1234567890" },
      { allowedClassifications: ["public"], autoRedact: true, failOpen: false },
    );
    expect(result.allowed).toBe(true);
    expect(result.reason).toContain("redaction");
  });

  it("fails open when configured", () => {
    const result = checkExportBoundary(
      { apiKey: "sk-1234567890abcdefghijklmnop" },
      { allowedClassifications: ["public"], autoRedact: false, failOpen: true },
    );
    expect(result.allowed).toBe(true);
    expect(result.reason).toContain("Fail-open");
  });

  it("rejects internal data when only public is allowed", () => {
    const result = checkExportBoundary("staging debug trace");
    expect(result.allowed).toBe(false);
    expect(result.classification).toBe("internal");
  });

  it("allows internal data when internal is in allowed list", () => {
    const result = checkExportBoundary(
      "staging debug trace",
      { allowedClassifications: ["public", "internal"], autoRedact: false, failOpen: false },
    );
    expect(result.allowed).toBe(true);
  });
});

describe("isExportSafe", () => {
  it("returns true for safe data", () => {
    expect(isExportSafe({ name: "test" })).toBe(true);
  });

  it("returns false for secret data", () => {
    expect(isExportSafe({ apiKey: "sk-1234567890abcdefghijklmnop" })).toBe(false);
  });
});

describe("safeExport", () => {
  it("returns payload for safe data", () => {
    const result = safeExport({ name: "test" });
    expect(result).toEqual({ name: "test" });
  });

  it("throws on policy violation", () => {
    expect(() => safeExport({ apiKey: "sk-1234567890abcdefghijklmnop" })).toThrow(
      "Export boundary violation",
    );
  });

  it("returns redacted version when autoRedact succeeds", () => {
    const result = safeExport(
      { name: "test", data: "nvapi-abcdefghij1234567890" },
      { allowedClassifications: ["public"], autoRedact: true, failOpen: false },
    );
    expect(result).toBeDefined();
  });
});
