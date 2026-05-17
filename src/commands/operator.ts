// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import Command from "../lib/commands/operator";
import { withCommandDisplay } from "../lib/cli/command-display";

export default withCommandDisplay(Command, [
  {
    usage: "nemoclaw operator <status|diagnostics|workers|telemetry|trust|attestation|replay|receipts|proofpack|queue|policy|degraded|plans|approvals>",
    description: "Read-only operator substrate status and governance surfaces",
    flags: "[--json]",
    group: "Operations",
    scope: "global",
    order: 37,
  },
]);
