// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import {
  buildStartupReport,
  formatReportText,
  formatReportJson,
  formatReportYaml,
  summarizeReport,
} from "./startup-report.js";
import type { ValidationIssue } from "./startup-report.js";

const testTimestamp = "2026-01-15T10:00:00.000Z";

describe("buildStartupReport", () => {
  it("categorizes issues by severity", () => {
    const issues: ValidationIssue[] = [
      { severity: "error", code: "E001", message: "fail" },
      { severity: "warning", code: "W001", message: "warn" },
      { severity: "info", code: "I001", message: "info" },
    ];
    const report = buildStartupReport(issues, { timestamp: testTimestamp });
    expect(report.errors).toHaveLength(1);
    expect(report.warnings).toHaveLength(1);
    expect(report.infos).toHaveLength(1);
    expect(report.issueCount).toBe(3);
  });

  it("sets canProceed to false when errors exist", () => {
    const report = buildStartupReport(
      [{ severity: "error", code: "E1", message: "fail" }],
      { timestamp: testTimestamp },
    );
    expect(report.canProceed).toBe(false);
  });

  it("sets canProceed to true when only warnings", () => {
    const report = buildStartupReport(
      [{ severity: "warning", code: "W1", message: "warn" }],
      { timestamp: testTimestamp },
    );
    expect(report.canProceed).toBe(true);
  });

  it("sets canProceed to true for empty issues", () => {
    const report = buildStartupReport([], { timestamp: testTimestamp });
    expect(report.canProceed).toBe(true);
    expect(report.issueCount).toBe(0);
  });

  it("includes optional metadata", () => {
    const report = buildStartupReport([], {
      timestamp: testTimestamp,
      profile: "dev",
      envVarCount: 5,
      migrationCount: 2,
    });
    expect(report.profile).toBe("dev");
    expect(report.envVarCount).toBe(5);
    expect(report.migrationCount).toBe(2);
  });

  it("uses current timestamp when not provided", () => {
    const report = buildStartupReport([]);
    expect(report.timestamp).toBeDefined();
    expect(report.timestamp.length).toBeGreaterThan(0);
  });
});

describe("formatReportText", () => {
  it("includes header with status", () => {
    const report = buildStartupReport([], { timestamp: testTimestamp });
    const text = formatReportText(report);
    expect(text).toContain("Startup Validation Report");
    expect(text).toContain("PASS");
  });

  it("shows FAIL status when errors exist", () => {
    const report = buildStartupReport(
      [{ severity: "error", code: "E1", message: "fail" }],
      { timestamp: testTimestamp },
    );
    const text = formatReportText(report);
    expect(text).toContain("FAIL");
    expect(text).toContain("ERRORS:");
  });

  it("includes field path and suggestion in issue lines", () => {
    const report = buildStartupReport(
      [
        {
          severity: "error",
          code: "E1",
          message: "bad value",
          fieldPath: "inference.modelId",
          suggestion: "Use a valid model ID",
        },
      ],
      { timestamp: testTimestamp },
    );
    const text = formatReportText(report);
    expect(text).toContain("inference.modelId");
    expect(text).toContain("Use a valid model ID");
  });

  it("shows profile when provided", () => {
    const report = buildStartupReport([], {
      timestamp: testTimestamp,
      profile: "production",
    });
    const text = formatReportText(report);
    expect(text).toContain("Profile: production");
  });

  it("shows 'No issues found' for empty report", () => {
    const report = buildStartupReport([], { timestamp: testTimestamp });
    const text = formatReportText(report);
    expect(text).toContain("No issues found");
  });

  it("includes envVarCount and migrationCount", () => {
    const report = buildStartupReport([], {
      timestamp: testTimestamp,
      envVarCount: 3,
      migrationCount: 1,
    });
    const text = formatReportText(report);
    expect(text).toContain("Environment variables: 3");
    expect(text).toContain("Config migrations applied: 1");
  });
});

describe("formatReportJson", () => {
  it("produces valid JSON", () => {
    const report = buildStartupReport([], { timestamp: testTimestamp });
    const json = formatReportJson(report);
    const parsed = JSON.parse(json);
    expect(parsed.canProceed).toBe(true);
    expect(parsed.errors).toEqual([]);
  });

  it("includes all issues", () => {
    const report = buildStartupReport(
      [
        { severity: "error", code: "E1", message: "err" },
        { severity: "warning", code: "W1", message: "warn" },
      ],
      { timestamp: testTimestamp },
    );
    const json = formatReportJson(report);
    const parsed = JSON.parse(json);
    expect(parsed.errors).toHaveLength(1);
    expect(parsed.warnings).toHaveLength(1);
  });
});

describe("formatReportYaml", () => {
  it("outputs YAML-like format", () => {
    const report = buildStartupReport([], { timestamp: testTimestamp });
    const yaml = formatReportYaml(report);
    expect(yaml).toContain("timestamp:");
    expect(yaml).toContain("canProceed: true");
  });

  it("quotes strings with special characters", () => {
    const report = buildStartupReport(
      [
        {
          severity: "error",
          code: "E1",
          message: "value: bad",
          fieldPath: "some:path",
        },
      ],
      { timestamp: testTimestamp },
    );
    const yaml = formatReportYaml(report);
    expect(yaml).toContain('"value: bad"');
  });

  it("handles nested issue output", () => {
    const report = buildStartupReport(
      [{ severity: "warning", code: "W1", message: "test" }],
      { timestamp: testTimestamp },
    );
    const yaml = formatReportYaml(report);
    expect(yaml).toContain("warnings:");
    expect(yaml).toContain("- severity:");
    expect(yaml).toContain("code: W1");
  });
});

describe("summarizeReport", () => {
  it("returns valid message for no issues", () => {
    const report = buildStartupReport([], { timestamp: testTimestamp });
    expect(summarizeReport(report)).toBe("Configuration valid — no issues");
  });

  it("returns valid message with warnings only", () => {
    const report = buildStartupReport(
      [
        { severity: "warning", code: "W1", message: "w" },
        { severity: "warning", code: "W2", message: "w2" },
        { severity: "info", code: "I1", message: "i" },
      ],
      { timestamp: testTimestamp },
    );
    expect(summarizeReport(report)).toBe(
      "Configuration valid — 2 warning(s), 1 info(s)",
    );
  });

  it("returns invalid message with errors", () => {
    const report = buildStartupReport(
      [
        { severity: "error", code: "E1", message: "e" },
        { severity: "error", code: "E2", message: "e2" },
        { severity: "warning", code: "W1", message: "w" },
      ],
      { timestamp: testTimestamp },
    );
    expect(summarizeReport(report)).toBe(
      "Configuration invalid — 2 error(s), 1 warning(s)",
    );
  });
});
