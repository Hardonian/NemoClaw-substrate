// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export {
  normalizeEnvVars,
  buildConfigFromEnv,
  parseBooleanEnvValue,
  parseNumberEnvValue,
  snakeToCamel,
  filterNemoclawEnvVars,
} from "./env-normalizer.js";

export type {
  EnvNormalizationOptions,
  NormalizedEnvEntry,
} from "./env-normalizer.js";

export {
  detectCycle,
  validateProfiles,
  resolveProfileChain,
  deepMerge,
  resolveProfile,
  findDependents,
} from "./profile-inheritance.js";

export type {
  ProfileDefinition,
  ProfileChainResult,
  CycleDetectionResult,
  ProfileValidationError,
} from "./profile-inheritance.js";

export {
  migrateConfig,
  hasDeprecatedFields,
  listDeprecatedFields,
  getNestedValue,
  setNestedValue,
  deleteNestedValue,
  applyMigrationRule,
  DEPRECATION_RULES,
} from "./migration.js";

export type {
  MigrationEntry,
  MigrationResult,
  DeprecationRule,
} from "./migration.js";

export {
  buildStartupReport,
  formatReportText,
  formatReportJson,
  formatReportYaml,
  summarizeReport,
} from "./startup-report.js";

export type {
  ValidationIssue,
  StartupReport,
  ReportOptions,
} from "./startup-report.js";

export {
  validateAgainstSchema,
  normalizeJsonPointer,
  hardenConfig,
  runStartupValidation,
  dumpConfig,
  NEMOCLAW_CONFIG_SCHEMA,
  DEFAULT_REDACT_KEYS,
} from "./config-validator.js";

export type {
  SchemaValidationResult,
  AjvValidationError,
  HardenedConfig,
  StartupValidationOptions,
  StartupValidationResult,
  ConfigDumpOptions,
} from "./config-validator.js";
