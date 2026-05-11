#!/usr/bin/env bash
# SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
# SPDX-License-Identifier: Apache-2.0

# hardening-check.sh - Verify Docker image hardening compliance

set -euo pipefail

# Defaults
IMAGE_NAME="${1:-nemoclaw-hardened}"
IMAGE_TAG="${2:-latest}"
PASS=0
FAIL=0
WARN=0

# Color output helpers
red() { printf '\033[0;31m%s\033[0m\n' "$*"; }
green() { printf '\033[0;32m%s\033[0m\n' "$*"; }
yellow() { printf '\033[0;33m%s\033[0m\n' "$*"; }

# Test helper
check() {
    local description="$1"
    shift
    if "$@" >/dev/null 2>&1; then
        green "[PASS] ${description}"
        PASS=$((PASS + 1))
    else
        red "[FAIL] ${description}"
        FAIL=$((FAIL + 1))
    fi
}

warn() {
    local description="$1"
    shift
    if "$@" >/dev/null 2>&1; then
        green "[PASS] ${description}"
        PASS=$((PASS + 1))
    else
        yellow "[WARN] ${description}"
        WARN=$((WARN + 1))
    fi
}

# Verify image exists
verify_image() {
    docker inspect "${IMAGE_NAME}:${IMAGE_TAG}" >/dev/null 2>&1 || {
        red "ERROR: Image '${IMAGE_NAME}:${IMAGE_TAG}' not found" >&2
        echo "Build it first: docker build -f ci/docker/Dockerfile.hardened -t ${IMAGE_NAME}:${IMAGE_TAG} ." >&2
        exit 1
    }
}

# Inspect helpers
inspect_config() {
    docker inspect --format='{{json .Config}}' "${IMAGE_NAME}:${IMAGE_TAG}" 2>/dev/null
}

inspect_container() {
    docker inspect "${IMAGE_NAME}:${IMAGE_TAG}" 2>/dev/null
}

# Checks
check_base_image() {
    local config
    config=$(inspect_config)
    # Check for distroless, alpine, or chainguard in the image history
    docker history "${IMAGE_NAME}:${IMAGE_TAG}" 2>/dev/null | grep -qiE '(distroless|alpine|chainguard|cgr\.dev)'
}

check_non_root_user() {
    local config
    config=$(inspect_config)
    local user
    user=$(echo "$config" | jq -r '.User // empty' 2>/dev/null)
    [[ -n "$user" ]] && [[ "$user" != "root" ]] && [[ "$user" != "0" ]]
}

check_no_sudo() {
    local config
    config=$(inspect_config)
    # Check that no layer installs sudo
    docker history --no-trunc "${IMAGE_NAME}:${IMAGE_TAG}" 2>/dev/null | ! grep -qi 'sudo'
}

check_healthcheck() {
    local config
    config=$(inspect_config)
    echo "$config" | jq -e '.Healthcheck != null' >/dev/null 2>&1
}

check_exposed_ports() {
    local config
    config=$(inspect_config)
    echo "$config" | jq -e '.ExposedPorts != null' >/dev/null 2>&1
}

check_no_secrets_in_env() {
    local config
    config=$(inspect_config)
    local env_vars
    env_vars=$(echo "$config" | jq -r '.Env[]? // empty' 2>/dev/null)
    # Check for common secret patterns
    ! echo "$env_vars" | grep -qiE '(password|secret|api_key|token|credential)='
}

check_label_metadata() {
    local config
    config=$(inspect_config)
    echo "$config" | jq -e '."Labels"["org.opencontainers.image.source"] != null' >/dev/null 2>&1
}

check_no_shell_by_default() {
    local config
    config=$(inspect_config)
    local user
    user=$(echo "$config" | jq -r '.User // empty' 2>/dev/null)
    [[ "$user" != "root" ]]
}

check_sbom_labels() {
    local config
    config=$(inspect_config)
    echo "$config" | jq -e '."Labels"["org.opencontainers.image.sbom"] != null' >/dev/null 2>&1
}

check_minimal_packages() {
    # Warn if image is larger than expected (heuristic: should be under 200MB for minimal)
    local size
    size=$(docker inspect --format='{{.Size}}' "${IMAGE_NAME}:${IMAGE_TAG}" 2>/dev/null || echo "0")
    local size_mb=$((size / 1024 / 1024))
    [[ "$size_mb" -lt 500 ]]
}

# Main
main() {
    echo "=== Docker Hardening Check ==="
    echo "Image: ${IMAGE_NAME}:${IMAGE_TAG}"
    echo ""

    verify_image

    echo "--- Base Image ---"
    warn "Uses minimal base (alpine/distroless/chainguard)" check_base_image

    echo "--- User Security ---"
    check "Runs as non-root user" check_non_root_user
    check "No sudo installed" check_no_sudo
    check "No root shell by default" check_no_shell_by_default

    echo "--- Runtime Security ---"
    check "Has HEALTHCHECK defined" check_healthcheck
    check "Has exposed ports" check_exposed_ports

    echo "--- Secrets ---"
    check "No secrets in environment variables" check_no_secrets_in_env

    echo "--- Metadata ---"
    check "Has OCI source label" check_label_metadata
    check "Has SBOM label" check_sbom_labels

    echo "--- Size ---"
    warn "Image under 500MB" check_minimal_packages

    echo ""
    echo "=== Summary ==="
    green "Pass: ${PASS}"
    if [[ "$FAIL" -gt 0 ]]; then
        red "Fail: ${FAIL}"
    else
        green "Fail: 0"
    fi
    if [[ "$WARN" -gt 0 ]]; then
        yellow "Warn: ${WARN}"
    else
        green "Warn: 0"
    fi

    if [[ "$FAIL" -gt 0 ]]; then
        echo ""
        red "Hardening check FAILED" >&2
        exit 1
    fi
}

main "$@"
