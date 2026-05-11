// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, chmodSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  checkEnvironmentSafety,
  isEnvironmentSafe,
  environmentSafetySummary,
} from "./environment-safety";

describe("checkEnvironmentSafety", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "env-safety-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("reports non-existent files as not too permissive", () => {
    const report = checkEnvironmentSafety({
      checkPaths: [join(tmpDir, "nonexistent.txt")],
      checkNetwork: false,
      checkUmask: false,
    });

    const fileCheck = report.fileChecks.find(
      (f) => f.path === join(tmpDir, "nonexistent.txt"),
    );
    expect(fileCheck).toBeDefined();
    expect(fileCheck?.exists).toBe(false);
    expect(fileCheck?.isTooPermissive).toBe(false);
    expect(fileCheck?.issue).toBeNull();
  });

  it("detects files with overly permissive permissions", () => {
    const filePath = join(tmpDir, "config.json");
    writeFileSync(filePath, "{}");
    chmodSync(filePath, 0o777);

    const report = checkEnvironmentSafety({
      checkPaths: [filePath],
      maxAllowedPermission: 0o600,
      checkNetwork: false,
      checkUmask: false,
    });

    const fileCheck = report.fileChecks.find((f) => f.path === filePath);
    expect(fileCheck).toBeDefined();
    expect(fileCheck?.exists).toBe(true);
    expect(fileCheck?.isTooPermissive).toBe(true);
    expect(fileCheck?.issue).toContain("exceeds max");
  });

  it("passes files with acceptable permissions", () => {
    const filePath = join(tmpDir, "config.json");
    writeFileSync(filePath, "{}");
    chmodSync(filePath, 0o600);

    const report = checkEnvironmentSafety({
      checkPaths: [filePath],
      maxAllowedPermission: 0o600,
      checkNetwork: false,
      checkUmask: false,
    });

    const fileCheck = report.fileChecks.find((f) => f.path === filePath);
    expect(fileCheck).toBeDefined();
    expect(fileCheck?.isTooPermissive).toBe(false);
    expect(fileCheck?.issue).toBeNull();
  });

  it("checks umask", () => {
    const currentUmask = process.umask();
    const report = checkEnvironmentSafety({
      checkPaths: [],
      checkNetwork: false,
      checkUmask: true,
      expectedUmask: currentUmask,
    });

    expect(report.umaskOk).toBe(true);
    expect(report.umaskValue).toBe(currentUmask);
  });

  it("reports umask mismatch", () => {
    const currentUmask = process.umask();
    const wrongUmask = currentUmask === 0o077 ? 0o022 : 0o077;
    const report = checkEnvironmentSafety({
      checkPaths: [],
      checkNetwork: false,
      checkUmask: true,
      expectedUmask: wrongUmask,
    });

    expect(report.umaskOk).toBe(false);
    expect(report.issues.length).toBeGreaterThan(0);
  });

  it("checks network exposure", () => {
    const report = checkEnvironmentSafety({
      checkPaths: [],
      checkUmask: false,
      checkNetwork: true,
    });

    expect(report.networkExposure.length).toBeGreaterThan(0);
    expect(report.networkExposure[0]).toHaveProperty("interface");
    expect(report.networkExposure[0]).toHaveProperty("address");
    expect(report.networkExposure[0]).toHaveProperty("isPublic");
    expect(report.networkExposure[0]).toHaveProperty("isLoopback");
  });

  it("reports overall pass/fail status", () => {
    const passReport = checkEnvironmentSafety({
      checkPaths: [join(tmpDir, "nonexistent.txt")],
      checkUmask: false,
      checkNetwork: false,
    });
    expect(passReport.passed).toBe(true);

    const filePath = join(tmpDir, "bad.txt");
    writeFileSync(filePath, "{}");
    chmodSync(filePath, 0o777);

    const failReport = checkEnvironmentSafety({
      checkPaths: [filePath],
      maxAllowedPermission: 0o600,
      checkUmask: false,
      checkNetwork: false,
    });
    expect(failReport.passed).toBe(false);
  });
});

describe("isEnvironmentSafe", () => {
  it("returns boolean", () => {
    const result = isEnvironmentSafe({
      checkPaths: [],
      checkUmask: false,
      checkNetwork: false,
    });
    expect(typeof result).toBe("boolean");
  });
});

describe("environmentSafetySummary", () => {
  it("returns pass message for clean reports", () => {
    const report = checkEnvironmentSafety({
      checkPaths: [],
      checkUmask: false,
      checkNetwork: false,
    });
    expect(environmentSafetySummary(report)).toContain("passed");
    expect(environmentSafetySummary(report)).toContain("No issues");
  });

  it("returns issue details for failing reports", () => {
    const report = {
      passed: false,
      fileChecks: [],
      umaskOk: true,
      umaskValue: 0,
      networkExposure: [],
      issues: ["Test issue 1", "Test issue 2"],
    };
    const summary = environmentSafetySummary(report);
    expect(summary).toContain("2 issue(s)");
    expect(summary).toContain("Test issue 1");
    expect(summary).toContain("Test issue 2");
  });
});
