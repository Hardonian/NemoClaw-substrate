// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { createCapabilityClaimFromProbe, decideWorkerTrust, markAttestationStatus } from "./worker-trust";

const cap = { version: "1", capturedAt: "2026-05-09T00:00:00.000Z", source: "test", runtimeBackend: "mock", executionMode: "remote" as const, gpus: [], models: [], policyTags: [], reliabilityTags: [], runtimeTags: [], transportRequirements: [] };

describe("worker trust attestation", () => {
  it("self-reported capability is not automatically trusted", () => {
    const claim = { ...createCapabilityClaimFromProbe({ claimId: "c1", workerId: "w1", claimedAt: "2026-05-09T00:00:00.000Z", sourceRef: "self", capabilities: cap }), source: "self_reported" as const };
    const att = markAttestationStatus({ workerId: "w1", nowIso: "2026-05-09T00:01:00.000Z", claim, maxAgeMs: 3600000 });
    const decision = decideWorkerTrust({ workerId: "w1", nowIso: "2026-05-09T00:01:00.000Z", attestation: att, policyAllowsElevation: true });
    expect(decision.eligibleForRemoteExecution).toBe(false);
  });

  it("operator approval elevates trust when policy allows", () => {
    const claim = { ...createCapabilityClaimFromProbe({ claimId: "c2", workerId: "w2", claimedAt: "2026-05-09T00:00:00.000Z", sourceRef: "operator", capabilities: cap }), source: "operator_approved" as const };
    const att = markAttestationStatus({ workerId: "w2", nowIso: "2026-05-09T00:01:00.000Z", claim, maxAgeMs: 3600000 });
    const decision = decideWorkerTrust({ workerId: "w2", nowIso: "2026-05-09T00:01:00.000Z", attestation: att, policyAllowsElevation: true });
    expect(decision.trustLevel).toBe("trusted_remote");
    expect(decision.eligibleForRemoteExecution).toBe(true);
  });

  it("expired attestation blocks remote execution if required", () => {
    const claim = createCapabilityClaimFromProbe({ claimId: "c3", workerId: "w3", claimedAt: "2026-05-09T00:00:00.000Z", sourceRef: "probe", capabilities: cap });
    const att = markAttestationStatus({ workerId: "w3", nowIso: "2026-05-10T00:00:00.000Z", claim, maxAgeMs: 1000 });
    const decision = decideWorkerTrust({ workerId: "w3", nowIso: "2026-05-10T00:00:00.000Z", attestation: att, policyAllowsElevation: true, requireFreshAttestation: true });
    expect(decision.eligibleForRemoteExecution).toBe(false);
  });

  it("revoked worker is never eligible", () => {
    const claim = { ...createCapabilityClaimFromProbe({ claimId: "c4", workerId: "w4", claimedAt: "2026-05-09T00:00:00.000Z", sourceRef: "operator", capabilities: cap }), source: "operator_approved" as const };
    const att = markAttestationStatus({ workerId: "w4", nowIso: "2026-05-09T00:01:00.000Z", claim, maxAgeMs: 3600000 });
    const decision = decideWorkerTrust({ workerId: "w4", nowIso: "2026-05-09T00:01:00.000Z", attestation: att, policyAllowsElevation: true, revoked: true });
    expect(decision.trustLevel).toBe("revoked");
    expect(decision.eligibleForRemoteExecution).toBe(false);
  });
});
