// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import {
  parseProofpack,
  proofpackAllVerified,
  diffProofpack,
  formatProofpack,
} from "./proofpack-inspect";

function makeRawProofpack(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    metadata: {
      version: "1.0",
      createdAt: "2026-01-15T12:00:00Z",
      sessionId: "sess-123",
      agent: "openclaw",
      model: "gpt-4",
    },
    signatures: [
      {
        algorithm: "ed25519",
        publicKey: "pk-abc",
        value: "sig-xyz",
        verified: true,
      },
    ],
    summary: {
      totalSteps: 10,
      totalTokens: 5000,
      durationMs: 30000,
      toolsUsed: ["search", "edit"],
    },
    ...overrides,
  };
}

describe("parseProofpack", () => {
  it("parses valid proofpack", () => {
    const info = parseProofpack(makeRawProofpack());
    expect(info.metadata.version).toBe("1.0");
    expect(info.metadata.sessionId).toBe("sess-123");
    expect(info.signatures).toHaveLength(1);
    expect(info.signatures[0].algorithm).toBe("ed25519");
    expect(info.summary.totalSteps).toBe(10);
    expect(info.summary.toolsUsed).toEqual(["search", "edit"]);
  });

  it("handles missing fields with defaults", () => {
    const info = parseProofpack({});
    expect(info.metadata.version).toBe("unknown");
    expect(info.metadata.sessionId).toBe("");
    expect(info.signatures).toEqual([]);
    expect(info.summary.totalSteps).toBe(0);
    expect(info.summary.totalTokens).toBe(0);
    expect(info.summary.durationMs).toBe(0);
    expect(info.summary.toolsUsed).toEqual([]);
  });

  it("handles non-array signatures", () => {
    const info = parseProofpack({ signatures: "not-an-array" });
    expect(info.signatures).toEqual([]);
  });

  it("handles non-array toolsUsed", () => {
    const info = parseProofpack({ summary: { toolsUsed: "not-array" } });
    expect(info.summary.toolsUsed).toEqual([]);
  });
});

describe("proofpackAllVerified", () => {
  it("returns true when all signatures verified", () => {
    const info = parseProofpack(makeRawProofpack());
    expect(proofpackAllVerified(info)).toBe(true);
  });

  it("returns false when any signature unverified", () => {
    const info = parseProofpack(
      makeRawProofpack({
        signatures: [
          { algorithm: "ed25519", publicKey: "pk", value: "sig", verified: true },
          { algorithm: "rsa", publicKey: "pk2", value: "sig2", verified: false },
        ],
      }),
    );
    expect(proofpackAllVerified(info)).toBe(false);
  });

  it("returns false when no signatures", () => {
    const info = parseProofpack({});
    expect(proofpackAllVerified(info)).toBe(false);
  });
});

describe("diffProofpack", () => {
  it("returns empty for identical proofpacks", () => {
    const raw = makeRawProofpack();
    const a = parseProofpack(raw);
    const b = parseProofpack(raw);
    expect(diffProofpack(a, b)).toEqual([]);
  });

  it("detects metadata differences", () => {
    const a = parseProofpack(makeRawProofpack());
    const b = parseProofpack(
      makeRawProofpack({ metadata: { version: "2.0", createdAt: "2026-01-15T12:00:00Z", sessionId: "sess-456", agent: "openclaw", model: "gpt-4" } }),
    );
    const diffs = diffProofpack(a, b);
    expect(diffs.some((d) => d.field === "metadata.version")).toBe(true);
    expect(diffs.some((d) => d.field === "metadata.sessionId")).toBe(true);
  });

  it("detects summary differences", () => {
    const a = parseProofpack(makeRawProofpack());
    const b = parseProofpack(
      makeRawProofpack({ summary: { totalSteps: 20, totalTokens: 5000, durationMs: 30000, toolsUsed: ["search", "edit"] } }),
    );
    const diffs = diffProofpack(a, b);
    expect(diffs.some((d) => d.field === "summary.totalSteps")).toBe(true);
  });

  it("detects tool differences", () => {
    const a = parseProofpack(makeRawProofpack());
    const b = parseProofpack(
      makeRawProofpack({ summary: { totalSteps: 10, totalTokens: 5000, durationMs: 30000, toolsUsed: ["search", "bash"] } }),
    );
    const diffs = diffProofpack(a, b);
    expect(diffs.some((d) => d.field === "summary.toolsUsed")).toBe(true);
  });

  it("detects signature verification differences", () => {
    const a = parseProofpack(makeRawProofpack());
    const b = parseProofpack(
      makeRawProofpack({
        signatures: [
          { algorithm: "ed25519", publicKey: "pk-abc", value: "sig-xyz", verified: false },
        ],
      }),
    );
    const diffs = diffProofpack(a, b);
    expect(diffs.some((d) => d.field === "signatures.allVerified")).toBe(true);
  });
});

describe("formatProofpack", () => {
  it("formats proofpack as readable text", () => {
    const info = parseProofpack(makeRawProofpack());
    const text = formatProofpack(info);
    expect(text).toContain("Proofpack 1.0");
    expect(text).toContain("sess-123");
    expect(text).toContain("openclaw");
    expect(text).toContain("gpt-4");
    expect(text).toContain("10");
    expect(text).toContain("5000");
    expect(text).toContain("ed25519");
    expect(text).toContain("verified");
  });
});
