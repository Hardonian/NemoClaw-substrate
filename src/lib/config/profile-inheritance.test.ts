// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import {
  detectCycle,
  validateProfiles,
  resolveProfileChain,
  deepMerge,
  resolveProfile,
  findDependents,
} from "./profile-inheritance.js";
import type { ProfileDefinition } from "./profile-inheritance.js";

function makeRegistry(...defs: ProfileDefinition[]): Map<string, ProfileDefinition> {
  return new Map(defs.map((d) => [d.name, d]));
}

describe("detectCycle", () => {
  it("returns no cycle for linear chain", () => {
    const registry = makeRegistry(
      { name: "a", extends: ["b"], overrides: {} },
      { name: "b", extends: [], overrides: {} },
    );
    const result = detectCycle("a", registry);
    expect(result.hasCycle).toBe(false);
    expect(result.cycle).toEqual([]);
  });

  it("detects direct cycle", () => {
    const registry = makeRegistry(
      { name: "a", extends: ["b"], overrides: {} },
      { name: "b", extends: ["a"], overrides: {} },
    );
    const result = detectCycle("a", registry);
    expect(result.hasCycle).toBe(true);
    expect(result.cycle.length).toBeGreaterThan(0);
  });

  it("detects indirect cycle", () => {
    const registry = makeRegistry(
      { name: "a", extends: ["b"], overrides: {} },
      { name: "b", extends: ["c"], overrides: {} },
      { name: "c", extends: ["a"], overrides: {} },
    );
    const result = detectCycle("a", registry);
    expect(result.hasCycle).toBe(true);
  });

  it("returns false for missing profile", () => {
    const registry = makeRegistry();
    const result = detectCycle("nonexistent", registry);
    expect(result.hasCycle).toBe(false);
  });
});

describe("validateProfiles", () => {
  it("returns no errors for valid registry", () => {
    const registry = makeRegistry(
      { name: "base", extends: [], overrides: {} },
      { name: "dev", extends: ["base"], overrides: {} },
    );
    const errors = validateProfiles(registry);
    expect(errors).toEqual([]);
  });

  it("detects missing parent", () => {
    const registry = makeRegistry(
      { name: "child", extends: ["missing"], overrides: {} },
    );
    const errors = validateProfiles(registry);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].type).toBe("missing");
    expect(errors[0].message).toContain("missing");
  });

  it("detects cycle", () => {
    const registry = makeRegistry(
      { name: "a", extends: ["b"], overrides: {} },
      { name: "b", extends: ["a"], overrides: {} },
    );
    const errors = validateProfiles(registry);
    expect(errors.some((e) => e.type === "cycle")).toBe(true);
  });
});

describe("resolveProfileChain", () => {
  it("resolves linear chain in root-to-leaf order", () => {
    const registry = makeRegistry(
      { name: "base", extends: [], overrides: { x: 1 } },
      { name: "staging", extends: ["base"], overrides: { x: 2 } },
      { name: "dev", extends: ["staging"], overrides: { x: 3 } },
    );
    const result = resolveProfileChain("dev", registry);
    expect(result.error).toBeNull();
    expect(result.chain).toEqual(["base", "staging", "dev"]);
  });

  it("returns error for missing profile", () => {
    const registry = makeRegistry(
      { name: "base", extends: [], overrides: {} },
    );
    const result = resolveProfileChain("missing", registry);
    expect(result.error).not.toBeNull();
    expect(result.chain).toBeNull();
  });

  it("returns error for cycle", () => {
    const registry = makeRegistry(
      { name: "a", extends: ["b"], overrides: {} },
      { name: "b", extends: ["a"], overrides: {} },
    );
    const result = resolveProfileChain("a", registry);
    expect(result.error).not.toBeNull();
    expect(result.error).toContain("Circular");
  });

  it("resolves single profile with no parents", () => {
    const registry = makeRegistry(
      { name: "solo", extends: [], overrides: { val: "yes" } },
    );
    const result = resolveProfileChain("solo", registry);
    expect(result.error).toBeNull();
    expect(result.chain).toEqual(["solo"]);
  });
});

describe("deepMerge", () => {
  it("merges flat objects", () => {
    const result = deepMerge({ a: 1 }, { b: 2 });
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it("child overrides parent", () => {
    const result = deepMerge({ x: 1 }, { x: 2 });
    expect(result).toEqual({ x: 2 });
  });

  it("deep merges nested objects", () => {
    const result = deepMerge(
      { nested: { a: 1, b: 2 } },
      { nested: { b: 3, c: 4 } },
    );
    expect(result).toEqual({
      nested: { a: 1, b: 3, c: 4 },
    });
  });

  it("replaces arrays", () => {
    const result = deepMerge(
      { arr: [1, 2, 3] },
      { arr: [4, 5] },
    );
    expect(result).toEqual({ arr: [4, 5] });
  });

  it("handles empty objects", () => {
    expect(deepMerge({}, {})).toEqual({});
    expect(deepMerge({ a: 1 }, {})).toEqual({ a: 1 });
    expect(deepMerge({}, { b: 2 })).toEqual({ b: 2 });
  });
});

describe("resolveProfile", () => {
  it("returns merged config with chain", () => {
    const registry = makeRegistry(
      { name: "base", extends: [], overrides: { logLevel: "info", timeout: 30 } },
      { name: "dev", extends: ["base"], overrides: { logLevel: "debug" } },
    );
    const { result, error } = resolveProfile("dev", registry);
    expect(error).toBeNull();
    expect(result).not.toBeNull();
    expect(result?.chain).toEqual(["base", "dev"]);
    expect(result?.merged).toEqual({ logLevel: "debug", timeout: 30 });
  });

  it("returns error for missing profile", () => {
    const registry = makeRegistry();
    const { result, error } = resolveProfile("missing", registry);
    expect(result).toBeNull();
    expect(error).not.toBeNull();
  });
});

describe("findDependents", () => {
  it("finds all profiles extending a base", () => {
    const registry = makeRegistry(
      { name: "base", extends: [], overrides: {} },
      { name: "dev", extends: ["base"], overrides: {} },
      { name: "staging", extends: ["base"], overrides: {} },
      { name: "prod", extends: ["staging"], overrides: {} },
    );
    const deps = findDependents("base", registry);
    expect(deps).toContain("dev");
    expect(deps).toContain("staging");
    expect(deps).not.toContain("prod");
  });

  it("returns empty array for unused profile", () => {
    const registry = makeRegistry(
      { name: "solo", extends: [], overrides: {} },
    );
    expect(findDependents("solo", registry)).toEqual([]);
  });
});
