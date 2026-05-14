// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { checkClaims } from "../scripts/review/check-claims.mjs";
import { checkNoTheatre } from "../scripts/review/check-no-theatre.mjs";
import { checkStatusMatrix, ALLOWED_LABELS } from "../scripts/review/check-status-matrix.mjs";

describe("review automation guardrails", () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "nemoclaw-review-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("rejects unsupported assurance claims in markdown", async () => {
    await writeFile(path.join(tempDir, "claims.md"), "This path is enterprise-grade.\n", "utf8");

    await expect(checkClaims(tempDir)).resolves.toBe(1);
  });

  it("allows explicit non-claims while rejecting theatre wording", async () => {
    await writeFile(
      path.join(tempDir, "theatre.md"),
      "This does not claim production-ready behavior.\nThe command runs seamlessly.\n",
      "utf8",
    );

    await expect(checkClaims(tempDir)).resolves.toBe(0);
    await expect(checkNoTheatre(tempDir)).resolves.toBe(1);
  });

  it("validates only explicitly marked status matrices", async () => {
    await writeFile(
      path.join(tempDir, "status.md"),
      [
        "<!-- status-matrix: canonical -->",
        "| Capability | Status | Evidence |",
        "|---|---|---|",
        "| Replay | implemented | `npm run verify:replay` |",
        "| Magic | magic | none |",
        "",
      ].join("\n"),
      "utf8",
    );
    await writeFile(
      path.join(tempDir, "ordinary-table.md"),
      ["| Check | Status |", "|---|---|", "| Human review | accepted |", ""].join("\n"),
      "utf8",
    );

    await expect(checkStatusMatrix(tempDir)).resolves.toBe(1);
    expect(ALLOWED_LABELS).toContain("implemented");
    expect(ALLOWED_LABELS).toContain("not-implemented");
  });
});
