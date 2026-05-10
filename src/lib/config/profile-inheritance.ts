// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Config profile inheritance with cycle detection.
 *
 * Pure functions — no I/O. Resolves a chain of profile names against a
 * registry and detects circular references.
 */

export interface ProfileDefinition {
  name: string;
  /** Names of parent profiles this profile extends (empty if root) */
  extends: string[];
  /** Profile-specific config overrides */
  overrides: Record<string, unknown>;
}

export interface ProfileChainResult {
  /** Ordered list from root to leaf (no cycles) */
  chain: string[];
  /** Merged config with parents applied first, then children */
  merged: Record<string, unknown>;
}

export interface CycleDetectionResult {
  hasCycle: boolean;
  /** The cycle path if one was found */
  cycle: string[];
}

export interface ProfileValidationError {
  type: "missing" | "cycle" | "empty-extends";
  profileName: string;
  message: string;
}

/**
 * Detect cycles in a directed graph of profile -> extends relationships.
 */
export function detectCycle(
  profileName: string,
  registry: ReadonlyMap<string, ProfileDefinition>,
): CycleDetectionResult {
  const visited = new Set<string>();
  const path: string[] = [];
  const pathSet = new Set<string>();

  function dfs(current: string): boolean {
    if (pathSet.has(current)) {
      const cycleStart = path.indexOf(current);
      return true;
    }
    if (visited.has(current)) {
      return false;
    }

    const definition = registry.get(current);
    if (definition === undefined) {
      return false;
    }

    visited.add(current);
    path.push(current);
    pathSet.add(current);

    for (const parent of definition.extends) {
      if (dfs(parent)) {
        return true;
      }
    }

    path.pop();
    pathSet.delete(current);
    return false;
  }

  const hasCycle = dfs(profileName);
  const cycle = hasCycle ? path.slice(path.indexOf(path[path.length - 1] ?? profileName)) : [];

  return { hasCycle, cycle };
}

/**
 * Validate all profiles in a registry for structural issues.
 */
export function validateProfiles(
  registry: ReadonlyMap<string, ProfileDefinition>,
): ProfileValidationError[] {
  const errors: ProfileValidationError[] = [];

  for (const [name, definition] of registry) {
    // Check for missing parent references
    for (const parent of definition.extends) {
      if (!registry.has(parent)) {
        errors.push({
          type: "missing",
          profileName: name,
          message: `Profile '${name}' extends '${parent}', which does not exist`,
        });
      }
    }

    // Check for cycles
    const cycleResult = detectCycle(name, registry);
    if (cycleResult.hasCycle) {
      errors.push({
        type: "cycle",
        profileName: name,
        message: `Profile '${name}' is part of a cycle: ${cycleResult.cycle.join(" -> ")}`,
      });
    }
  }

  return errors;
}

/**
 * Resolve the full inheritance chain for a profile (root to leaf order).
 */
export function resolveProfileChain(
  profileName: string,
  registry: ReadonlyMap<string, ProfileDefinition>,
): { chain: string[] | null; error: string | null } {
  const visited = new Set<string>();
  const chain: string[] = [];

  function build(current: string): string | null {
    if (visited.has(current)) {
      return `Circular inheritance detected involving '${current}'`;
    }

    const definition = registry.get(current);
    if (definition === undefined) {
      return `Profile '${current}' not found in registry`;
    }

    visited.add(current);

    for (const parent of definition.extends) {
      const error = build(parent);
      if (error !== null) {
        return error;
      }
    }

    chain.push(current);
    return null;
  }

  const error = build(profileName);
  return { chain: error === null ? chain : null, error };
}

/**
 * Deep merge two config objects. Child values override parent values.
 * Arrays are replaced (not concatenated).
 */
export function deepMerge(
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(override)) {
    if (
      isPlainObject(value) &&
      isPlainObject(result[key])
    ) {
      result[key] = deepMerge(
        result[key] as Record<string, unknown>,
        value as Record<string, unknown>,
      );
    } else {
      result[key] = value;
    }
  }

  return result;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === "[object Object]"
  );
}

/**
 * Resolve a profile and merge all inherited config into a single object.
 */
export function resolveProfile(
  profileName: string,
  registry: ReadonlyMap<string, ProfileDefinition>,
): { result: ProfileChainResult | null; error: string | null } {
  const { chain, error } = resolveProfileChain(profileName, registry);

  if (error !== null || chain === null) {
    return { result: null, error: error ?? "Unknown error resolving profile chain" };
  }

  let merged: Record<string, unknown> = {};
  for (const name of chain) {
    const definition = registry.get(name);
    if (definition !== undefined) {
      merged = deepMerge(merged, definition.overrides);
    }
  }

  return { result: { chain, merged }, error: null };
}

/**
 * List all profiles that extend a given base profile (reverse dependency lookup).
 */
export function findDependents(
  baseProfile: string,
  registry: ReadonlyMap<string, ProfileDefinition>,
): string[] {
  const dependents: string[] = [];

  for (const [name, definition] of registry) {
    if (definition.extends.includes(baseProfile)) {
      dependents.push(name);
    }
  }

  return dependents;
}
