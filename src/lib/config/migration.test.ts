// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import {
  migrateConfig,
  hasDeprecatedFields,
  listDeprecatedFields,
  getNestedValue,
  setNestedValue,
  deleteNestedValue,
  applyMigrationRule,
  DEPRECATION_RULES,
} from "./migration.js";
import type { DeprecationRule } from "./migration.js";

describe("getNestedValue", () => {
  it("retrieves top-level value", () => {
    const result = getNestedValue({ a: 1 }, "a");
    expect(result.found).toBe(true);
    expect(result.value).toBe(1);
  });

  it("retrieves nested value", () => {
    const result = getNestedValue({ a: { b: { c: "deep" } } }, "a.b.c");
    expect(result.found).toBe(true);
    expect(result.value).toBe("deep");
  });

  it("returns not found for missing path", () => {
    const result = getNestedValue({ a: 1 }, "b");
    expect(result.found).toBe(false);
  });

  it("returns not found for partial path through non-object", () => {
    const result = getNestedValue({ a: "string" }, "a.b");
    expect(result.found).toBe(false);
  });

  it("returns not found for path through array", () => {
    const result = getNestedValue({ a: [1, 2] }, "a.0");
    expect(result.found).toBe(false);
  });
});

describe("setNestedValue", () => {
  it("sets top-level value", () => {
    const obj: Record<string, any> = {};
    setNestedValue(obj, "a", 1);
    expect(obj.a).toBe(1);
  });

  it("creates intermediate objects", () => {
    const obj: Record<string, any> = {};
    setNestedValue(obj, "a.b.c", "deep");
    expect(obj.a).toEqual({ b: { c: "deep" } });
  });

  it("overwrites existing value", () => {
    const obj: Record<string, any> = { a: { b: "old" } };
    setNestedValue(obj, "a.b", "new");
    expect(obj.a.b).toBe("new");
  });

  it("overwrites non-object intermediate with object", () => {
    const obj: Record<string, any> = { a: "string" };
    setNestedValue(obj, "a.b", 1);
    expect(obj.a).toEqual({ b: 1 });
  });
});

describe("deleteNestedValue", () => {
  it("deletes top-level key", () => {
    const obj: Record<string, any> = { a: 1 };
    const result = deleteNestedValue(obj, "a");
    expect(result).toBe(true);
    expect(obj.a).toBeUndefined();
  });

  it("deletes nested key", () => {
    const obj: Record<string, any> = { a: { b: 1, c: 2 } };
    const result = deleteNestedValue(obj, "a.b");
    expect(result).toBe(true);
    expect(obj.a.b).toBeUndefined();
    expect(obj.a.c).toBe(2);
  });

  it("returns false for missing key", () => {
    const obj: Record<string, unknown> = { a: 1 };
    expect(deleteNestedValue(obj, "b")).toBe(false);
  });

  it("returns false for path through non-object", () => {
    const obj: Record<string, unknown> = { a: "string" };
    expect(deleteNestedValue(obj, "a.b")).toBe(false);
  });
});

describe("applyMigrationRule", () => {
  it("copies value to replacement path", () => {
    const rule: DeprecationRule = {
      path: "old",
      replacementPath: "new",
      preserveValue: true,
      description: "test",
    };
    const config: any = { old: "value" };
    const result = applyMigrationRule(config, rule);
    expect(result).not.toBeNull();
    expect(result?.fromPath).toBe("old");
    expect(result?.toPath).toBe("new");
    expect(config.old).toBeUndefined();
    expect(config.new).toBe("value");
  });

  it("drops value when preserveValue is false", () => {
    const rule: DeprecationRule = {
      path: "bad",
      replacementPath: null,
      preserveValue: false,
      description: "removed",
    };
    const config: any = { bad: "value" };
    const result = applyMigrationRule(config, rule);
    expect(result).not.toBeNull();
    expect(result?.preserved).toBe(false);
    expect(config.bad).toBeUndefined();
  });

  it("applies transform function", () => {
    const rule: DeprecationRule = {
      path: "verbose",
      replacementPath: "level",
      preserveValue: true,
      description: "transform test",
      transform: (v) => (v === true ? "debug" : "info"),
    };
    const config: any = { verbose: true };
    applyMigrationRule(config, rule);
    expect(config.level).toBe("debug");
  });

  it("returns null when field not found", () => {
    const rule: DeprecationRule = {
      path: "missing",
      replacementPath: null,
      preserveValue: false,
      description: "noop",
    };
    const result = applyMigrationRule({}, rule);
    expect(result).toBeNull();
  });
});

describe("migrateConfig", () => {
  it("does not mutate original config", () => {
    const original = { model: { name: "llama-3" } };
    migrateConfig(original);
    expect(original.model).toEqual({ name: "llama-3" });
  });

  it("returns wasMigrated true when changes applied", () => {
    const result = migrateConfig({ model: { name: "llama-3" } });
    expect(result.wasMigrated).toBe(true);
    expect(result.migrations.length).toBeGreaterThan(0);
  });

  it("returns wasMigrated false when no deprecated fields", () => {
    const result = migrateConfig({ inference: { modelId: "llama-3" } });
    expect(result.wasMigrated).toBe(false);
    expect(result.migrations).toEqual([]);
  });

  it("migrates model.name to inference.modelId", () => {
    const result = migrateConfig({ model: { name: "llama-3" } });
    expect(result.config.inference).toEqual({ modelId: "llama-3" });
    expect(result.config.model).toEqual({});
  });

  it("drops security.disableSandbox", () => {
    const result = migrateConfig({
      security: { disableSandbox: true },
      other: "value",
    });
    expect(result.config.security).toEqual({});
    expect(result.config.other).toBe("value");
  });

  it("transforms logs.verbose to logs.level", () => {
    const result = migrateConfig({ logs: { verbose: true } });
    expect(result.config.logs).toEqual({ level: "debug" });
  });

  it("transforms logs.verbose false to logs.level info", () => {
    const result = migrateConfig({ logs: { verbose: false } });
    expect(result.config.logs).toEqual({ level: "info" });
  });

  it("supports custom rules", () => {
    const customRules: DeprecationRule[] = [
      {
        path: "deprecated",
        replacementPath: "modern",
        preserveValue: true,
        description: "custom",
      },
    ];
    const result = migrateConfig({ deprecated: "val" }, customRules);
    expect(result.config.modern).toBe("val");
  });
});

describe("hasDeprecatedFields", () => {
  it("returns true when deprecated field exists", () => {
    expect(hasDeprecatedFields({ model: { name: "x" } })).toBe(true);
  });

  it("returns false for clean config", () => {
    expect(hasDeprecatedFields({ inference: { modelId: "x" } })).toBe(false);
  });
});

describe("listDeprecatedFields", () => {
  it("returns list of deprecated paths", () => {
    const config = {
      model: { name: "x" },
      logs: { verbose: true },
    };
    const deprecated = listDeprecatedFields(config);
    expect(deprecated).toContain("model.name");
    expect(deprecated).toContain("logs.verbose");
  });

  it("returns empty list for clean config", () => {
    expect(listDeprecatedFields({ inference: { modelId: "x" } })).toEqual([]);
  });
});

describe("DEPRECATION_RULES", () => {
  it("contains expected rules", () => {
    const paths = DEPRECATION_RULES.map((r) => r.path);
    expect(paths).toContain("sandbox.networkPolicy");
    expect(paths).toContain("inference.provider");
    expect(paths).toContain("security.disableSandbox");
    expect(paths).toContain("model.name");
    expect(paths).toContain("onboarding.skipPreflight");
    expect(paths).toContain("logs.verbose");
  });
});
