<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Secret Redaction Doctrine

This document is the canonical reference for how secrets are detected, redacted, and prevented from leaking across all substrate outputs.

## Redaction architecture

```text
                     ┌─────────────────────────────────┐
                     │  secret-patterns.ts              │
                     │  (Single source of truth)        │
                     │  TOKEN_PREFIX_PATTERNS            │
                     │  CONTEXT_PATTERNS                 │
                     │  SECRET_PATTERNS (combined)       │
                     └─────────┬───────────────────────┘
                               │
              ┌────────────────┼────────────────────┐
              │                │                    │
    ┌─────────▼──────┐  ┌─────▼───────┐  ┌────────▼────────┐
    │ redact.ts       │  │ redact.ts    │  │ secret-scanner  │
    │ (CLI output)    │  │ (Diagnostic) │  │ (Memory writes) │
    │ redact()        │  │ redactFull() │  │ scanForSecrets()│
    │ redactError()   │  │              │  │                 │
    │ writeRedacted() │  │              │  │                 │
    └────────────────┘  └──────────────┘  └─────────────────┘
```

---

## Pattern sources

### `src/lib/security/secret-patterns.ts` (CLI redaction)

Token-prefix patterns (standalone — no context required):

| Provider | Pattern | Example prefix |
|----------|---------|---------------|
| NVIDIA | `nvapi-[A-Za-z0-9_-]{10,}` | `nvapi-abc123...` |
| NVIDIA (NVCF) | `nvcf-[A-Za-z0-9_-]{10,}` | `nvcf-xyz789...` |
| GitHub (PAT) | `ghp_[A-Za-z0-9_-]{10,}` | `ghp_abcdef...` |
| GitHub (fine-grained) | `github_pat_[A-Za-z0-9_]{30,}` | `github_pat_...` |
| OpenAI (project) | `sk-proj-[A-Za-z0-9_-]{10,}` | `sk-proj-...` |
| Anthropic | `sk-ant-[A-Za-z0-9_-]{10,}` | `sk-ant-...` |
| OpenAI (generic) | `sk-[A-Za-z0-9_-]{20,}` | `sk-abcdef...` |
| Slack | `(xox[bpas]\|xapp)-[A-Za-z0-9-]{10,}` | `xoxb-...` |
| AWS | `A(K\|S)IA[A-Z0-9]{16}` | `AKIA...` |
| HuggingFace | `hf_[A-Za-z0-9]{10,}` | `hf_abc...` |
| GitLab | `glpat-[A-Za-z0-9_-]{10,}` | `glpat-...` |
| Groq | `gsk_[A-Za-z0-9]{10,}` | `gsk_...` |
| PyPI | `pypi-[A-Za-z0-9_-]{10,}` | `pypi-...` |
| Telegram | `bot\d{8,10}:[A-Za-z0-9_-]{35}` | `bot123456789:...` |
| Telegram (alt) | `\d{8,10}:[A-Za-z0-9_-]{35}` | `123456789:...` |
| Discord | Base64 user.timestamp.HMAC pattern | 24-char.6-char.27+-char |

Context-anchored patterns (require prefix like `KEY=`, `Bearer`):

| Context | Pattern |
|---------|---------|
| Bearer token | `(?<=Bearer\s+)[A-Za-z0-9_.+/=-]{10,}` |
| Key/secret assignment | `(?<=(?:_KEY\|API_KEY\|SECRET\|TOKEN\|PASSWORD\|CREDENTIAL)[=: ]['"]?)[A-Za-z0-9_.+/=-]{10,}` |

### `nemoclaw/src/security/secret-scanner.ts` (memory write scanning)

Additional high-confidence patterns for persistent content:

| Provider | Pattern | Notes |
|----------|---------|-------|
| AWS secret key | Context-anchored to `aws_secret_access_key` | Reduces false positives |
| npm | `npm_[A-Za-z0-9]{36,}` | npm tokens |
| Private keys (PEM) | `-----BEGIN (RSA\|EC\|DSA\|OPENSSH )?PRIVATE KEY-----` | Certificate material |
| Google API | `AIza[0-9A-Za-z_-]{35}` | Google API keys |
| Auth header | Context-anchored to `Authorization: Bearer` | Full header values |

