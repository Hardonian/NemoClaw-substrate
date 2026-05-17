// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Migration helpers for deprecated NemoClaw config fields.
 *
 * Pure functions — no I/O. Takes a config object, returns migrated copy
 * plus a log of applied migrations.
 */

export interface MigrationEntry {
  /** The deprecated field path */
  fromPath: string;
  /** The new field path (null if field was removed entirely) */
  toPath: string | null;
  /** Human-readable description of the migration */
  description: string;
  /** Whether the original value was preserved (for soft deprecations) */
  preserved: boolean;
}

export interface MigrationResult {
  /** The migrated config copy */
  config: Record<string, unknown>;
  /** Log of all migrations applied */
  migrations: MigrationEntry[];
  /** Whether any changes were made */
  wasMigrated: boolean;
}

export interface DeprecationRule {
  /** Dotted path of the deprecated field */
  path: string;
  /** Dotted path of the replacement field (null if removed) */
  replacementPath: string | null;
  /** Whether the value should be copied (true) or dropped (false) */
  preserveValue: boolean;
  /** Human-readable description */
  description: string;
  /** Optional transform function for the value */
  transform?: (value: unknown) => unknown;
}

/**
 * Get a value from a nested object using a dotted path.
 */
export function getNestedValue(
  obj: Record<string, unknown>,
  path: string,
): { value: unknown; found: boolean } {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (
      current === null ||
      typeof current !== "object" ||
      Array.isArray(current)
    ) {
      return { value: undefined, found: false };
    }
    const record = current as Record<string, unknown>;
    if (!(part in record)) {
      return { value: undefined, found: false };
    }
    current = record[part];
  }

  return { value: current, found: true };
}

/**
 * Set a value in a nested object using a dotted path.
 * Creates intermediate objects as needed.
 */
export function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const parts = path.split(".");
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (
      current[part] === undefined ||
      typeof current[part] !== "object" ||
      current[part] === null ||
      Array.isArray(current[part])
    ) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
}

/**
 * Delete a value from a nested object using a dotted path.
 */
export function deleteNestedValue(
  obj: Record<string, unknown>,
  path: string,
): boolean {
  const parts = path.split(".");
  let current: unknown = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    if (
      current === null ||
      typeof current !== "object" ||
      Array.isArray(current)
    ) {
      return false;
    }
    const record = current as Record<string, unknown>;
    if (!(parts[i] in record)) {
      return false;
    }
    current = record[parts[i]];
  }

  if (
    current === null ||
    typeof current !== "object" ||
    Array.isArray(current)
  ) {
    return false;
  }

  const record = current as Record<string, unknown>;
  const lastPart = parts[parts.length - 1];
  if (lastPart in record) {
    delete record[lastPart];
    return true;
  }
  return false;
}

/**
 * Apply a single deprecation rule to a config copy.
 */
export function applyMigrationRule(
  config: Record<string, unknown>,
  rule: DeprecationRule,
): MigrationEntry | null {
  const { value, found } = getNestedValue(config, rule.path);

  if (!found) {
    return null;
  }

  let migratedValue = rule.preserveValue ? value : undefined;
  if (rule.transform !== undefined && migratedValue !== undefined) {
    migratedValue = rule.transform(migratedValue);
  }

  if (rule.replacementPath !== null && migratedValue !== undefined) {
    setNestedValue(config, rule.replacementPath, migratedValue);
  }

  deleteNestedValue(config, rule.path);

  return {
    fromPath: rule.path,
    toPath: rule.replacementPath,
    description: rule.description,
    preserved: rule.preserveValue,
  };
}

/**
 * The authoritative list of deprecated fields and their migrations.
 * Add new rules here when deprecating config fields.
 */
export const DEPRECATION_RULES: DeprecationRule[] = [
  {
    path: "sandbox.networkPolicy",
    replacementPath: "sandbox.network.policy",
    preserveValue: true,
    description: "Moved sandbox.networkPolicy to sandbox.network.policy",
  },
  {
    path: "inference.provider",
    replacementPath: "inference.providerKey",
    preserveValue: true,
    description: "Renamed inference.provider to inference.providerKey",
  },
  {
    path: "security.disableSandbox",
    replacementPath: null,
    preserveValue: false,
    description: "Removed security.disableSandbox (sandbox is now mandatory)",
  },
  {
    path: "model.name",
    replacementPath: "inference.modelId",
    preserveValue: true,
    description: "Moved model.name to inference.modelId",
  },
  {
    path: "onboarding.skipPreflight",
    replacementPath: "onboarding.preflight.skip",
    preserveValue: true,
    description: "Moved onboarding.skipPreflight to onboarding.preflight.skip",
  },
  {
    path: "logs.verbose",
    replacementPath: "logs.level",
    preserveValue: true,
    description: "Replaced logs.verbose with logs.level",
    transform: (value) => (value === true ? "debug" : "info"),
  },
];

/**
 * Apply all migration rules to a config object.
 * Returns a new object (does not mutate the input).
 */
export function migrateConfig(
  config: Record<string, unknown>,
  rules: DeprecationRule[] = DEPRECATION_RULES,
): MigrationResult {
  const configCopy = JSON.parse(JSON.stringify(config)) as Record<string, unknown>;
  const migrations: MigrationEntry[] = [];

  for (const rule of rules) {
    const entry = applyMigrationRule(configCopy, rule);
    if (entry !== null) {
      migrations.push(entry);
    }
  }

  return {
    config: configCopy,
    migrations,
    wasMigrated: migrations.length > 0,
  };
}

/**
 * Check if a config object has any deprecated fields.
 */
export function hasDeprecatedFields(
  config: Record<string, unknown>,
  rules: DeprecationRule[] = DEPRECATION_RULES,
): boolean {
  for (const rule of rules) {
    const { found } = getNestedValue(config, rule.path);
    if (found) {
      return true;
    }
  }
  return false;
}

/**
 * Get a list of deprecated fields present in a config object.
 */
export function listDeprecatedFields(
  config: Record<string, unknown>,
  rules: DeprecationRule[] = DEPRECATION_RULES,
): string[] {
  const deprecated: string[] = [];
  for (const rule of rules) {
    const { found } = getNestedValue(config, rule.path);
    if (found) {
      deprecated.push(rule.path);
    }
  }
  return deprecated;
}
