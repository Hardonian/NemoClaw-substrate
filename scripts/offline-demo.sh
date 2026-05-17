#!/usr/bin/env bash
# SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
# SPDX-License-Identifier: Apache-2.0

# offline-demo.sh - Create an offline demo pack with pre-seeded fixtures and embedded UI
# No external network required to run the demo.

set -euo pipefail

# Defaults
DEMO_NAME="${1:-nemoclaw-offline-demo}"
DEMO_VERSION="${DEMO_VERSION:-$(date +%Y%m%d)}"
OUTPUT_DIR="${OUTPUT_DIR:-./demos}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Validate prerequisites
validate() {
  if [[ ! -d "$ROOT_DIR" ]]; then
    echo "ERROR: Project root not found at ${ROOT_DIR}" >&2
    exit 1
  fi
}

# Create demo directory structure
create_structure() {
  local demo_path="$1"

  mkdir -p "${demo_path}/bin"
  mkdir -p "${demo_path}/config"
  mkdir -p "${demo_path}/fixtures"
  mkdir -p "${demo_path}/ui"
  mkdir -p "${demo_path}/logs"
}

# Seed fixture data
seed_fixtures() {
  local demo_path="$1"

  cat >"${demo_path}/fixtures/sample-config.yaml" <<'FIXTURE_EOF'
sandbox:
  enabled: true
  network_policy: isolated
  memory_limit: 512m

agent:
  name: demo-assistant
  model: placeholder
  timeout: 30s

inference:
  provider: local
  endpoint: http://localhost:8080
FIXTURE_EOF

  cat >"${demo_path}/fixtures/sample-policies.yaml" <<'POLICY_EOF'
policies:
  egress:
    allowed:
      - localhost
    denied:
      - "*"
  ingress:
    allowed_ports:
      - 8080
POLICY_EOF

  cat >"${demo_path}/fixtures/sample-state.json" <<'STATE_EOF'
{
  "version": "1.0.0",
  "state": "initialized",
  "timestamp": "2026-01-01T00:00:00Z",
  "features": {
    "sandbox": true,
    "network_isolation": true,
    "health_check": true
  }
}
STATE_EOF
}

# Generate embedded UI (self-contained HTML)
generate_ui() {
  local demo_path="$1"

  cat >"${demo_path}/ui/index.html" <<'UI_EOF'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>NemoClaw Offline Demo</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; background: #0d1117; color: #c9d1d9; }
  h1 { color: #58a6ff; }
  .status { padding: 1rem; background: #161b22; border-radius: 6px; margin: 1rem 0; }
  .status.ok { border-left: 4px solid #238636; }
  .status.warn { border-left: 4px solid #d29922; }
  button { background: #238636; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; }
  button:hover { background: #2ea043; }
  pre { background: #0d1117; padding: 1rem; border-radius: 6px; overflow-x: auto; }
</style>
</head>
<body>
<h1>NemoClaw Offline Demo</h1>
<div id="status" class="status ok">System initialized</div>
<div id="fixtures"></div>
<button onclick="runHealthCheck()">Run Health Check</button>
<pre id="output">Awaiting interaction...</pre>
<script>
const fixtures = ["sample-config.yaml", "sample-policies.yaml", "sample-state.json"];
document.getElementById("fixtures").innerHTML = "<h2>Fixtures</h2><ul>" + fixtures.map(f => "<li>" + f + "</li>").join("") + "</ul>";
function runHealthCheck() {
  const output = document.getElementById("output");
  output.textContent = "[OK] All fixtures loaded\n[OK] Sandbox policy: isolated\n[OK] Network: offline mode\n[OK] UI: embedded";
}
</script>
</body>
</html>
UI_EOF
}

# Generate demo launcher script
generate_launcher() {
  local demo_path="$1"

  cat >"${demo_path}/bin/demo.sh" <<'LAUNCHER_EOF'
#!/usr/bin/env bash
set -euo pipefail

DEMO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=== NemoClaw Offline Demo ==="
echo "Demo directory: ${DEMO_DIR}"
echo "Fixtures: $(ls "${DEMO_DIR}/fixtures/" | wc -l) files"
echo ""

echo "Loaded fixtures:"
for fixture in "${DEMO_DIR}/fixtures/"*; do
    echo "  - $(basename "$fixture")"
done

echo ""
echo "To view the embedded UI, open:"
echo "  file://${DEMO_DIR}/ui/index.html"
LAUNCHER_EOF

  chmod +x "${demo_path}/bin/demo.sh"
}

# Create version and metadata
create_metadata() {
  local demo_path="$1"

  cat >"${demo_path}/README.md" <<EOF
# NemoClaw Offline Demo

Version: ${DEMO_VERSION}
Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)

This demo pack is fully self-contained and requires no external network access.

## Contents

- \`fixtures/\` - Pre-seeded configuration and policy fixtures
- \`ui/\` - Embedded status UI (open index.html in a browser)
- \`bin/demo.sh\` - Demo launcher script

## Usage

Run \`./bin/demo.sh\` or open \`ui/index.html\` in a browser.
EOF
}

# Generate checksums
generate_checksums() {
  local demo_path="$1"

  (cd "$demo_path" && find . -type f -not -name 'CHECKSUMS' -exec sha256sum {} \; | sort >CHECKSUMS)
}

# Main
main() {
  validate

  local demo_path="${OUTPUT_DIR}/${DEMO_NAME}-${DEMO_VERSION}"

  echo "Creating offline demo: ${demo_path}"
  mkdir -p "$OUTPUT_DIR"

  create_structure "$demo_path"
  seed_fixtures "$demo_path"
  generate_ui "$demo_path"
  generate_launcher "$demo_path"
  create_metadata "$demo_path"
  generate_checksums "$demo_path"

  echo "Offline demo created: ${demo_path}"
  echo "  Size: $(du -sh "$demo_path" | cut -f1)"
}

main "$@"
