// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { deterministicSerialize } from "./serde";
import type { OperationalEvent } from "./operational-memory";

export interface ReplayEnvelope {
  version: "1";
  exportedAt: string;
  eventCount: number;
  events: OperationalEvent[];
  digest: string;
}

export function buildReplayEnvelope(events: OperationalEvent[], exportedAt: string): ReplayEnvelope {
  const sorted = [...events].sort((a, b) => a.sequence - b.sequence);
  const digest = Buffer.from(deterministicSerialize(sorted)).toString("base64url");
  return { version: "1", exportedAt, eventCount: sorted.length, events: sorted, digest };
}

export function validateReplayEnvelope(envelope: ReplayEnvelope): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (envelope.eventCount !== envelope.events.length) reasons.push("event_count_mismatch");
  if (envelope.events.some((e, i) => e.sequence !== i)) reasons.push("sequence_mismatch");
  const expectedDigest = Buffer.from(deterministicSerialize(envelope.events)).toString("base64url");
  if (expectedDigest !== envelope.digest) reasons.push("digest_mismatch");
  return { ok: reasons.length === 0, reasons };
}
