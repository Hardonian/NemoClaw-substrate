<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Redaction Guarantees

## Overview

NemoClaw's redaction validation layer ensures that secrets are never included in evidence exports. This document describes the redaction mechanisms, validation process, and guarantees.

## Secret Pattern Detection

The system detects secrets through multiple pattern-matching strategies defined in `secret-patterns.ts`:

### Token Prefix Patterns

Standalone token patterns that match without context:

- NVIDIA: `nvapi-`, `nvcf-`
- GitHub: `ghp_`, `github_pat_`
- OpenAI: `sk-proj-`, `sk-ant-`, `sk-`
- Slack: `xoxb-`, `xoxp-`, `xoxa-`, `xoxs-`, `xapp-`
- AWS: `AKIA`, `ASIA`
- HuggingFace: `hf_`
- GitLab: `glpat-`
- Groq: `gsk_`
- PyPI: `pypi-`
- Telegram: bot tokens
- Discord: bot tokens

### Context Patterns

Patterns requiring context anchors:

- Bearer tokens: `Bearer <token>`
- Environment-like: `KEY=value`, `SECRET=value`, `TOKEN=value`, etc.

## Redaction Mechanisms

### Payload Redaction

```typescript
import { redactPayloadForExport } from "./redaction-validation";

const redacted = redactPayloadForExport(payload);
```

Uses `security-policy.ts` `redactSecurityPayload()` which:

1. Walks the object tree recursively (up to max depth)
2. Checks keys against sensitive key patterns (`authorization`, `api-key`, `secret`, etc.)
3. Replaces sensitive values with `<REDACTED>`
4. Applies string-level redaction for remaining values

### Export Safety Check

```typescript
import { isExportSafe } from "./redaction-validation";

if (!isExportSafe(payload)) {
  // Handle unsafe payload
}
```

Compares original payload against redacted version to detect any secrets.

## Validation Layer

### Artifact-Level Validation

```typescript
import { validateArtifactRedaction } from "./redaction-validation";

const result = validateArtifactRedaction(artifact);
// result.valid: boolean
// result.violations: RedactionViolation[]
```

Checks:

- Token patterns in string values
- Bearer tokens in string values
- Auth header keys in object keys
- Secret-bearing key patterns

### Bundle-Level Validation

```typescript
import { validateBundleRedaction } from "./redaction-validation";

const result = validateBundleRedaction(bundle);
```

Validates all artifacts in a bundle and aggregates violations.

### Replay Package Validation

```typescript
import { validateReplayPackageRedaction } from "./redaction-validation";

const result = validateReplayPackageRedaction(pkg);
```

Validates:

- Proofpack artifacts
- Governance event payloads
- Diagnostics snapshot payloads
- Degraded State evidence payloads
- Approval lineage payloads

### Receipt Validation

```typescript
import { validateReceiptRedaction } from "./redaction-validation";

const result = validateReceiptRedaction(receipt);
```

Validates execution receipt payloads for secret patterns.

## Violation Types

```typescript
interface RedactionViolation {
  path: string;
  type: "token_pattern" | "context_pattern" | "auth_header" | "url_credential" | "env_like_key";
  severity: "critical" | "warning";
  detail: string;
}
```

- `token_pattern`: A known token prefix was found in a string value
- `context_pattern`: A context-anchored secret pattern was found
- `auth_header`: An authentication header key or Bearer token was found
- `url_credential`: URL contains embedded credentials
- `env_like_key`: A key matches secret-bearing naming patterns

## Redaction Report

```typescript
import { generateRedactionReport } from "./redaction-validation";

const report = generateRedactionReport({ bundle });
// report.result.valid: boolean
// report.result.violations: RedactionViolation[]
// report.result.secretsFound: number
```

## Guarantees

1. **No exported artifact contains unredacted secrets** when `redactSecrets: true`
2. **All validation layers use the same pattern definitions** from `secret-patterns.ts`
3. **Redaction is recursive** — nested objects are fully traversed
4. **Auth metadata is redacted** — Bearer tokens, API keys, and auth headers are always stripped
5. **Receipt exports are safe** — `validateReceiptRedaction()` provides explicit receipt-level validation
