// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import {
  validateAgainstSchema,
  normalizeJsonPointer,
  hardenConfig,
  runStartupValidation,
  dumpConfig,
  NEMOCLAW_CONFIG_SCHEMA,
  DEFAULT_REDACT_KEYS,
} from "./config-validator.js";
import type { ProfileDefinition } from "./profile-inheritance.js";

describe("normalizeJsonPointer", () => {
  it("returns (root) for empty string", () => {
    expect(normalizeJsonPointer("")).toBe("(root)");
  });

  it("returns (root) for single slash", () => {
    expect(normalizeJsonPointer("/")).toBe("(root)");
  });

  it("converts simple paths", () => {
    expect(normalizeJsonPointer("/inference/modelId")).toBe("inference.modelId");
  });

  it("handles array indices", () => {
    expect(normalizeJsonPointer("/plugins/0/id")).toBe("plugins[0].id");
  });
});

describe("validateAgainstSchema", () => {
  it("passes valid config", () => {
    const result = validateAgainstSchema(
      { inference: { providerKey: "nvidia", modelId: "llama-3" } },
      NEMOCLAW_CONFIG_SCHEMA,
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("fails when required nested field is wrong type", () => {
    const result = validateAgainstSchema(
      { inference: { providerKey: 123 } },
      NEMOCLAW_CONFIG_SCHEMA,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("validates log level enum values", () => {
    const result = validateAgainstSchema(
      { logs: { level: "trace" } },
      NEMOCLAW_CONFIG_SCHEMA,
    );
    expect(result.valid).toBe(false);
    const levelError = result.errors.find((e) => e.path === "logs.level");
    expect(levelError).toBeDefined();
  });

  it("passes valid log levels", () => {
    for (const level of ["debug", "info", "warn", "error"]) {
      const result = validateAgainstSchema(
        { logs: { level } },
        NEMOCLAW_CONFIG_SCHEMA,
      );
      expect(result.valid).toBe(true);
    }
  });

  it("accepts additional properties by default", () => {
    const result = validateAgainstSchema(
      { customField: "value" },
      NEMOCLAW_CONFIG_SCHEMA,
    );
    expect(result.valid).toBe(true);
  });
});

describe("hardenConfig", () => {
  it("removes __proto__ key", () => {
    const input = JSON.parse('{"__proto__": {"polluted": true}, "safe": "value"}');
    const result = hardenConfig(input);
    expect(result.removedFields).toContain("__proto__");
    expect(result.config.safe).toBe("value");
    expect(Object.hasOwn(result.config, "__proto__")).toBe(false);
  });

  it("removes constructor key", () => {
    const result = hardenConfig({ constructor: "bad" });
    expect(result.removedFields).toContain("constructor");
  });

  it("removes function values", () => {
    const result = hardenConfig({ hook: () => {} });
    expect(result.removedFields).toContain("hook");
  });

  it("trims whitespace from string values", () => {
    const result = hardenConfig({ name: "  hello  " });
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.config.name).toBe("hello");
  });

  it("deep sanitizes nested objects", () => {
    const input = JSON.parse('{"nested": {"__proto__": "bad", "ok": "value"}}');
    const result = hardenConfig(input);
    expect(Object.hasOwn(result.config.nested as Record<string, unknown>, "__proto__")).toBe(false);
    expect((result.config.nested as any).ok).toBe("value");
  });

  it("allows null values", () => {
    const result = hardenConfig({ value: null });
    expect(result.config.value).toBeNull();
  });

  it("removes undefined values", () => {
    const result = hardenConfig({ value: undefined });
    expect(result.removedFields).toContain("value");
  });
});

describe("runStartupValidation", () => {
  it("passes with valid config", () => {
    const result = runStartupValidation({
      config: { inference: { providerKey: "nvidia", modelId: "llama-3" } },
      applyMigrations: false,
    });
    expect(result.report.canProceed).toBe(true);
    expect(result.report.errors).toHaveLength(0);
  });

  it("detects schema errors as failures", () => {
    const result = runStartupValidation({
      config: { logs: { level: "invalid" } },
      applyMigrations: false,
    });
    expect(result.report.canProceed).toBe(false);
    expect(result.report.errors.length).toBeGreaterThan(0);
  });

  it("applies migrations and reports warnings", () => {
    const result = runStartupValidation({
      config: { model: { name: "llama-3" } },
      applyMigrations: true,
    });
    expect(result.migrationResult).toBeDefined();
    expect(result.migrationResult?.wasMigrated).toBe(true);
    expect(result.report.warnings.length).toBeGreaterThan(0);
  });

  it("resolves profile inheritance", () => {
    const registry = new Map<string, ProfileDefinition>([
      [
        "base",
        {
          name: "base",
          extends: [],
          overrides: { logs: { level: "info" } },
        },
      ],
      [
        "dev",
        {
          name: "dev",
          extends: ["base"],
          overrides: { logs: { level: "debug" } },
        },
      ],
    ]);

    const result = runStartupValidation({
      config: { inference: { providerKey: "nvidia" } },
      profileName: "dev",
      profileRegistry: registry,
      applyMigrations: false,
    });
    expect(result.profileResult).not.toBeNull();
    expect(result.profileResult?.chain).toEqual(["base", "dev"]);
  });

  it("reports cycle errors as fatal", () => {
    const registry = new Map<string, ProfileDefinition>([
      [
        "a",
        {
          name: "a",
          extends: ["b"],
          overrides: {},
        },
      ],
      [
        "b",
        {
          name: "b",
          extends: ["a"],
          overrides: {},
        },
      ],
    ]);

    const result = runStartupValidation({
      config: {},
      profileName: "a",
      profileRegistry: registry,
      applyMigrations: false,
    });
    expect(result.report.canProceed).toBe(false);
    expect(result.report.errors.some((e) => e.code === "PROFILE_CYCLE")).toBe(true);
  });

  it("reports missing profile as error", () => {
    const registry = new Map<string, ProfileDefinition>([
      [
        "child",
        {
          name: "child",
          extends: ["nonexistent"],
          overrides: {},
        },
      ],
    ]);

    const result = runStartupValidation({
      config: {},
      profileName: "child",
      profileRegistry: registry,
      applyMigrations: false,
    });
    expect(result.report.canProceed).toBe(false);
    expect(result.report.errors.some((e) => e.code === "PROFILE_RESOLVE_ERROR")).toBe(true);
  });

  it("hardens config and reports removed fields", () => {
    const result = runStartupValidation({
      config: JSON.parse('{"__proto__": {"bad": true}, "inference": {"providerKey": "nvidia"}}'),
      applyMigrations: false,
    });
    expect(Object.hasOwn(result.config, "__proto__")).toBe(false);
  });

  it("sets envVarCount when envEntries provided", () => {
    const result = runStartupValidation({
      config: { inference: { providerKey: "nvidia" } },
      applyMigrations: false,
      envEntries: [
        { key: "providerKey", originalKey: "NEMOCLAW_PROVIDER_KEY", value: "nvidia" },
        { key: "modelId", originalKey: "NEMOCLAW_MODEL_ID", value: "llama-3" },
      ],
    });
    expect(result.report.envVarCount).toBe(2);
  });
});

describe("dumpConfig", () => {
  it("outputs valid JSON", () => {
    const output = dumpConfig({ key: "value" }, { format: "json" });
    expect(JSON.parse(output)).toEqual({ key: "value" });
  });

  it("uses custom indentation", () => {
    const output = dumpConfig({ a: 1 }, { format: "json", indent: 4 });
    expect(output).toContain("    ");
  });

  it("redacts sensitive keys", () => {
    const output = dumpConfig(
      { apiKey: "secret123", public: "visible" },
      { format: "json", redactKeys: ["apiKey"] },
    );
    expect(output).toContain("[REDACTED]");
    expect(output).toContain("visible");
  });

  it("deep redacts nested keys", () => {
    const output = dumpConfig(
      { nested: { token: "abc" } },
      { format: "json", redactKeys: ["token"] },
    );
    const parsed = JSON.parse(output);
    expect(parsed.nested.token).toBe("[REDACTED]");
  });

  it("uses DEFAULT_REDACT_KEYS for common patterns", () => {
    expect(DEFAULT_REDACT_KEYS).toContain("apiKey");
    expect(DEFAULT_REDACT_KEYS).toContain("secret");
    expect(DEFAULT_REDACT_KEYS).toContain("password");
    expect(DEFAULT_REDACT_KEYS).toContain("token");
  });

  it("outputs YAML-like format", () => {
    const output = dumpConfig({ key: "value" }, { format: "yaml" });
    expect(output).toContain("key: value");
  });

  it("handles nested YAML output", () => {
    const output = dumpConfig(
      { outer: { inner: "val" } },
      { format: "yaml" },
    );
    expect(output).toContain("outer:");
    expect(output).toContain("inner: val");
  });

  it("handles arrays in YAML output", () => {
    const output = dumpConfig({ items: ["a", "b"] }, { format: "yaml" });
    expect(output).toContain("- a");
    expect(output).toContain("- b");
  });
});
