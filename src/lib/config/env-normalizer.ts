// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Environment variable normalization for NemoClaw configuration.
 *
 * Pure functions — no I/O. Takes raw env objects, returns normalized key/value maps.
 */

export interface EnvNormalizationOptions {
  /** Prefix to strip (default: "NEMOCLAW_") */
  prefix?: string;
  /** Keys to exclude entirely from output (e.g. secrets) */
  excludeKeys?: string[];
}

export interface NormalizedEnvEntry {
  key: string;
  originalKey: string;
  value: string;
}

/**
 * Normalize environment variables by stripping a prefix and converting
 * SCREAMING_SNAKE_CASE keys to camelCase.
 */
export function normalizeEnvVars(
  env: Record<string, string | undefined>,
  options: EnvNormalizationOptions = {},
): NormalizedEnvEntry[] {
  const prefix = options.prefix ?? "NEMOCLAW_";
  const excludeKeys = new Set(options.excludeKeys ?? []);
  const results: NormalizedEnvEntry[] = [];

  for (const [rawKey, rawValue] of Object.entries(env)) {
    if (rawValue === undefined || rawValue === "") {
      continue;
    }
    if (excludeKeys.has(rawKey)) {
      continue;
    }
    if (!rawKey.startsWith(prefix)) {
      continue;
    }

    const strippedKey = rawKey.slice(prefix.length);
    const camelKey = snakeToCamel(strippedKey);

    results.push({
      key: camelKey,
      originalKey: rawKey,
      value: rawValue,
    });
  }

  return results;
}

/**
 * Convert a flat list of normalized env entries into a merged config object.
 * Later entries (alphabetically by original key) override earlier ones.
 */
export function buildConfigFromEnv(entries: NormalizedEnvEntry[]): Record<string, string> {
  const config: Record<string, string> = {};
  for (const entry of entries) {
    config[entry.key] = entry.value;
  }
  return config;
}

/**
 * Parse a boolean-like env var value. Returns undefined if the value
 * is not recognized as a boolean string.
 */
export function parseBooleanEnvValue(value: string): boolean | undefined {
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on") {
    return true;
  }
  if (normalized === "false" || normalized === "0" || normalized === "no" || normalized === "off") {
    return false;
  }
  return undefined;
}

/**
 * Parse a numeric env var value. Returns undefined if the value is not a valid finite number.
 */
export function parseNumberEnvValue(value: string): number | undefined {
  const trimmed = value.trim();
  const num = Number(trimmed);
  if (!Number.isFinite(num)) {
    return undefined;
  }
  return num;
}

/**
 * Convert SCREAMING_SNAKE_CASE to camelCase.
 */
export function snakeToCamel(input: string): string {
  return input
    .toLowerCase()
    .replace(/_([a-z])/g, (_, char) => char.toUpperCase());
}

/**
 * Extract only the NEMOCLAW_-prefixed keys from a full env object.
 */
export function filterNemoclawEnvVars(
  env: Record<string, string | undefined>,
  prefix = "NEMOCLAW_",
): Record<string, string> {
  const filtered: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (key.startsWith(prefix) && value !== undefined && value !== "") {
      filtered[key] = value;
    }
  }
  return filtered;
}
