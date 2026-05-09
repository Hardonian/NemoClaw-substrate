// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { DegradedState } from "./types";

export function validateIsoTimestamp(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(value);
}

export function validateDegradedState(state: DegradedState): string[] {
  const issues: string[] = [];
  if (!state.reason.trim()) issues.push("reason must be non-empty");
  if (!validateIsoTimestamp(state.timestamp)) issues.push("timestamp must be ISO-8601 UTC");
  if (state.category === "healthy" && state.reasonCode !== "none") {
    issues.push("healthy category must use reasonCode=none");
  }
  return issues;
}
