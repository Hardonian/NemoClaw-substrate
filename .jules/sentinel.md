## 2026-05-17 - [Command Injection]
**Vulnerability:** Shell Command Injection in SSH Remote Execution
**Learning:** `child_process.exec` passes commands to a shell (`/bin/sh -c` on Unix), meaning shell metacharacters in constructed command strings are evaluated by the local host running the agent/cli. This allowed an attacker or malicious config to inject commands (e.g. `; touch /tmp/pwned`) into the remote execution SSH string, causing local command execution.
**Prevention:** Use `child_process.execFile` (or `spawn`) and pass arguments as an array instead of a concatenated string. This skips local shell evaluation entirely, ensuring arguments are sent directly to the `ssh` binary.
