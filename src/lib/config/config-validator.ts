// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Config validation and hardening module.
 *
 * Uses Ajv (JSON Schema) for schema validation, with integration
 * to env normalization, profile inheritance, migration, and startup reports.
 *
 * Pure validation functions — no I/O in core logic.
 */

import Ajv from "ajv";
import type { ErrorObject } from "ajv";
import type { NormalizedEnvEntry } from "./env-normalizer.js";
import type { ProfileDefinition, ProfileChainResult } from "./profile-inheritance.js";
import { resolveProfile, validateProfiles } from "./profile-inheritance.js";
import type { MigrationResult } from "./migration.js";
import { migrateConfig, listDeprecatedFields } from "./migration.js";
import type { ValidationIssue, StartupReport } from "./startup-report.js";
import { buildStartupReport } from "./startup-report.js";

// ---------------------------------------------------------------------------
// Ajv-based schema validation
// ---------------------------------------------------------------------------

export interface SchemaValidationResult {
  valid: boolean;
  errors: AjvValidationError[];
}

export interface AjvValidationError {
  /** JSON path to the failing field */
  path: string;
  /** Ajv keyword that failed */
  keyword: string;
  /** Human-readable message */
  message: string;
}

/**
 * Validate a config object against a JSON Schema using Ajv.
 */
export function validateAgainstSchema(
  config: Record<string, unknown>,
  schema: Record<string, unknown>,
): SchemaValidationResult {
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  const valid = validate(config);

  if (valid) {
    return { valid: true, errors: [] };
  }

  const errors: AjvValidationError[] = (validate.errors ?? []).map(
    (err: ErrorObject) => ({
      path: normalizeJsonPointer(err.instancePath),
      keyword: err.keyword,
      message: err.message ?? "Validation failed",
    }),
  );

  return { valid: false, errors };
}

/**
 * Convert Ajv JSON pointer (/a/b/c) to dotted path (a.b.c).
 */
export function normalizeJsonPointer(pointer: string): string {
  if (pointer === "" || pointer === "/") {
    return "(root)";
  }
  const parts = pointer.slice(1).split("/");
  let result = parts[0];
  for (let i = 1; i < parts.length; i++) {
    if (/^\d+$/.test(parts[i])) {
      result += `[${parts[i]}]`;
    } else {
      result += `.${parts[i]}`;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Schema definitions
// ---------------------------------------------------------------------------

/**
 * The base NemoClaw config schema.
 */
export const NEMOCLAW_CONFIG_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: true,
  properties: {
    inference: {
      type: "object",
      additionalProperties: true,
      properties: {
        providerKey: { type: "string", minLength: 1 },
        modelId: { type: "string", minLength: 1 },
        baseUrl: { type: "string", format: "uri" },
        apiKey: { type: "string", minLength: 1 },
        timeout: { type: "number", minimum: 1 },
        retries: { type: "number", minimum: 0 },
      },
    },
    sandbox: {
      type: "object",
      additionalProperties: true,
      properties: {
        network: {
          type: "object",
          additionalProperties: true,
          properties: {
            policy: { type: "string", minLength: 1 },
          },
        },
        image: { type: "string", minLength: 1 },
        cpuLimit: { type: "number", minimum: 1 },
        memoryLimit: { type: "string", minLength: 1 },
      },
    },
    onboarding: {
      type: "object",
      additionalProperties: true,
      properties: {
        preflight: {
          type: "object",
          additionalProperties: true,
          properties: {
            skip: { type: "boolean" },
          },
        },
      },
    },
    logs: {
      type: "object",
      additionalProperties: true,
      properties: {
        level: { type: "string", enum: ["debug", "info", "warn", "error"] },
        format: { type: "string", enum: ["json", "text"] },
      },
    },
    profile: {
      type: "string",
      minLength: 1,
    },
  },
};

// ---------------------------------------------------------------------------
// Config hardening
// ---------------------------------------------------------------------------

export interface HardenedConfig {
  /** The sanitized config */
  config: Record<string, unknown>;
  /** Fields that were removed during hardening */
  removedFields: string[];
  /** Warnings generated during hardening */
  warnings: string[];
}

/**
 * Harden a config object by removing unsafe values and normalizing types.
 */
export function hardenConfig(
  config: Record<string, unknown>,
): HardenedConfig {
  const sanitized: Record<string, unknown> = {};
  const removedFields: string[] = [];
  const warnings: string[] = [];

  for (const [key, value] of Object.entries(config)) {
    const result = sanitizeValue(config, key, value);
    if (result.removed) {
      removedFields.push(key);
    } else if (result.warning !== undefined) {
      warnings.push(result.warning);
    }
    if (result.value !== undefined || !result.removed) {
      sanitized[key] = result.value;
    }
  }

  return { config: sanitized, removedFields, warnings };
}

interface SanitizeResult {
  value: unknown;
  removed: boolean;
  warning?: string;
}

function sanitizeValue(
  _parent: Record<string, unknown>,
  key: string,
  value: unknown,
): SanitizeResult {
  // Block prototype pollution keys
  if (key === "__proto__" || key === "constructor" || key === "prototype") {
    return { value: undefined, removed: true };
  }

  // Block function values in config
  if (typeof value === "function") {
    return { value: undefined, removed: true };
  }

  // Block undefined/null at top level silently
  if (value === undefined) {
    return { value: undefined, removed: true };
  }

  if (value === null) {
    return { value: null, removed: false };
  }

  // Deep-sanitize nested objects
  if (typeof value === "object" && !Array.isArray(value)) {
    const nested = hardenConfig(value as Record<string, unknown>);
    return { value: nested.config, removed: false };
  }

  // Strings: trim whitespace
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed !== value) {
      return {
        value: trimmed,
        removed: false,
        warning: `Trimmed whitespace from config key '${key}'`,
      };
    }
  }

  return { value, removed: false };
}

