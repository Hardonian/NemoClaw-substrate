// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { detectLeaseConflict, lineageHash, transitionExecutionState, validateReplayConsistency, type ExecutionPlan, type QueueItem } from "./execution-lifecycle";

const plan: ExecutionPlan = {
  planId: "plan-1",
  idempotencyKey: "idem-1",
  status: "queued",
  phase: "queueing",
  governanceMetadata: { policy: "strict" },
  trustMetadata: { trust: "validated" },
  createdAt: "2026-05-10T00:00:00.000Z",
  invariantSet: [{ code: "INV-001", description: "deterministic", enforced: true }],
  approvals: [],
  receiptReferences: [{ receiptId: "rec-1", receiptDigest: "digest-1" }],
  replayReference: { replayReferenceId: "replay-1", lineage: ["plan-1", "phase:queue"], replayDigest: "digest-r" },
};

const queue: QueueItem = {
  queueItemId: "q-1",
  planId: "plan-1",
  state: "queued",
  sequence: 1,
  replayReference: { replayReferenceId: "replay-1", lineageHash: lineageHash(["plan-1", "phase:queue"]) },
  receiptReferences: [{ receiptId: "rec-1" }],
  createdAt: "2026-05-10T00:00:00.000Z",
};

describe("execution lifecycle substrate", () => {
  it("accepts legal transitions and rejects illegal transitions", () => {
    expect(transitionExecutionState("planned", "queued")).toBe(true);
    expect(transitionExecutionState("queued", "executing")).toBe(false);
  });

  it("detects replay drift and missing metadata fail-closed", () => {
    expect(validateReplayConsistency(plan, queue)).toEqual([]);
    const drift = validateReplayConsistency({ ...plan, governanceMetadata: {} }, { ...queue, replayReference: { ...queue.replayReference, replayReferenceId: "bad" } });
    expect(drift).toContain("missing_governance_metadata");
    expect(drift).toContain("replay_drift");
  });

  it("detects lease conflicts and stale owners", () => {
    expect(detectLeaseConflict(undefined, "owner-a", "2026-05-10T00:00:00.000Z")).toBe("none");
    expect(
      detectLeaseConflict({ leaseId: "l1", ownerId: "owner-a", acquiredAt: "2026-05-10T00:00:00.000Z", expiresAt: "2026-05-10T01:00:00.000Z" }, "owner-b", "2026-05-10T00:10:00.000Z"),
    ).toBe("split_brain");
    expect(
      detectLeaseConflict({ leaseId: "l1", ownerId: "owner-a", acquiredAt: "2026-05-10T00:00:00.000Z", expiresAt: "2026-05-10T00:01:00.000Z" }, "owner-a", "2026-05-10T00:02:00.000Z"),
    ).toBe("stale_owner");
  });
});
