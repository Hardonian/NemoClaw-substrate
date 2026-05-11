// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";

// Pure functions that mirror the logic from package-bundle.sh
// These test the bundle assembly logic without executing bash

function resolveBundlePath(
	bundleName: string,
	bundleVersion: string,
	outputDir: string,
): string {
	return `${outputDir}/${bundleName}-${bundleVersion}`;
}

function validateBundleInputs(
	bundleName: string,
	srcDirExists: boolean,
): { valid: boolean; error?: string } {
	if (!bundleName) {
		return { valid: false, error: "BUNDLE_NAME is required" };
	}
	if (!srcDirExists) {
		return { valid: false, error: "Source directory does not exist" };
	}
	return { valid: true };
}

function expectedDirectoryStructure(): string[] {
	return ["bin", "config", "data", "logs", "health"];
}

function expectedBundleFiles(): string[] {
	return [
		"bin/start.sh",
		"config/nemoclaw.conf",
		"health/check.sh",
		"VERSION",
		"CHECKSUMS",
	];
}

function generateVersionContent(version: string): string {
	return `${version}\n`;
}

function generateConfigTemplate(): string {
	return `# NemoClaw Configuration Template
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
`;
}

function generateStartScriptContent(): string {
	return `#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${'$'}{BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Load configuration
CONFIG_FILE="${'$'}{ROOT_DIR}/config/nemoclaw.conf"
if [[ -f "$CONFIG_FILE" ]]; then
    # shellcheck disable=SC1090
    source "$CONFIG_FILE"
fi

# Defaults
NEMO_PORT="${'$'}{NEMO_PORT:-8080}"
NEMO_LOG_DIR="${'$'}{NEMO_LOG_DIR:-${'$'}{ROOT_DIR}/logs}"
NEMO_DATA_DIR="${'$'}{NEMO_DATA_DIR:-${'$'}{ROOT_DIR}/data}"

mkdir -p "$NEMO_LOG_DIR" "$NEMO_DATA_DIR"

echo "Starting NemoClaw on port ${'$'}{NEMO_PORT}..."
exec node "${'$'}{ROOT_DIR}/bin/nemoclaw.js" --port "$NEMO_PORT" --log-dir "$NEMO_LOG_DIR" --data-dir "$NEMO_DATA_DIR"
`;
}

function generateHealthCheckContent(): string {
	return `#!/usr/bin/env bash
set -euo pipefail

NEMO_HEALTH_URL="${'$'}{NEMO_HEALTH_URL:-http://localhost:8080/health}"
NEMO_HEALTH_TIMEOUT="${'$'}{NEMO_HEALTH_TIMEOUT:-5}"

response=$(curl -sf --max-time "$NEMO_HEALTH_TIMEOUT" "$NEMO_HEALTH_URL" 2>/dev/null) || {
    echo "UNHEALTHY: Could not reach ${'$'}{NEMO_HEALTH_URL}" >&2
    exit 1
}

echo "HEALTHY: ${'$'}{response}"
exit 0
`;
}