// ---------------------------------------------------------------------------
// Startup validation pipeline
// ---------------------------------------------------------------------------

export interface StartupValidationOptions {
  /** Raw config object */
  config: Record<string, unknown>;
  /** JSON Schema to validate against (defaults to NEMOCLAW_CONFIG_SCHEMA) */
  schema?: Record<string, unknown>;
  /** Profile registry for inheritance resolution */
  profileRegistry?: Map<string, ProfileDefinition>;
  /** Name of the config profile to resolve */
  profileName?: string;
  /** Normalized environment variable entries */
  envEntries?: NormalizedEnvEntry[];
  /** Whether to apply config migrations */
  applyMigrations?: boolean;
  /** Custom deprecation rules */
  migrationRules?: import("./migration.js").DeprecationRule[];
}

export interface StartupValidationResult {
  report: StartupReport;
  /** Merged and hardened config */
  config: Record<string, unknown>;
  /** Profile chain result (if a profile was resolved) */
  profileResult?: ProfileChainResult | null;
  /** Migration log (if migrations were applied) */
  migrationResult?: MigrationResult;
}

/**
 * Run the full startup validation pipeline:
 * 1. Apply migrations (if enabled)
 * 2. Resolve profile inheritance (if profile name and registry provided)
 * 3. Harden config
 * 4. Validate against schema
 * 5. Build startup report
 */
export function runStartupValidation(
  options: StartupValidationOptions,
): StartupValidationResult {
  const issues: ValidationIssue[] = [];
  let config = { ...options.config };

  // Step 1: Apply migrations
  let migrationResult: MigrationResult | undefined;
  if (options.applyMigrations !== false) {
    migrationResult = migrateConfig(config, options.migrationRules);
    if (migrationResult.wasMigrated) {
      config = migrationResult.config;
      for (const migration of migrationResult.migrations) {
        issues.push({
          severity: "warning",
          code: "MIGRATED_FIELD",
          message: migration.description,
          fieldPath: migration.fromPath,
          suggestion:
            migration.toPath !== null
              ? `Update your config to use '${migration.toPath}'`
              : "Remove this deprecated field from your config",
        });
      }
    }
  }

  // Step 2: Check for remaining deprecated fields
  const deprecated = listDeprecatedFields(config, options.migrationRules);
  for (const field of deprecated) {
    issues.push({
      severity: "warning",
      code: "DEPRECATED_FIELD",
      message: `Field '${field}' is deprecated and will be removed in a future version`,
      fieldPath: field,
      suggestion: "Run config migration to update to the latest format",
    });
  }

  // Step 3: Resolve profile inheritance
  let profileResult: ProfileChainResult | null | undefined;
  if (options.profileName !== undefined && options.profileRegistry !== undefined) {
    const { result, error } = resolveProfile(options.profileName, options.profileRegistry);
    if (error !== null) {
      issues.push({
        severity: "error",
        code: "PROFILE_RESOLVE_ERROR",
        message: error,
        fieldPath: "profile",
      });
    } else if (result !== null) {
      profileResult = result;
      // Merge profile overrides into config
      config = { ...result.merged, ...config } as Record<string, unknown>;
    }

    // Check for structural issues in all profiles
    const profileErrors = validateProfiles(options.profileRegistry);
    for (const err of profileErrors) {
      issues.push({
        severity: err.type === "cycle" ? "error" : "warning",
        code:
          err.type === "cycle"
            ? "PROFILE_CYCLE"
            : err.type === "missing"
              ? "PROFILE_MISSING"
              : "PROFILE_WARNING",
        message: err.message,
        fieldPath: "profile",
      });
    }
  }

  // Step 4: Harden config
  const hardened = hardenConfig(config);
  config = hardened.config;
  for (const warning of hardened.warnings) {
    issues.push({
      severity: "info",
      code: "CONFIG_HARDENED",
      message: warning,
    });
  }
  for (const field of hardened.removedFields) {
    issues.push({
      severity: "warning",
      code: "CONFIG_REMOVED_FIELD",
      message: `Removed unsafe field '${field}' from config`,
      fieldPath: field,
    });
  }

  // Step 5: Validate against schema
  const schema = options.schema ?? NEMOCLAW_CONFIG_SCHEMA;
  const schemaResult = validateAgainstSchema(config, schema);
  if (!schemaResult.valid) {
    for (const err of schemaResult.errors) {
      issues.push({
        severity: "error",
        code: "SCHEMA_VALIDATION",
        message: err.message,
        fieldPath: err.path,
        suggestion: `Fix the '${err.keyword}' constraint at '${err.path}'`,
      });
    }
  }

  // Step 6: Build report
  const report = buildStartupReport(issues, {
    profile: options.profileName,
    envVarCount: options.envEntries?.length,
    migrationCount: migrationResult?.migrations.length,
  });

  return {
    report,
    config,
    profileResult,
    migrationResult,
  };
}

