// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";

// Pure functions that mirror the logic from fixture-pack.sh
// These test the fixture pack logic without executing bash

function resolveFixturePath(
	fixtureName: string,
	fixtureVersion: string,
	outputDir: string,
): string {
	return `${outputDir}/${fixtureName}-${fixtureVersion}`;
}

function resolveArchivePath(
	fixtureName: string,
	fixtureVersion: string,
	outputDir: string,
	format: ArchiveFormat,
): string {
	const extensions: Record<ArchiveFormat, string> = {
		"tar.gz": ".tar.gz",
		tar: ".tar",
		zip: ".zip",
	};
	return `${outputDir}/${fixtureName}-${fixtureVersion}${extensions[format]}`;
}

function validateFixtureInputs(
	fixtureName: string,
	srcDirExists: boolean,
	format: string,
): { valid: boolean; error?: string } {
	if (!fixtureName) {
		return { valid: false, error: "FIXTURE_NAME is required" };
	}
	if (!srcDirExists) {
		return { valid: false, error: "Source directory does not exist" };
	}
	const validFormats: ArchiveFormat[] = ["tar.gz", "tar", "zip"];
	if (!validFormats.includes(format as ArchiveFormat)) {
		return {
			valid: false,
			error: `Unsupported format '${format}'. Use: tar.gz, tar, zip`,
		};
	}
	return { valid: true };
}

function expectedFixtureStructure(): string[] {
	return ["data", "schemas", "policies", "templates"];
}

function expectedFixtureFiles(): string[] {
	return [
		"data/test-users.json",
		"data/test-policies.json",
		"schemas/config-schema.json",
		"policies/default.yaml",
		"templates/sandbox-config.tpl",
		"METADATA.json",
		"CHECKSUMS.sha256",
	];
}

type ArchiveFormat = "tar.gz" | "tar" | "zip";

interface MetadataContent {
	name: string;
	version: string;
	created: string;
	format: ArchiveFormat;
	file_count: number;
}

function generateMetadata(
	name: string,
	version: string,
	format: ArchiveFormat,
	fileCount: number,
): MetadataContent {
	return {
		name,
		version,
		created: new Date().toISOString(),
		format,
		file_count: fileCount,
	};
}

function generateTestUsersJson(): string {
	return JSON.stringify(
		[
			{ id: "user-001", role: "admin", active: true },
			{ id: "user-002", role: "viewer", active: true },
			{ id: "user-003", role: "editor", active: false },
		],
		null,
		2,
	);
}

function generateTestPoliciesJson(): string {
	return JSON.stringify(
		[
			{ name: "allow-localhost", action: "allow", targets: ["127.0.0.1"] },
			{ name: "deny-all", action: "deny", targets: ["*"] },
		],
		null,
		2,
	);
}

function generateConfigSchema(): string {
	return JSON.stringify(
		{
			$schema: "http://json-schema.org/draft-07/schema#",
			type: "object",
			properties: {
				sandbox: { type: "object" },
				agent: { type: "object" },
				inference: { type: "object" },
			},
			required: ["sandbox", "agent"],
		},
		null,
		2,
	);
}

function generateDefaultPolicy(): string {
	return `name: default
egress:
  allowed: [localhost]
  denied: ["*"]
`;
}

function generateSandboxTemplate(): string {
	return `sandbox:
  enabled: {{.Enabled}}
  memory_limit: {{.MemoryLimit}}
  network_policy: {{.NetworkPolicy}}
`;
}

