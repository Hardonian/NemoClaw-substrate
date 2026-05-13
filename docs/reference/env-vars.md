<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Environment Variables & Flags

NemoClaw-substrate uses environment variables to control orchestration behavior, debug modes, and integration adapters. All orchestration features are disabled by default and must be explicitly enabled.

## Core Orchestration Flags

| Variable | Default | Description |
|:---|:---|:---|
| `NEMOCLAW_ORCHESTRATION` | `0` | Set to `1` to enable the governed orchestration layer. |
| `NEMOCLAW_DAEMON_SCHEDULER` | `0` | Set to `1` to enable the background daemon for task scheduling and leasing. |
| `NEMOCLAW_RETRY_POLICY` | `implicit` | Controls retry behavior. Set to `explicit` to require policy-defined retry budgets. |
| `NEMOCLAW_SPECULATIVE_FANOUT` | `0` | Set to `1` to enable speculative execution across multiple candidates. |
| `NEMOCLAW_GPU_AWARE_SCHEDULING`| `0` | Set to `1` to enable VRAM and thermal-aware task placement. |
| `NEMOCLAW_REMOTE_EXECUTION` | `0` | Set to `1` to allow task dispatch to remote compute nodes. |

## Integration Adapters

| Variable | Description |
|:---|:---|
| `NEMOCLAW_DYNAMO_ADAPTER` | Set to `1` to use DynamoDB for state persistence and lease management. |
| `NEMOCLAW_REDIS_ADAPTER` | (Planned) Set to `1` to use Redis for high-frequency queue operations. |

## Debugging & Observability

| Variable | Description |
|:---|:---|
| `NEMOCLAW_DEBUG_REPLAY` | Set to `1` to enable detailed logging during replay validation. |
| `NEMOCLAW_TRACE_POLICY` | Set to `1` to log every policy evaluation decision. |
| `NEMOCLAW_LOG_REDACTION` | Controls log redaction sensitivity. Options: `strict` (default), `permissive`. |
| `NEMOCLAW_EVIDENCE_FORMAT` | Controls the default export format for Proofpacks. Options: `json` (default), `ndjson`. |

## Security & Trust

| Variable | Description |
|:---|:---|
| `NEMOCLAW_MINIMUM_TRUST` | Sets the global minimum trust level required for execution. |
| `NEMOCLAW_ATTESTATION_REQUIRED`| Set to `1` to fail execution if hardware attestation is missing. |

---

## Anti-Theatre Note

Flags marked as `(Planned)` represent interfaces that are defined in the configuration schema but not yet fully implemented in the runtime. Enabling these will currently result in a `STEP_SKIPPED` or `INTERNAL_ERROR` with a `reasonCode` of `orchestration_disabled` or `internal_error`.
