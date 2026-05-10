// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export type OperatorTopic =
  | "status"
  | "diagnostics"
  | "workers"
  | "telemetry"
  | "trust"
  | "attestation"
  | "replay"
  | "receipts"
  | "proofpack"
  | "queue"
  | "policy"
  | "degraded"
  | "plans"
  | "approvals";

export type OperatorOutput = "table" | "json";

export interface OperatorRecord {
  id: string;
  state: string;
  detail: string;
  unavailable?: boolean;
  degraded?: boolean;
  secret?: string;
}
