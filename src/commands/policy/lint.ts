// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import Command from "../../lib/commands/policy/lint";
import { withCommandDisplay } from "../../lib/cli/command-display";

export default withCommandDisplay(Command, [
  {
    usage: "nemoclaw policy lint [--schema sandbox-policy|policy-preset] [--policy-file <path>]",
    description: "Lint sandbox policy files against schema and report violations",
    flags: "(--schema <type>, --policy-file <path>)",
    group: "Operations",
    scope: "global",
    order: 50,
  },
]);
