// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { acquireLease, enqueueExecution, validateOwnership } from "./execution-queue-store";

describe("execution queue store", () => {
  it("rejects duplicate lease", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "queue-store-"));
    enqueueExecution(dir, { id: "q1", planId: "p1", idempotencyKey: "k1", status: "queued" });
    acquireLease(dir, { id: "l1", queueId: "q1", ownerId: "o1", status: "active" });
    expect(() => acquireLease(dir, { id: "l2", queueId: "q1", ownerId: "o2", status: "active" })).toThrow();
    expect(() => validateOwnership(dir, { queueId: "q1", ownerId: "o2" })).toThrow();
  });
});
