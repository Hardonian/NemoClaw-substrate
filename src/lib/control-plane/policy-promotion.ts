// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { OperationalEvent } from "./operational-memory";

export type PolicyCandidateReason = "repeated_deny" | "repeated_override" | "repeated_degraded" | "repeated_degraded_state_trigger";

export interface PolicyCandidate {
  key: string;
  reason: PolicyCandidateReason;
  eventIds: string[];
  count: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface PolicyPromotionProposal {
  proposalId: string;
  candidate: PolicyCandidate;
  status: "review_required";
  reviewer?: string;
  notes: string;
}

export function buildGroupingKey(event: OperationalEvent): string {
  const code = String((event.payload["degraded"] as { reasonCode?: string } | undefined)?.reasonCode ?? (event.payload["policyDecision"] as { reasons?: Array<{ code?: string }> } | undefined)?.reasons?.[0]?.code ?? (event.payload["degraded_state_trigger"] as { reason?: string } | undefined)?.reason ?? "none");
  return `${event.category}:${code}:${event.provenance.sandboxName ?? "sandbox-unknown"}`;
}

export function generatePolicyCandidates(events: OperationalEvent[], threshold = 2): PolicyCandidate[] {
  const grouped = new Map<string, OperationalEvent[]>();
  for (const event of events) {
    const reason = event.category;
    if (!["policy_outcome", "operator_override", "degraded_state", "degraded_state_trigger"].includes(reason)) continue;
    const key = buildGroupingKey(event);
    grouped.set(key, [...(grouped.get(key) ?? []), event]);
  }
  return [...grouped.entries()]
    .map(([key, groupedEvents]) => {
      const sorted = [...groupedEvents].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
      const reason: PolicyCandidateReason = key.startsWith("policy_outcome")
        ? "repeated_deny"
        : key.startsWith("operator_override")
          ? "repeated_override"
          : key.startsWith("degraded_state")
            ? "repeated_degraded"
            : "repeated_degraded_state_trigger";
      return { key, reason, eventIds: sorted.map((e) => e.eventId), count: sorted.length, firstSeenAt: sorted[0]?.occurredAt ?? "", lastSeenAt: sorted[sorted.length - 1]?.occurredAt ?? "" };
    })
    .filter((c) => c.count >= threshold)
    .sort((a, b) => a.key.localeCompare(b.key));
}

export function buildPromotionProposals(candidates: PolicyCandidate[]): PolicyPromotionProposal[] {
  return candidates.map((candidate) => ({ proposalId: `proposal-${candidate.key.replace(/[^a-zA-Z0-9]+/g, "-")}`, candidate, status: "review_required", notes: "Proposal-only artifact. No automatic policy mutation." }));
}
