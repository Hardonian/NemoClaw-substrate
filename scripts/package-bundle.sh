#!/usr/bin/env bash
# SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
# SPDX-License-Identifier: Apache-2.0

# package-bundle.sh - Assemble local deployment bundles
# Creates a single-directory layout with start-scripts, config templates, health-checks.

set -euo pipefail

# Defaults
BUNDLE_NAME="${1:-nemoclaw-bundle}"
BUNDLE_VERSION="${BUNDLE_VERSION:-$(date +%Y%m%d%H%M%S)}"
OUTPUT_DIR="${OUTPUT_DIR:-./bundles}"
SRC_DIR="${SRC_DIR:-.}"

# Validate inputs
validate_inputs() {
    if [[ -z "$BUNDLE_NAME" ]]; then
        echo "ERROR: BUNDLE_NAME is required" >&2
        exit 1
    fi

    if [[ ! -d "$SRC_DIR" ]]; then
        echo "ERROR: Source directory '$SRC_DIR' does not exist" >&2
        exit 1
    fi
}

# Create bundle directory structure
create_structure() {
    local bundle_path="$1"

    mkdir -p "${bundle_path}/bin"
    mkdir -p "${bundle_path}/config"
    mkdir -p "${bundle_path}/data"
    mkdir -p "${bundle_path}/logs"
    mkdir -p "${bundle_path}/health"
}

# Generate start script
generate_start_script() {
    local bundle_path="$1"

    cat > "${bundle_path}/bin/start.sh" << 'START_EOF'
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Load configuration
CONFIG_FILE="${ROOT_DIR}/config/nemoclaw.conf"
if [[ -f "$CONFIG_FILE" ]]; then
    # shellcheck disable=SC1090
    source "$CONFIG_FILE"
fi

# Defaults
NEMO_PORT="${NEMO_PORT:-8080}"
NEMO_LOG_DIR="${NEMO_LOG_DIR:-${ROOT_DIR}/logs}"
NEMO_DATA_DIR="${NEMO_DATA_DIR:-${ROOT_DIR}/data}"

mkdir -p "$NEMO_LOG_DIR" "$NEMO_DATA_DIR"

echo "Starting NemoClaw on port ${NEMO_PORT}..."
exec node "${ROOT_DIR}/bin/nemoclaw.js" --port "$NEMO_PORT" --log-dir "$NEMO_LOG_DIR" --data-dir "$NEMO_DATA_DIR"
START_EOF

    chmod +x "${bundle_path}/bin/start.sh"
}

# Generate config template
generate_config_template() {
    local bundle_path="$1"

    cat > "${bundle_path}/config/nemoclaw.conf" << 'CONF_EOF'
# NemoClaw Configuration Template
# Copy to nemoclaw.conf and modify as needed

# Server settings
NEMO_PORT=8080
NEMO_HOST=0.0.0.0

# Directory paths
NEMO_LOG_DIR=./logs
NEMO_DATA_DIR=./data

# Sandbox settings
NEMO_SANDBOX_ENABLED=true
NEMO_SANDBOX_NETWORK_POLICY=default

# Logging
NEMO_LOG_LEVEL=info
NEMO_LOG_FORMAT=json
CONF_EOF
}

# Generate health check script
generate_health_check() {
    local bundle_path="$1"

    cat > "${bundle_path}/health/check.sh" << 'HEALTH_EOF'
#!/usr/bin/env bash
set -euo pipefail

NEMO_HEALTH_URL="${NEMO_HEALTH_URL:-http://localhost:8080/health}"
NEMO_HEALTH_TIMEOUT="${NEMO_HEALTH_TIMEOUT:-5}"

response=$(curl -sf --max-time "$NEMO_HEALTH_TIMEOUT" "$NEMO_HEALTH_URL" 2>/dev/null) || {
    echo "UNHEALTHY: Could not reach ${NEMO_HEALTH_URL}" >&2
    exit 1
}

echo "HEALTHY: ${response}"
exit 0
HEALTH_EOF

    chmod +x "${bundle_path}/health/check.sh"
}

# Create version file
create_version_file() {
    local bundle_path="$1"

    cat > "${bundle_path}/VERSION" << EOF
${BUNDLE_VERSION}
EOF
}

# Generate checksum manifest
generate_checksums() {
    local bundle_path="$1"

    (cd "$bundle_path" && find . -type f -not -name 'CHECKSUMS' -exec sha256sum {} \; | sort > CHECKSUMS)
}

# Main
main() {
    validate_inputs

    local bundle_path="${OUTPUT_DIR}/${BUNDLE_NAME}-${BUNDLE_VERSION}"

    echo "Creating bundle: ${bundle_path}"
    mkdir -p "$OUTPUT_DIR"

    create_structure "$bundle_path"
    generate_start_script "$bundle_path"
    generate_config_template "$bundle_path"
    generate_health_check "$bundle_path"
    create_version_file "$bundle_path"
    generate_checksums "$bundle_path"

    echo "Bundle created: ${bundle_path}"
    echo "  Version: ${BUNDLE_VERSION}"
    echo "  Size: $(du -sh "$bundle_path" | cut -f1)"
}

main "$@"
