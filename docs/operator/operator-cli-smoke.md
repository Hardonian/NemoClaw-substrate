# Operator CLI Smoke Harness

The Operator CLI Smoke Harness validates that the Operator CLI outputs and parsing logic function correctly without requiring a live network or GPU.

## Script

Located at `scripts/smoke/operator-cli-smoke.mjs`.

## Features
- Runs in "demo" mode against generated fixtures.
- Validates JSON output parsing.
- Performs sanity checks on table formatting.
- Verifies that output is redacted (no secrets displayed).