// ---------------------------------------------------------------------------
// Config dump
// ---------------------------------------------------------------------------

export interface ConfigDumpOptions {
  /** Keys to redact in the output */
  redactKeys?: string[];
  /** Format: 'json' | 'yaml' */
  format?: "json" | "yaml";
  /** Indentation level */
  indent?: number;
}

/**
 * Dump a config object as JSON or YAML string, optionally redacting sensitive keys.
 */
export function dumpConfig(
  config: Record<string, unknown>,
  options: ConfigDumpOptions = {},
): string {
  const format = options.format ?? "json";
  const indent = options.indent ?? 2;
  const redacted = redactKeys(config, new Set(options.redactKeys ?? []));

  if (format === "json") {
    return JSON.stringify(redacted, null, indent);
  }

  // Simple YAML serialization (no external deps)
  return toYaml(redacted, indent);
}

function redactKeys(
  config: Record<string, unknown>,
  keysToRedact: Set<string>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(config)) {
    if (keysToRedact.has(key)) {
      result[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      result[key] = redactKeys(value as Record<string, unknown>, keysToRedact);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Common sensitive key patterns to redact by default.
 */
export const DEFAULT_REDACT_KEYS = [
  "apiKey",
  "api_key",
  "secret",
  "password",
  "token",
  "credential",
  "privateKey",
];

function toYaml(
  value: unknown,
  indent: number,
  currentIndent = 0,
): string {
  if (value === null) {
    return "null";
  }
  if (value === undefined) {
    return "null";
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "string") {
    if (/[{}[\],&*#?|\->!%@`:"'\n]/.test(value) || value === "") {
      return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
    }
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]";
    }
    const lines: string[] = [];
    for (const item of value) {
      const prefix = " ".repeat(currentIndent) + "- ";
      if (typeof item === "object" && item !== null) {
        const yaml = toYaml(item, indent, currentIndent + indent);
        const yamlLines = yaml.split("\n");
        lines.push(prefix + yamlLines[0]);
        for (let i = 1; i < yamlLines.length; i++) {
          lines.push(" ".repeat(currentIndent + indent) + yamlLines[i]);
        }
      } else {
        lines.push(prefix + toYaml(item, indent));
      }
    }
    return lines.join("\n");
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return "{}";
    }
    const lines: string[] = [];
    for (const [key, val] of entries) {
      const prefix = " ".repeat(currentIndent);
      if (typeof val === "object" && val !== null && !Array.isArray(val)) {
        lines.push(`${prefix}${key}:`);
        lines.push(toYaml(val, indent, currentIndent + indent));
      } else if (Array.isArray(val)) {
        lines.push(`${prefix}${key}:`);
        lines.push(toYaml(val, indent, currentIndent + indent));
      } else {
        lines.push(`${prefix}${key}: ${toYaml(val, indent)}`);
      }
    }
    return lines.join("\n");
  }
  return String(value);
}
