// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// Unit-level tests for the error path inside backfillAndFindOverlaps.
//
// These tests import the *source* module directly (not the compiled dist) so
// that vi.mock can intercept the internal dependency calls before they reach
// any real runtime.  The sibling status-command-deps.test.ts file uses the
// compiled dist for integration-style tests; both suites are complementary.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Module mocks – all hoisted by Vitest before any import is evaluated.
// ---------------------------------------------------------------------------

// The primary mock: make backfillMessagingChannels throw to exercise the
// catch block in backfillAndFindOverlaps.
vi.mock("./messaging-conflict", () => ({
  backfillMessagingChannels: vi.fn(() => {
    throw new Error("simulated registry write failure");
  }),
  findAllOverlaps: vi.fn(() => [{ provider: "a", channels: ["telegram"] }]),
}));

// Stub openshell resolution so the module can be imported without a real binary.
vi.mock("./adapters/openshell/resolve", () => ({
  resolveOpenshell: vi.fn(() => null),
}));

// Stub the openshell client so captureOpenshellCommand is never called.
vi.mock("./adapters/openshell/client", () => ({
  captureOpenshellCommand: vi.fn(() => ({ status: 0, output: "" })),
  stripAnsi: vi.fn((s: string) => s),
}));

// Stub the registry so the module-level import succeeds without real state.
vi.mock("./state/registry", () => ({
  listSandboxes: vi.fn(() => []),
  getAgents: vi.fn(() => []),
}));

// Stub services so showStatus / getServiceStatuses resolve without I/O.
vi.mock("./services", () => ({
  showStatus: vi.fn(),
  getServiceStatuses: vi.fn(async () => []),
}));

// Stub parseGatewayInference so getLiveInference can be constructed safely.
vi.mock("./inference/config", () => ({
  parseGatewayInference: vi.fn(() => null),
}));

// ---------------------------------------------------------------------------
// Import the source module AFTER vi.mock declarations.
// Vitest hoists vi.mock calls, so the mocks are in place before this runs.
// ---------------------------------------------------------------------------

import { buildStatusCommandDeps } from "./status-command-deps";
import { backfillMessagingChannels, findAllOverlaps } from "./messaging-conflict";

describe("backfillAndFindOverlaps – catch block", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns [] and swallows the error when backfillMessagingChannels throws", () => {
    vi.mocked(backfillMessagingChannels).mockImplementation(() => {
      throw new Error("gateway probe exploded");
    });

    const deps = buildStatusCommandDeps("/tmp/fake-root");

    // The catch block must absorb the throw and return an empty array so that
    // the status command remains usable even when the gateway is unreachable.
    expect(deps.backfillAndFindOverlaps()).toEqual([]);

    // Confirm backfillMessagingChannels was actually called (so the throw
    // came from inside the try block, not from a guard before it).
    expect(backfillMessagingChannels).toHaveBeenCalledOnce();

    // findAllOverlaps must NOT have been reached because the throw happened
    // before it.
    expect(findAllOverlaps).not.toHaveBeenCalled();
  });

  it("returns [] and swallows the error when findAllOverlaps throws", () => {
    // backfillMessagingChannels succeeds this time; the throw comes later.
    vi.mocked(backfillMessagingChannels).mockImplementation(() => undefined);
    vi.mocked(findAllOverlaps).mockImplementation(() => {
      throw new Error("overlap scan exploded");
    });

    const deps = buildStatusCommandDeps("/tmp/fake-root");

    expect(deps.backfillAndFindOverlaps()).toEqual([]);
    expect(backfillMessagingChannels).toHaveBeenCalledOnce();
    expect(findAllOverlaps).toHaveBeenCalledOnce();
  });

  it("returns the real overlap list when neither call throws", () => {
    const overlaps = [{ provider: "some-provider", channels: ["telegram"] }];
    vi.mocked(backfillMessagingChannels).mockImplementation(() => undefined);
    vi.mocked(findAllOverlaps).mockReturnValue(overlaps as ReturnType<typeof findAllOverlaps>);

    const deps = buildStatusCommandDeps("/tmp/fake-root");

    // Sanity-check the happy path: the catch block must not interfere when
    // nothing throws.
    expect(deps.backfillAndFindOverlaps()).toBe(overlaps);
  });
});
