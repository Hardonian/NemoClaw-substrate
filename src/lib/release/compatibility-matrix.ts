// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * CLI/server/SDK version compatibility matrix.
 *
 * Pure functions — no I/O. Determines whether given CLI, server, and SDK
 * versions are mutually compatible.
 */

export interface CompatibilityMatrix {
  cliMin: string;
  cliMax: string;
  serverMin: string;
  serverMax: string;
  sdkMin: string;
  sdkMax: string;
}

export interface CompatibilityCheck {
  cliCompatible: boolean;
  serverCompatible: boolean;
  sdkCompatible: boolean;
  overall: boolean;
}

export function compareSemver(a: string, b: string): number {
  const parse = (v: string) =>
    v
      .split(".")[0]
      .split("-")[0]
      .split("+")[0]
      .split(".")
      .map(Number);

  const pa = parse(a);
  const pb = parse(b);

  for (let i = 0; i < 3; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) {
      return da - db;
    }
  }
  return 0;
}

export function inRange(
  version: string,
  min: string,
  max: string,
): boolean {
  return compareSemver(version, min) >= 0 && compareSemver(version, max) <= 0;
}

export function checkCompatibility(
  cliVersion: string,
  serverVersion: string,
  sdkVersion: string,
  matrix: CompatibilityMatrix,
): CompatibilityCheck {
  const cliCompatible = inRange(cliVersion, matrix.cliMin, matrix.cliMax);
  const serverCompatible = inRange(serverVersion, matrix.serverMin, matrix.serverMax);
  const sdkCompatible = inRange(sdkVersion, matrix.sdkMin, matrix.sdkMax);

  return {
    cliCompatible,
    serverCompatible,
    sdkCompatible,
    overall: cliCompatible && serverCompatible && sdkCompatible,
  };
}

export function createDefaultMatrix(): CompatibilityMatrix {
  return {
    cliMin: "0.1.0",
    cliMax: "0.99.0",
    serverMin: "0.1.0",
    serverMax: "0.99.0",
    sdkMin: "0.1.0",
    sdkMax: "0.99.0",
  };
}

export function matrixForVersion(
  version: string,
): CompatibilityMatrix {
  const major = version.split(".")[0] ?? "0";
  const nextMajor = String(Number(major) + 1);
  return {
    cliMin: `${major}.0.0`,
    cliMax: `${nextMajor}.0.0`,
    serverMin: `${major}.0.0`,
    serverMax: `${nextMajor}.0.0`,
    sdkMin: `${major}.0.0`,
    sdkMax: `${nextMajor}.0.0`,
  };
}

export function compatibilitySummary(check: CompatibilityCheck): string {
  if (check.overall) {
    return "All components are compatible.";
  }
  const parts: string[] = [];
  if (!check.cliCompatible) {
    parts.push("CLI version out of range");
  }
  if (!check.serverCompatible) {
    parts.push("Server version out of range");
  }
  if (!check.sdkCompatible) {
    parts.push("SDK version out of range");
  }
  return `Incompatible: ${parts.join(", ")}.`;
}
