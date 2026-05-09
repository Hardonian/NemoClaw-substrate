<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Command Execution Safety

This document defines the command execution safety model for the NemoClaw substrate.

## Core invariant

**All subprocess execution uses argv arrays with shell interpretation disabled.**

This is a structural enforcement, not a policy toggle. There is no configuration to enable shell interpretation. Violations throw at runtime.

---

## Implementation: `src/lib/runner.ts`

### Entry points

| Function | Purpose | Shell safety |
|----------|---------|-------------|
| `run(argv, opts)` | Execute command, stream redacted output to terminal | argv-only; rejects strings and `shell: true` |
| `runCapture(argv, opts)` | Execute command, return captured stdout as string | argv-only; rejects strings and `shell: true` |
| `runScript(name, args, opts)` | Execute script from `scripts/` directory | Delegates to `run()` |
| `runBash(script, opts)` | Execute inline bash script | `bash -c` with argv; no string-to-shell expansion |

### Enforcement mechanisms

1. **String command rejection:**
   ```typescript
   // If argv is a string, throw immediately
   if (typeof argv === "string") throw new Error("use argv array instead");
   ```

2. **Empty argv rejection:**
   ```typescript
   if (argv.length === 0) throw new Error("argv must not be empty");
   ```

3. **Shell option prohibition:**
   ```typescript
   if (opts.shell) throw new Error("shell option is forbidden");
   ```

4. **Explicit `shell: false`:**
   All `spawnSync` calls use the default `shell: false` behavior. The `shell` option is never set to `true`.

5. **Output redaction:**
   All piped stdout/stderr is redacted before terminal emission via `writeRedactedResult()`.

6. **Error redaction:**
   Error messages, commands, and output in error objects are redacted via `redactError()`.

---

## What this prevents

| Attack vector | How it is blocked |
|--------------|-------------------|
| `$(command)` subshell expansion | Passed as literal string to `echo` (or target binary) |
| `` `command` `` backtick expansion | Same as above |
| `&& second_command` chaining | `&&` is treated as a literal argument |
| `\| pipe_target` piping | `\|` is treated as a literal argument |
| `> file` redirection | `>` is treated as a literal argument |
| `; second_command` sequencing | `;` is treated as a literal argument |
| Glob expansion (`*`, `?`) | Passed literally; no shell globbing |
| Variable expansion (`$VAR`) | Passed literally; no environment interpolation |

---

## `runBash` special case

`runBash()` is used for inline scripts that intentionally require shell features (e.g., setup scripts). It calls:

```typescript
spawnSync("bash", ["-c", script], { shell: false, ... })
```

This is safe because:
- `bash` is the executable (not an implicit shell wrapper).
- `-c` receives the script content as a single argument.
- The outer `spawnSync` does not invoke a shell; it directly executes `bash`.
- The script content is operator-authored, not user-input.

`runBash` is used for infrastructure scripts, not for processing untrusted input.

---

## Environment variable safety

- Parent `process.env` is forwarded to child processes.
- Optional `opts.env` values are merged with spread: `{ ...process.env, ...opts.env }`.
- No environment variable names are dynamically constructed from user input.
- Docker host is detected once at module load time and set via `process.env.DOCKER_HOST`.

---

## Name validation

`src/lib/name-validation.ts` provides `NAME_ALLOWED_FORMAT` for validating sandbox names and other identifiers. Names must match a strict alphanumeric-plus-hyphen pattern to prevent injection via container names or path components.

---

## Test coverage

`src/lib/runner-argv.test.ts` validates:

| Test case | What it proves |
|-----------|---------------|
| `executes a simple command and returns result` | Basic argv execution works |
| `throws when argv array is empty` | Empty argv is rejected |
| `returns non-zero status with ignoreError` | Non-zero exits are captured |
| `passes extra env vars to the child process` | Environment forwarding works |
| `rejects shell: true to prevent security bypass` | Shell option is blocked |
| `does not interpret shell metacharacters in arguments` | `$(whoami)`, `&&`, `rm` are literals |
| `rejects string commands` | String input throws error |
| `surfaces ENOENT error for missing executables` | Missing binary errors are explicit |

---

## Prohibited patterns

The following patterns must never appear in production code:

```typescript
// PROHIBITED: shell string execution
spawnSync("echo hello && rm -rf /", { shell: true });

// PROHIBITED: string command
run("docker ps -a");

// PROHIBITED: template literal with user input
run(`docker exec ${userInput} ls`);

// PROHIBITED: shell: true option
run(["echo", "safe"], { shell: true });
```

The correct pattern:

```typescript
// CORRECT: argv array, no shell
run(["echo", untrustedInput]);
run(["docker", "exec", containerName, "ls"]);
```

---

## CI enforcement

- `src/lib/runner-argv.test.ts` runs in the `cli` Vitest project.
- `npm run verify:core` includes runner safety tests.
- Any regression in shell safety tests blocks merge.
