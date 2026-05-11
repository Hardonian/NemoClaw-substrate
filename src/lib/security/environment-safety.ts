// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Environment safety checks on startup.
 *
 * Validates file permissions, umask, network exposure, and other runtime
 * environment properties. Returns a comprehensive safety report.
 */

import { accessSync, constants, statSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { join } from "node:path";

export interface FilePermissionCheck {
  path: string;
  exists: boolean;
  permissions: string | null;
  isTooPermissive: boolean;
  issue: string | null;
}

export interface NetworkExposureCheck {
  interface: string;
  address: string;
  family: string;
  isPublic: boolean;
  isLoopback: boolean;
}

export interface EnvironmentSafetyReport {
  passed: boolean;
  fileChecks: FilePermissionCheck[];
  umaskOk: boolean;
  umaskValue: number;
  networkExposure: NetworkExposureCheck[];
  issues: string[];
}

export interface EnvironmentSafetyOptions {
  checkPaths?: string[];
  maxAllowedPermission?: number;
  checkUmask?: boolean;
  expectedUmask?: number;
  checkNetwork?: boolean;
}

const DEFAULT_CHECK_PATHS = [
  process.env.HOME ?? process.env.USERPROFILE ?? "",
  join(process.cwd(), ".env"),
  join(process.cwd(), "config.json"),
];

const DEFAULT_MAX_PERMISSION = 0o600;
const DEFAULT_EXPECTED_UMASK = 0o077;

function getOctalPermissionString(mode: number): string {
  return `0o${(mode & 0o777).toString(8).padStart(3, "0")}`;
}

function isPermissionTooPermissive(mode: number, maxAllowed: number): boolean {
  const actualMode = mode & 0o777;
  return (actualMode & ~maxAllowed) !== 0;
}

function checkFilePermissions(
  paths: string[],
  maxAllowed: number,
): FilePermissionCheck[] {
  const checks: FilePermissionCheck[] = [];

  for (const filePath of paths) {
    if (!filePath) continue;

    try {
      const stats = statSync(filePath);
      const permStr = getOctalPermissionString(stats.mode);
      const tooPermissive = isPermissionTooPermissive(stats.mode, maxAllowed);
      const issue = tooPermissive
        ? `File ${filePath} has permissions ${permStr}, exceeds max ${getOctalPermissionString(maxAllowed)}`
        : null;

      checks.push({
        path: filePath,
        exists: true,
        permissions: permStr,
        isTooPermissive: tooPermissive,
        issue,
      });
    } catch {
      checks.push({
        path: filePath,
        exists: false,
        permissions: null,
        isTooPermissive: false,
        issue: null,
      });
    }
  }

  return checks;
}

function checkUmask(expected: number): { ok: boolean; value: number } {
  try {
    const value = process.umask();
    return { ok: value === expected, value };
  } catch {
    return { ok: false, value: 0 };
  }
}

function checkNetworkExposure(): NetworkExposureCheck[] {
  const checks: NetworkExposureCheck[] = [];
  const nets = networkInterfaces();

  for (const [iface, addresses] of Object.entries(nets)) {
    if (!addresses) continue;
    for (const addr of addresses) {
      checks.push({
        interface: iface,
        address: addr.address,
        family: addr.family,
        isPublic: isPublicAddress(addr.address, addr.family),
        isLoopback: addr.internal,
      });
    }
  }

  return checks;
}

function isPublicAddress(address: string, family: string): boolean {
  if (address === "127.0.0.1" || address === "::1") return false;
  if (family === "IPv4") {
    const parts = address.split(".").map(Number);
    if (parts[0] === 10) return false;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return false;
    if (parts[0] === 192 && parts[1] === 168) return false;
    if (parts[0] === 169 && parts[1] === 254) return false;
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return false;
    return true;
  }
  if (family === "IPv6") {
    if (address.startsWith("fe80:")) return false;
    if (address.startsWith("fc") || address.startsWith("fd")) return false;
    if (address.startsWith("::1")) return false;
    return true;
  }
  return false;
}

/**
 * Run a full environment safety check and return a report.
 */
export function checkEnvironmentSafety(
  options: EnvironmentSafetyOptions = {},
): EnvironmentSafetyReport {
  const paths = options.checkPaths ?? DEFAULT_CHECK_PATHS;
  const maxPerm = options.maxAllowedPermission ?? DEFAULT_MAX_PERMISSION;
  const checkUmaskFlag = options.checkUmask ?? true;
  const expectedUmask = options.expectedUmask ?? DEFAULT_EXPECTED_UMASK;
  const checkNetworkFlag = options.checkNetwork ?? true;

  const fileChecks = checkFilePermissions(paths, maxPerm);
  const umaskResult = checkUmaskFlag ? checkUmask(expectedUmask) : { ok: true, value: 0 };
  const networkExposure = checkNetworkFlag ? checkNetworkExposure() : [];

  const issues: string[] = [];

  for (const check of fileChecks) {
    if (check.issue) issues.push(check.issue);
  }

  if (checkUmaskFlag && !umaskResult.ok) {
    issues.push(
      `Umask is 0o${umaskResult.value.toString(8).padStart(3, "0")}, expected 0o${expectedUmask.toString(8).padStart(3, "0")}`,
    );
  }

  const publicInterfaces = networkExposure.filter((n) => n.isPublic && !n.isLoopback);
  for (const net of publicInterfaces) {
    issues.push(
      `Public network interface "${net.interface}" exposes address ${net.address}`,
    );
  }

  return {
    passed: issues.length === 0,
    fileChecks,
    umaskOk: umaskResult.ok,
    umaskValue: umaskResult.value,
    networkExposure,
    issues,
  };
}

/**
 * Quick safety check: returns true if environment passes all checks.
 */
export function isEnvironmentSafe(options?: EnvironmentSafetyOptions): boolean {
  return checkEnvironmentSafety(options).passed;
}

/**
 * Get a human-readable summary of environment safety issues.
 */
export function environmentSafetySummary(report: EnvironmentSafetyReport): string {
  if (report.passed) {
    return "Environment safety check passed. No issues found.";
  }
  const lines = [`Found ${report.issues.length} issue(s):`, ...report.issues.map((i) => `  - ${i}`)];
  return lines.join("\n");
}