describe("package-bundle logic", () => {
	describe("resolveBundlePath", () => {
		it("should construct path from name, version, and output dir", () => {
			const result = resolveBundlePath(
				"nemoclaw-bundle",
				"20260101",
				"./bundles",
			);
			expect(result).toBe("./bundles/nemoclaw-bundle-20260101");
		});

		it("should handle nested output directories", () => {
			const result = resolveBundlePath("my-bundle", "v1", "output/nested/dir");
			expect(result).toBe("output/nested/dir/my-bundle-v1");
		});

		it("should handle names with special characters", () => {
			const result = resolveBundlePath("test-bundle_2.0", "1.0.0", "./out");
			expect(result).toBe("./out/test-bundle_2.0-1.0.0");
		});
	});

	describe("validateBundleInputs", () => {
		it("should pass with valid inputs", () => {
			const result = validateBundleInputs("test-bundle", true);
			expect(result.valid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it("should fail with empty bundle name", () => {
			const result = validateBundleInputs("", true);
			expect(result.valid).toBe(false);
			expect(result.error).toBe("BUNDLE_NAME is required");
		});

		it("should fail when source directory does not exist", () => {
			const result = validateBundleInputs("test-bundle", false);
			expect(result.valid).toBe(false);
			expect(result.error).toBe("Source directory does not exist");
		});

		it("should fail with both invalid name and missing directory", () => {
			const result = validateBundleInputs("", false);
			expect(result.valid).toBe(false);
			expect(result.error).toBe("BUNDLE_NAME is required");
		});
	});

	describe("expectedDirectoryStructure", () => {
		it("should return exactly 5 directories", () => {
			const dirs = expectedDirectoryStructure();
			expect(dirs).toHaveLength(5);
		});

		it("should include required directories", () => {
			const dirs = expectedDirectoryStructure();
			expect(dirs).toContain("bin");
			expect(dirs).toContain("config");
			expect(dirs).toContain("data");
			expect(dirs).toContain("logs");
			expect(dirs).toContain("health");
		});
	});

	describe("expectedBundleFiles", () => {
		it("should return expected files", () => {
			const files = expectedBundleFiles();
			expect(files).toHaveLength(5);
			expect(files).toContain("bin/start.sh");
			expect(files).toContain("config/nemoclaw.conf");
			expect(files).toContain("health/check.sh");
			expect(files).toContain("VERSION");
			expect(files).toContain("CHECKSUMS");
		});

		it("should have start.sh in bin directory", () => {
			const files = expectedBundleFiles();
			expect(files.some((f) => f.startsWith("bin/"))).toBe(true);
		});
	});

	describe("generateVersionContent", () => {
		it("should output version with newline", () => {
			const content = generateVersionContent("20260510123000");
			expect(content).toBe("20260510123000\n");
		});

		it("should handle semantic versioning", () => {
			const content = generateVersionContent("1.2.3");
			expect(content).toBe("1.2.3\n");
		});
	});

	describe("generateConfigTemplate", () => {
		it("should contain required configuration keys", () => {
			const config = generateConfigTemplate();
			expect(config).toContain("NEMO_PORT");
			expect(config).toContain("NEMO_HOST");
			expect(config).toContain("NEMO_LOG_DIR");
			expect(config).toContain("NEMO_DATA_DIR");
			expect(config).toContain("NEMO_SANDBOX_ENABLED");
		});

		it("should have correct default port", () => {
			const config = generateConfigTemplate();
			expect(config).toContain("NEMO_PORT=8080");
		});

		it("should be parseable as key-value pairs", () => {
			const config = generateConfigTemplate();
			const lines = config
				.split("\n")
				.filter((l) => l && !l.startsWith("#"));
			for (const line of lines) {
				expect(line).toMatch(/^[A-Z_]+=.+$/);
			}
		});
	});

	describe("generateStartScriptContent", () => {
		it("should have proper shebang", () => {
			const script = generateStartScriptContent();
			expect(script).toMatch(/^#!/);
		});

		it("should include set -euo pipefail", () => {
			const script = generateStartScriptContent();
			expect(script).toContain("set -euo pipefail");
		});

		it("should reference config file", () => {
			const script = generateStartScriptContent();
			expect(script).toContain("nemoclaw.conf");
		});

		it("should have default port", () => {
			const script = generateStartScriptContent();
			expect(script).toContain("8080");
		});

		it("should exec node with correct arguments", () => {
			const script = generateStartScriptContent();
			expect(script).toContain("exec node");
			expect(script).toContain("--port");
			expect(script).toContain("--log-dir");
			expect(script).toContain("--data-dir");
		});
	});

	describe("generateHealthCheckContent", () => {
		it("should have proper shebang", () => {
			const script = generateHealthCheckContent();
			expect(script).toMatch(/^#!/);
		});

		it("should include set -euo pipefail", () => {
			const script = generateHealthCheckContent();
			expect(script).toContain("set -euo pipefail");
		});

		it("should reference health endpoint", () => {
			const script = generateHealthCheckContent();
			expect(script).toContain("/health");
		});

		it("should use curl with timeout", () => {
			const script = generateHealthCheckContent();
			expect(script).toContain("curl");
			expect(script).toContain("--max-time");
		});

		it("should output HEALTHY or UNHEALTHY", () => {
			const script = generateHealthCheckContent();
			expect(script).toContain("HEALTHY");
			expect(script).toContain("UNHEALTHY");
		});
	});

	describe("bundle structure validation", () => {
		it("should have generated artifacts in key directories", () => {
			const files = expectedBundleFiles();

			expect(files.some((f) => f.startsWith("bin/"))).toBe(true);
			expect(files.some((f) => f.startsWith("config/"))).toBe(true);
			expect(files.some((f) => f.startsWith("health/"))).toBe(true);
		});

		it("should have all core directories", () => {
			const dirs = expectedDirectoryStructure();
			expect(dirs).toContain("bin");
			expect(dirs).toContain("config");
			expect(dirs).toContain("data");
			expect(dirs).toContain("logs");
			expect(dirs).toContain("health");
		});

		it("data and logs are runtime directories created empty", () => {
			const files = expectedBundleFiles();
			expect(files.some((f) => f.startsWith("data/"))).toBe(false);
			expect(files.some((f) => f.startsWith("logs/"))).toBe(false);
		});
	});
});