---

## Redaction tiers

### Tier 1: Partial redaction (`redact()`)

**Consumer:** `src/lib/runner.ts` (CLI subprocess output)
**Behavior:** Preserves first 4 characters, replaces remainder with `*` (capped at 20 asterisks).
**Rationale:** Allows operators to identify which key is in use without exposing the full secret.

```text
Input:  nvapi-abcdef123456789
Output: nvap********************
```

URL handling: Replaces userinfo with `****`, redacts sensitive query parameters.

### Tier 2: Full redaction (`redactFull()`)

**Consumer:** `src/lib/debug.ts` (diagnostic dump files)
**Behavior:** Replaces entire match with `<REDACTED>`. Also covers `KEY=value` patterns and `Bearer` tokens.
**Rationale:** Diagnostic dumps may be shared with support; no partial exposure is acceptable.

```text
Input:  NVIDIA_API_KEY=nvapi-secret123
Output: NVIDIA_API_KEY=<REDACTED>
```

### Tier 3: Sensitive text redaction (`redactSensitiveText()`)

**Consumer:** `src/lib/onboard-session.ts` (onboarding session logs)
**Behavior:** Full replacement + 240-character output truncation.
**Rationale:** Onboarding logs may contain user-typed credentials; truncation prevents accumulation of sensitive context.

---

## Redaction enforcement points

| Output surface | Enforcement | Tier |
|---------------|-------------|------|
| Subprocess stdout/stderr | `runner.ts:writeRedactedResult()` | Partial |
| Command failure messages | `runner.ts:spawnAndHandle()` | Partial |
| Error objects | `redact.ts:redactError()` | Partial |
| Diagnostic dumps | `debug.ts` | Full |
| Onboarding session logs | `onboard-session.ts` | Sensitive |
| Remote execution receipts | `remote-execution.ts:redact()` | Auth-specific |
| Config file persistence | `credential-filter.ts` | Stripped |
| Memory writes | `secret-scanner.ts` | Scanned |
| Backup archives | `credential-filter.ts:isSensitiveFile()` | File-excluded |

---

## Shell degraded state coverage

When Node.js is unavailable (e.g., during early bootstrap), `debug.sh` uses `sed`-based redaction. This degraded state only covers `EXPECTED_SHELL_PREFIXES`:

- `nvapi-`
- `nvcf-`
- `ghp_`
- `sk-`

All other patterns require the Node.js redaction path. The consistency test (`redact.test.ts`) verifies these prefixes are present in both the Node and shell paths.

---

## Known limitations

1. **Base64-encoded secrets** are not detected. A secret encoded as base64 bypasses all regex patterns.
2. **Hex-encoded secrets** are not detected.
3. **Split-across-writes secrets** where a token is written in parts across multiple operations are not detected.
4. **Novel token formats** require explicit pattern additions to `secret-patterns.ts` and/or `secret-scanner.ts`.
5. **YAML credential fields** in non-JSON config files are not stripped by `credential-filter.ts`.
6. **Custom URL parameter names** not matching the `signature|sig|token|auth|access_token` pattern are not redacted from URLs.

These are inherent limitations of regex-based content scanning and are documented in code comments.

---

## Adding a new secret pattern

1. Add the regex to `src/lib/security/secret-patterns.ts` (for CLI redaction) and/or `nemoclaw/src/security/secret-scanner.ts` (for memory write scanning).
2. Add a test case to the corresponding test file.
3. If the pattern has a distinctive prefix that should be covered by the shell degraded state, add it to `EXPECTED_SHELL_PREFIXES` and update `debug.sh`.
4. Run `npx vitest run src/lib/security/redact.test.ts` and `npx vitest run nemoclaw/src/security/secret-scanner.test.ts`.
