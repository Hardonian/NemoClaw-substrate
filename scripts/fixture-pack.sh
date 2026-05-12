#!/usr/bin/env bash
# SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
# SPDX-License-Identifier: Apache-2.0

# fixture-pack.sh - Produce portable fixture packs for testing and staging
# Versioned, checksum-verified output.

set -euo pipefail

# Defaults
FIXTURE_NAME="${1:-fixture-pack}"
FIXTURE_VERSION="${FIXTURE_VERSION:-$(date +%Y%m%d%H%M%S)}"
OUTPUT_DIR="${OUTPUT_DIR:-./fixtures}"
SRC_DIR="${SRC_DIR:-.}"
ARCHIVE_FORMAT="${ARCHIVE_FORMAT:-tar.gz}"

# Validate inputs
validate_inputs() {
  if [[ -z "$FIXTURE_NAME" ]]; then
    echo "ERROR: FIXTURE_NAME is required" >&2
    exit 1
  fi

  if [[ ! -d "$SRC_DIR" ]]; then
    echo "ERROR: Source directory '$SRC_DIR' does not exist" >&2
    exit 1
  fi

  case "$ARCHIVE_FORMAT" in
    tar.gz | zip | tar) ;;
    *)
      echo "ERROR: Unsupported format '$ARCHIVE_FORMAT'. Use: tar.gz, tar, zip" >&2
      exit 1
      ;;
  esac
}

# Create fixture staging directory
create_staging() {
  local stage_path="$1"

  mkdir -p "${stage_path}/data"
  mkdir -p "${stage_path}/schemas"
  mkdir -p "${stage_path}/policies"
  mkdir -p "${stage_path}/templates"
}

# Generate base fixture files
generate_fixtures() {
  local stage_path="$1"

  cat >"${stage_path}/data/test-users.json" <<'FIXTURE_EOF'
[
  {"id": "user-001", "role": "admin", "active": true},
  {"id": "user-002", "role": "viewer", "active": true},
  {"id": "user-003", "role": "editor", "active": false}
]
FIXTURE_EOF

  cat >"${stage_path}/data/test-policies.json" <<'FIXTURE_EOF'
[
  {"name": "allow-localhost", "action": "allow", "targets": ["127.0.0.1"]},
  {"name": "deny-all", "action": "deny", "targets": ["*"]}
]
FIXTURE_EOF

  cat >"${stage_path}/schemas/config-schema.json" <<'SCHEMA_EOF'
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "sandbox": {"type": "object"},
    "agent": {"type": "object"},
    "inference": {"type": "object"}
  },
  "required": ["sandbox", "agent"]
}
SCHEMA_EOF

  cat >"${stage_path}/policies/default.yaml" <<'POLICY_EOF'
name: default
egress:
  allowed: [localhost]
  denied: ["*"]
POLICY_EOF

  cat >"${stage_path}/templates/sandbox-config.tpl" <<'TPL_EOF'
sandbox:
  enabled: {{.Enabled}}
  memory_limit: {{.MemoryLimit}}
  network_policy: {{.NetworkPolicy}}
TPL_EOF
}

# Create version metadata
create_version_meta() {
  local stage_path="$1"

  cat >"${stage_path}/METADATA.json" <<EOF
{
  "name": "${FIXTURE_NAME}",
  "version": "${FIXTURE_VERSION}",
  "created": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "format": "${ARCHIVE_FORMAT}",
  "file_count": $(find "$stage_path" -type f | wc -l)
}
EOF
}

# Generate checksums for verification
generate_checksums() {
  local stage_path="$1"

  (cd "$stage_path" && find . -type f -not -name 'CHECKSUMS.sha256' -exec sha256sum {} \; | sort >CHECKSUMS.sha256)
}

# Verify checksums in a directory
verify_checksums() {
  local stage_path="$1"
  local checksum_file="${stage_path}/CHECKSUMS.sha256"

  if [[ ! -f "$checksum_file" ]]; then
    echo "ERROR: No checksum file found at ${checksum_file}" >&2
    return 1
  fi

  (cd "$stage_path" && sha256sum -c CHECKSUMS.sha256)
}

# Create archive from staging directory
create_archive() {
  local stage_path="$1"
  local archive_name="${FIXTURE_NAME}-${FIXTURE_VERSION}"
  local archive_path="${OUTPUT_DIR}/${archive_name}"

  case "$ARCHIVE_FORMAT" in
    tar.gz)
      tar -czf "${archive_path}.tar.gz" -C "$(dirname "$stage_path")" "$(basename "$stage_path")"
      echo "${archive_path}.tar.gz"
      ;;
    tar)
      tar -cf "${archive_path}.tar" -C "$(dirname "$stage_path")" "$(basename "$stage_path")"
      echo "${archive_path}.tar"
      ;;
    zip)
      (cd "$(dirname "$stage_path")" && zip -r "${archive_path}.zip" "$(basename "$stage_path")")
      echo "${archive_path}.zip"
      ;;
  esac
}

# Main
main() {
  validate_inputs

  local stage_path="${OUTPUT_DIR}/.staging/${FIXTURE_NAME}-${FIXTURE_VERSION}"
  local archive_path="${OUTPUT_DIR}/${FIXTURE_NAME}-${FIXTURE_VERSION}"

  echo "Creating fixture pack: ${FIXTURE_NAME} v${FIXTURE_VERSION}"
  mkdir -p "$OUTPUT_DIR" "${OUTPUT_DIR}/.staging"

  create_staging "$stage_path"
  generate_fixtures "$stage_path"
  create_version_meta "$stage_path"
  generate_checksums "$stage_path"

  echo "Verifying checksums..."
  verify_checksums "$stage_path"

  local final_path
  final_path=$(create_archive "$stage_path")

  # Cleanup staging
  rm -rf "${OUTPUT_DIR}/.staging"

  echo "Fixture pack created: ${final_path}"
  echo "  Format: ${ARCHIVE_FORMAT}"
  echo "  Size: $(du -sh "$final_path" | cut -f1)"
}

main "$@"
