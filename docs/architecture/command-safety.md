<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Command Safety

Command safety is descriptor-only.
The policy validates a command name, argv array, shell setting, timeout, output ceilings, allowlist, and denylist before any command runner or remote execution transport can be called.

Required descriptor properties:

- `name`: non-empty command name without shell metacharacters
- `argv`: array of string arguments without NUL bytes or shell metacharacters
- `shell`: must be `false`
- `timeoutMs`: normalized to policy ceilings
- `stdoutMaxBytes` and `stderrMaxBytes`: bounded by policy defaults unless explicitly lower

Denials are explicit:

- `command_shell_denied`
- `command_descriptor_invalid`
- `command_denylist_denied`
- `command_allowlist_denied`

This model does not add arbitrary command execution.
Remote execution remains an already guarded transport scaffold and is still disabled by default.
Local probe command execution is limited to the existing explicit telemetry probe command path.
