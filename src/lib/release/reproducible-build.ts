// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Reproducible build metadata export.
 *
 * Pure functions — no I/O. Captures and exports build environment metadata
 * for reproducible build verification.
 */

export interface ReproducibleBuildInfo {
  version: string;
  commit: string;
  nodeVersion: string;
  platform: string;
  arch: string;
  toolchain: string;
  deps: Record<string, string>;
}

export function createBuildInfo(options: {
  version: string;
  commit: string;
  nodeVersion?: string;
  platform?: string;
  arch?: string;
  toolchain?: string;
  deps?: Record<string, string>;
}): ReproducibleBuildInfo {
  return {
    version: options.version,
    commit: options.commit,
    nodeVersion: options.nodeVersion ?? process.version.replace(/^v/, ""),
    platform: options.platform ?? process.platform,
    arch: options.arch ?? process.arch,
    toolchain: options.toolchain ?? "tsc",
    deps: options.deps ?? {},
  };
}

export function buildInfoToJSON(info: ReproducibleBuildInfo, indent = 2): string {
  return JSON.stringify(info, null, indent);
}

export function buildInfoFromJSON(json: string): ReproducibleBuildInfo {
  const parsed = JSON.parse(json) as ReproducibleBuildInfo;
  if (!parsed.version || !parsed.commit || !parsed.nodeVersion) {
    throw new Error("Invalid build info: missing required fields");
  }
  return parsed;
}

export function buildInfoMatch(
  a: ReproducibleBuildInfo,
  b: ReproducibleBuildInfo,
): boolean {
  return (
    a.version === b.version &&
    a.commit === b.commit &&
    a.nodeVersion === b.nodeVersion &&
    a.platform === b.platform &&
    a.arch === b.arch &&
    a.toolchain === b.toolchain &&
    Object.keys(a.deps).length === Object.keys(b.deps).length &&
    Object.keys(a.deps).every((key) => a.deps[key] === b.deps[key])
  );
}
