# Deterministic Fixture Generation

This repository contains tools to generate deterministic, redacted JSON fixtures representing typical NemoClaw data structures. These fixtures are used for testing, validation, and documentation.

## Generator Script

Located at `scripts/fixtures/generate-fixtures.mjs`.

## Generated Fixtures

- `receipt.json`: A standard transaction receipt.
- `replay-envelope.json`: A replay envelope for session verification.
- `diagnostics.json`: System diagnostics snapshot.

## Requirements
- Fixtures are deterministic (stable output based on a fixed seed).
- Fixtures are fully redacted (no secrets).
- Fixtures validate against the defined schemas.