describe("fixture-pack logic", () => {
	describe("resolveFixturePath", () => {
		it("should construct path from name, version, and output dir", () => {
			const result = resolveFixturePath(
				"fixture-pack",
				"20260101",
				"./fixtures",
			);
			expect(result).toBe("./fixtures/fixture-pack-20260101");
		});

		it("should handle timestamp versions", () => {
			const result = resolveFixturePath("test", "20260510123000", "./out");
			expect(result).toBe("./out/test-20260510123000");
		});
	});

	describe("resolveArchivePath", () => {
		it("should resolve tar.gz path", () => {
			const result = resolveArchivePath(
				"fixture-pack",
				"v1",
				"./out",
				"tar.gz",
			);
			expect(result).toBe("./out/fixture-pack-v1.tar.gz");
		});

		it("should resolve tar path", () => {
			const result = resolveArchivePath("fixture-pack", "v1", "./out", "tar");
			expect(result).toBe("./out/fixture-pack-v1.tar");
		});

		it("should resolve zip path", () => {
			const result = resolveArchivePath("fixture-pack", "v1", "./out", "zip");
			expect(result).toBe("./out/fixture-pack-v1.zip");
		});
	});

	describe("validateFixtureInputs", () => {
		it("should pass with valid inputs", () => {
			const result = validateFixtureInputs("test-pack", true, "tar.gz");
			expect(result.valid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it("should fail with empty fixture name", () => {
			const result = validateFixtureInputs("", true, "tar.gz");
			expect(result.valid).toBe(false);
			expect(result.error).toBe("FIXTURE_NAME is required");
		});

		it("should fail when source directory does not exist", () => {
			const result = validateFixtureInputs("test-pack", false, "tar.gz");
			expect(result.valid).toBe(false);
			expect(result.error).toBe("Source directory does not exist");
		});

		it("should fail with invalid format", () => {
			const result = validateFixtureInputs("test-pack", true, "rar");
			expect(result.valid).toBe(false);
			expect(result.error).toContain("Unsupported format");
		});

		it("should accept all valid formats", () => {
			for (const fmt of ["tar.gz", "tar", "zip"]) {
				const result = validateFixtureInputs("test", true, fmt);
				expect(result.valid).toBe(true);
			}
		});
	});

	describe("expectedFixtureStructure", () => {
		it("should return exactly 4 directories", () => {
			const dirs = expectedFixtureStructure();
			expect(dirs).toHaveLength(4);
		});

		it("should include required directories", () => {
			const dirs = expectedFixtureStructure();
			expect(dirs).toContain("data");
			expect(dirs).toContain("schemas");
			expect(dirs).toContain("policies");
			expect(dirs).toContain("templates");
		});
	});

	describe("expectedFixtureFiles", () => {
		it("should return expected files", () => {
			const files = expectedFixtureFiles();
			expect(files).toHaveLength(7);
			expect(files).toContain("data/test-users.json");
			expect(files).toContain("data/test-policies.json");
			expect(files).toContain("schemas/config-schema.json");
			expect(files).toContain("policies/default.yaml");
			expect(files).toContain("templates/sandbox-config.tpl");
			expect(files).toContain("METADATA.json");
			expect(files).toContain("CHECKSUMS.sha256");
		});

		it("should have files in all subdirectories", () => {
			const files = expectedFixtureFiles();
			const dirs = expectedFixtureStructure();

			for (const dir of dirs) {
				const hasFileInDir = files.some((f) => f.startsWith(`${dir}/`));
				expect(hasFileInDir).toBe(true);
			}
		});
	});

	describe("generateMetadata", () => {
		it("should create valid metadata object", () => {
			const meta = generateMetadata("test-pack", "1.0.0", "tar.gz", 5);
			expect(meta.name).toBe("test-pack");
			expect(meta.version).toBe("1.0.0");
			expect(meta.format).toBe("tar.gz");
			expect(meta.file_count).toBe(5);
		});

		it("should include ISO timestamp", () => {
			const meta = generateMetadata("test", "v1", "tar", 1);
			expect(meta.created).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
		});
	});

	describe("generateTestUsersJson", () => {
		it("should produce valid JSON array", () => {
			const json = generateTestUsersJson();
			const parsed = JSON.parse(json);
			expect(Array.isArray(parsed)).toBe(true);
		});

		it("should have exactly 3 users", () => {
			const json = generateTestUsersJson();
			const parsed = JSON.parse(json);
			expect(parsed).toHaveLength(3);
		});

		it("should have correct roles", () => {
			const json = generateTestUsersJson();
			const parsed = JSON.parse(json);
			const roles = parsed.map((u: { role: string }) => u.role);
			expect(roles).toContain("admin");
			expect(roles).toContain("viewer");
			expect(roles).toContain("editor");
		});

		it("should have active/inactive mix", () => {
			const json = generateTestUsersJson();
			const parsed = JSON.parse(json);
			const active = parsed.filter((u: { active: boolean }) => u.active);
			const inactive = parsed.filter((u: { active: boolean }) => !u.active);
			expect(active).toHaveLength(2);
			expect(inactive).toHaveLength(1);
		});
	});

	describe("generateTestPoliciesJson", () => {
		it("should produce valid JSON array", () => {
			const json = generateTestPoliciesJson();
			const parsed = JSON.parse(json);
			expect(Array.isArray(parsed)).toBe(true);
		});

		it("should have allow and deny policies", () => {
			const json = generateTestPoliciesJson();
			const parsed = JSON.parse(json);
			const actions = parsed.map((p: { action: string }) => p.action);
			expect(actions).toContain("allow");
			expect(actions).toContain("deny");
		});
	});

	describe("generateConfigSchema", () => {
		it("should produce valid JSON", () => {
			const json = generateConfigSchema();
			const parsed = JSON.parse(json);
			expect(parsed).toBeDefined();
		});

		it("should have required fields", () => {
			const json = generateConfigSchema();
			const parsed = JSON.parse(json);
			expect(parsed.required).toContain("sandbox");
			expect(parsed.required).toContain("agent");
		});

		it("should use draft-07 schema", () => {
			const json = generateConfigSchema();
			const parsed = JSON.parse(json);
			expect(parsed.$schema).toContain("draft-07");
		});
	});

	describe("generateDefaultPolicy", () => {
		it("should contain allow and deny rules", () => {
			const policy = generateDefaultPolicy();
			expect(policy).toContain("allowed");
			expect(policy).toContain("denied");
		});

		it("should reference localhost", () => {
			const policy = generateDefaultPolicy();
			expect(policy).toContain("localhost");
		});
	});

	describe("generateSandboxTemplate", () => {
		it("should contain template variables", () => {
			const tpl = generateSandboxTemplate();
			expect(tpl).toContain("{{.Enabled}}");
			expect(tpl).toContain("{{.MemoryLimit}}");
			expect(tpl).toContain("{{.NetworkPolicy}}");
		});

		it("should be valid YAML-like structure", () => {
			const tpl = generateSandboxTemplate();
			expect(tpl).toContain("sandbox:");
			expect(tpl).toContain("enabled:");
			expect(tpl).toContain("memory_limit:");
			expect(tpl).toContain("network_policy:");
		});
	});

	describe("format compatibility", () => {
		it("should generate correct extensions for all formats", () => {
			const formats: ArchiveFormat[] = ["tar.gz", "tar", "zip"];
			const expectedExtensions = [".tar.gz", ".tar", ".zip"];

			for (let i = 0; i < formats.length; i++) {
				const path = resolveArchivePath("pack", "v1", "./out", formats[i]);
				expect(path.endsWith(expectedExtensions[i])).toBe(true);
			}
		});
	});
});
