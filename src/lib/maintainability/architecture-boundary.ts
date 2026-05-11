// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export interface ModuleBoundary {
  name: string;
  pathPrefix: string;
  packageName?: string;
  allowedDependencies: string[];
}

export interface BoundaryViolation {
  sourceModule: string;
  targetModule: string;
  sourceFile: string;
  targetFile: string;
  line: number;
}

export interface ArchitectureBoundaryReport {
  violations: BoundaryViolation[];
  summary: {
    total: number;
    bySourceModule: Record<string, number>;
  };
}

const DEFAULT_BOUNDARIES: ModuleBoundary[] = [
  {
    name: "core",
    pathPrefix: "src/lib/core",
    packageName: "nemoclaw-core",
    allowedDependencies: [],
  },
  {
    name: "config",
    pathPrefix: "src/lib/config",
    packageName: "nemoclaw-config",
    allowedDependencies: ["core"],
  },
  {
    name: "state",
    pathPrefix: "src/lib/state",
    packageName: "nemoclaw-state",
    allowedDependencies: ["core", "config"],
  },
  {
    name: "security",
    pathPrefix: "src/lib/security",
    packageName: "nemoclaw-security",
    allowedDependencies: ["core", "config"],
  },
  {
    name: "inference",
    pathPrefix: "src/lib/inference",
    packageName: "nemoclaw-inference",
    allowedDependencies: ["core", "config", "security"],
  },
  {
    name: "control-plane",
    pathPrefix: "src/lib/control-plane",
    packageName: "nemoclaw-control-plane",
    allowedDependencies: ["core", "config", "state", "security", "inference"],
  },
  {
    name: "execution",
    pathPrefix: "src/lib/execution",
    packageName: "nemoclaw-execution",
    allowedDependencies: ["core", "config", "state", "control-plane"],
  },
  {
    name: "maintainability",
    pathPrefix: "src/lib/maintainability",
    packageName: "nemoclaw-maintainability",
    allowedDependencies: ["core"],
  },
];

function resolveModule(filePath: string, boundaries: ModuleBoundary[]): string | null {
  for (const boundary of boundaries) {
    if (filePath.includes(boundary.pathPrefix)) {
      return boundary.name;
    }
    if (boundary.packageName && filePath === boundary.packageName) {
      return boundary.name;
    }
  }
  return null;
}

function findBoundary(name: string, boundaries: ModuleBoundary[]): ModuleBoundary | null {
  return boundaries.find((b) => b.name === name) ?? null;
}

export function checkArchitectureBoundaries(
  files: Map<string, string>,
  boundaries: ModuleBoundary[] = DEFAULT_BOUNDARIES,
): ArchitectureBoundaryReport {
  const violations: BoundaryViolation[] = [];

  for (const [sourceFile, content] of files) {
    const sourceModule = resolveModule(sourceFile, boundaries);
    if (!sourceModule) continue;

    const sourceBoundary = findBoundary(sourceModule, boundaries);
    if (!sourceBoundary) continue;

    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.includes("import")) continue;

      const importPathMatch = line.match(/from\s+["']([^"']+)["']/);
      if (!importPathMatch) continue;

      const importPath = importPathMatch[1];
      if (importPath.startsWith(".") || importPath.startsWith("..")) continue;
      if (importPath.startsWith("node:") || importPath.startsWith("@")) continue;

      const targetModule = resolveModule(importPath, boundaries);
      if (!targetModule || targetModule === sourceModule) continue;

      if (!sourceBoundary.allowedDependencies.includes(targetModule)) {
        violations.push({
          sourceModule,
          targetModule,
          sourceFile,
          targetFile: importPath,
          line: i + 1,
        });
      }
    }
  }

  const bySourceModule: Record<string, number> = {};
  for (const v of violations) {
    bySourceModule[v.sourceModule] = (bySourceModule[v.sourceModule] ?? 0) + 1;
  }

  return {
    violations,
    summary: {
      total: violations.length,
      bySourceModule,
    },
  };
}

export function checkArchitectureBoundariesStrict(
  files: Map<string, string>,
  boundaries?: ModuleBoundary[],
): boolean {
  const report = checkArchitectureBoundaries(files, boundaries);
  return report.violations.length === 0;
}

export function getModuleBoundaries(): ModuleBoundary[] {
  return DEFAULT_BOUNDARIES;
}
