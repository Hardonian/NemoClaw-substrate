// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Startup validation report generation.
 *
 * Pure functions — no I/O. Builds structured reports from validation results
 * for display or machine consumption.
 */

export interface ValidationIssue {
  /** Issue severity */
  severity: "error" | "warning" | "info";
  /** Short code identifying the issue type */
  code: string;
  /** Human-readable message */
  message: string;
  /** Optional path to the config field causing the issue */
  fieldPath?: string;
  /** Optional suggested fix */
  suggestion?: string;
}

export interface StartupReport {
  /** Timestamp when the report was generated */
  timestamp: string;
  /** Whether startup can proceed */
  canProceed: boolean;
  /** Total number of issues */
  issueCount: number;
  /** Issues grouped by severity */
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  infos: ValidationIssue[];
  /** Config profile that was loaded */
  profile?: string;
  /** Summary of environment variables consumed */
  envVarCount?: number;
  /** Summary of migrations applied */
  migrationCount?: number;
}

export interface ReportOptions {
  /** Override the timestamp (useful for testing) */
  timestamp?: string;
  /** Config profile name */
  profile?: string;
  /** Number of environment variables loaded */
  envVarCount?: number;
  /** Number of config migrations applied */
  migrationCount?: number;
}

/**
 * Build a startup validation report from a list of issues.
 */
export function buildStartupReport(
  issues: ValidationIssue[],
  options: ReportOptions = {},
): StartupReport {
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  const infos = issues.filter((i) => i.severity === "info");

  return {
    timestamp: options.timestamp ?? new Date().toISOString(),
    canProceed: errors.length === 0,
    issueCount: issues.length,
    errors,
    warnings,
    infos,
    profile: options.profile,
    envVarCount: options.envVarCount,
    migrationCount: options.migrationCount,
  };
}

/**
 * Format a startup report as a human-readable string.
 */
export function formatReportText(report: StartupReport): string {
  const lines: string[] = [];

  lines.push("=".repeat(60));
  lines.push("NemoClaw Startup Validation Report");
  lines.push(`Timestamp: ${report.timestamp}`);
  if (report.profile !== undefined) {
    lines.push(`Profile: ${report.profile}`);
  }
  lines.push(`Status: ${report.canProceed ? "PASS" : "FAIL"}`);
  lines.push(`Issues: ${report.issueCount} total (${report.errors.length} errors, ${report.warnings.length} warnings, ${report.infos.length} info)`);
  if (report.envVarCount !== undefined) {
    lines.push(`Environment variables: ${report.envVarCount}`);
  }
  if (report.migrationCount !== undefined) {
    lines.push(`Config migrations applied: ${report.migrationCount}`);
  }
  lines.push("=".repeat(60));

  if (report.errors.length > 0) {
    lines.push("");
    lines.push("ERRORS:");
    for (const issue of report.errors) {
      lines.push(formatIssueLine(issue));
    }
  }

  if (report.warnings.length > 0) {
    lines.push("");
    lines.push("WARNINGS:");
    for (const issue of report.warnings) {
      lines.push(formatIssueLine(issue));
    }
  }

  if (report.infos.length > 0) {
    lines.push("");
    lines.push("INFO:");
    for (const issue of report.infos) {
      lines.push(formatIssueLine(issue));
    }
  }

  if (report.issueCount === 0) {
    lines.push("");
    lines.push("No issues found. Configuration is valid.");
  }

  return lines.join("\n");
}

function formatIssueLine(issue: ValidationIssue): string {
  let line = `  [${issue.code}] ${issue.message}`;
  if (issue.fieldPath !== undefined) {
    line += ` (field: ${issue.fieldPath})`;
  }
  if (issue.suggestion !== undefined) {
    line += ` — suggestion: ${issue.suggestion}`;
  }
  return line;
}

/**
 * Format a report as JSON string (for machine consumption).
 */
export function formatReportJson(report: StartupReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Format a report as a YAML-like string (for human-readable output).
 * Uses simple key: value format — no external YAML library required.
 */
export function formatReportYaml(report: StartupReport): string {
  const lines: string[] = [];

  lines.push("timestamp: " + yamlString(report.timestamp));
  lines.push("canProceed: " + yamlBool(report.canProceed));
  lines.push("issueCount: " + report.issueCount);

  if (report.profile !== undefined) {
    lines.push("profile: " + yamlString(report.profile));
  }
  if (report.envVarCount !== undefined) {
    lines.push("envVarCount: " + report.envVarCount);
  }
  if (report.migrationCount !== undefined) {
    lines.push("migrationCount: " + report.migrationCount);
  }

  lines.push("errors:");
  for (const issue of report.errors) {
    lines.push(formatIssueYaml(issue));
  }

  lines.push("warnings:");
  for (const issue of report.warnings) {
    lines.push(formatIssueYaml(issue));
  }

  lines.push("infos:");
  for (const issue of report.infos) {
    lines.push(formatIssueYaml(issue));
  }

  return lines.join("\n");
}

function formatIssueYaml(issue: ValidationIssue): string {
  let line = "  - severity: " + yamlString(issue.severity);
  line += "\n    code: " + yamlString(issue.code);
  line += "\n    message: " + yamlString(issue.message);
  if (issue.fieldPath !== undefined) {
    line += "\n    fieldPath: " + yamlString(issue.fieldPath);
  }
  if (issue.suggestion !== undefined) {
    line += "\n    suggestion: " + yamlString(issue.suggestion);
  }
  return line;
}

function yamlString(value: string): string {
  // Quote strings that contain special characters
  if (/[{}[\],&*#?|\->!%@`]/.test(value) || value.includes(":") || value === "") {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return value;
}

function yamlBool(value: boolean): string {
  return value ? "true" : "false";
}

/**
 * Summarize a report into a single-line status string.
 */
export function summarizeReport(report: StartupReport): string {
  if (report.canProceed) {
    if (report.issueCount === 0) {
      return "Configuration valid — no issues";
    }
    return `Configuration valid — ${report.warnings.length} warning(s), ${report.infos.length} info(s)`;
  }
  return `Configuration invalid — ${report.errors.length} error(s), ${report.warnings.length} warning(s)`;
}
