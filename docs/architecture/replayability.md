<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Replayability

## Status (2026-05-09)
Implemented scaffold in `src/lib/control-plane/replay.ts`.

Replay envelopes preserve deterministic event ordering, reason codes, and payload integrity via deterministic serialization and digest validation.

Current replay is in-process and export-oriented. Future adapters can persist envelopes externally without mutating source records.
