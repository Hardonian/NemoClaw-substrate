// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { OperatorRecord } from "./types";

const REDACT = "[REDACTED]";

function redact(v: string): string {
  return v.replace(/(token|secret|password)=[^\s,]+/gi, "$1=" + REDACT);
}

export function formatJson(topic: string, rows: OperatorRecord[]): string {
  return JSON.stringify(
    {
      topic,
      records: rows.map((r) => ({
        ...r,
        detail: redact(r.detail),
        secret: r.secret ? REDACT : undefined,
      })),
    },
    null,
    2,
  );
}

export function formatTable(rows: OperatorRecord[]): string {
  const header = "ID\tSTATE\tDETAIL";
  const body = rows
    .map((r) => `${r.id}\t${r.state}${r.unavailable ? " (unavailable)" : ""}${r.degraded ? " (degraded)" : ""}\t${redact(r.detail)}`)
    .sort();
  return [header, ...body].join("\n");
}
