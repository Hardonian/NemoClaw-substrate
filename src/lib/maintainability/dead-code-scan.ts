// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export interface DeadCodeEntry {
  file: string;
  identifier: string;
  type: "unused-export" | "unused-import" | "unreachable-code";
  line: number;
}

export interface DeadCodeReport {
  entries: DeadCodeEntry[];
  summary: {
    total: number;
    unusedExports: number;
    unusedImports: number;
    unreachableCode: number;
  };
}

export function scanDeadCode(
  files: Map<string, string>,
  options: { minCoverageThreshold?: number } = {},
): DeadCodeReport {
  const { minCoverageThreshold = 80 } = options;
  const entries: DeadCodeEntry[] = [];

  const exportedNames = new Map<string, Set<string>>();
  const importedNames = new Map<string, Set<string>>();

  for (const [file, content] of files) {
    const fileExports = new Set<string>();
    const fileImports = new Set<string>();
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const exportFuncMatch = line.match(/export\s+(?:async\s+)?function\s+(\w+)/);
      if (exportFuncMatch) {
        fileExports.add(exportFuncMatch[1]);
      }

      const exportConstMatch = line.match(/export\s+const\s+(\w+)/);
      if (exportConstMatch) {
        fileExports.add(exportConstMatch[1]);
      }

      const exportInterfaceMatch = line.match(/export\s+interface\s+(\w+)/);
      if (exportInterfaceMatch) {
        fileExports.add(exportInterfaceMatch[1]);
      }

      const exportTypeMatch = line.match(/export\s+type\s+(\w+)/);
      if (exportTypeMatch) {
        fileExports.add(exportTypeMatch[1]);
      }

      const importMatch = line.matchAll(/import\s+.*?\b(\w+)\b.*?from\s/g);
      for (const match of importMatch) {
        if (match[1] && match[1] !== "from" && match[1] !== "import") {
          fileImports.add(match[1]);
        }
      }

      const namedImportMatches = line.matchAll(/\{([^}]+)\}/g);
      for (const match of namedImportMatches) {
        if (line.includes("import") && line.includes("from")) {
          const names = match[1].split(",").map((n) => n.trim().replace(/\s+as\s+\w+/, ""));
          for (const name of names) {
            if (name) fileImports.add(name);
          }
        }
      }
    }

    exportedNames.set(file, fileExports);
    importedNames.set(file, fileImports);
  }

  const allCallers = new Set<string>();
  for (const [_file, content] of files) {
    const lines = content.split("\n");
    for (const line of lines) {
      const callMatches = line.matchAll(/\b([a-zA-Z_]\w*)\s*\(/g);
      for (const match of callMatches) {
        allCallers.add(match[1]);
      }
      const refMatches = line.matchAll(/\b([a-zA-Z_]\w*)\b/g);
      for (const match of refMatches) {
        allCallers.add(match[1]);
      }
    }
  }

  for (const [file, exports] of exportedNames) {
    for (const name of exports) {
      if (name.startsWith("_")) continue;
      let foundOutside = false;
      for (const [otherFile, content] of files) {
        if (otherFile === file) continue;
        if (content.includes(name)) {
          foundOutside = true;
          break;
        }
      }
      if (!foundOutside) {
        const lineNum = findExportLine(file, contentForFile(files, file), name);
        entries.push({
          file,
          identifier: name,
          type: "unused-export",
          line: lineNum,
        });
      }
    }
  }

  for (const [file, imports] of importedNames) {
    const content = contentForFile(files, file);
    for (const name of imports) {
      if (name.startsWith("_")) continue;
      const usageCount = (content.match(new RegExp(`\\b${name}\\b`, "g")) || []).length;
      if (usageCount <= 1) {
        const lineNum = findImportLine(content, name);
        entries.push({
          file,
          identifier: name,
          type: "unused-import",
          line: lineNum,
        });
      }
    }
  }

  const unusedExports = entries.filter((e) => e.type === "unused-export").length;
  const unusedImports = entries.filter((e) => e.type === "unused-import").length;
  const unreachableCode = entries.filter((e) => e.type === "unreachable-code").length;

  return {
    entries,
    summary: {
      total: entries.length,
      unusedExports,
      unusedImports,
      unreachableCode,
    },
  };
}

function contentForFile(files: Map<string, string>, file: string): string {
  return files.get(file) ?? "";
}

function findExportLine(file: string, content: string, name: string): number {
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`export`) && lines[i].includes(name)) {
      return i + 1;
    }
  }
  return 0;
}

function findImportLine(content: string, name: string): number {
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("import") && lines[i].includes(name)) {
      return i + 1;
    }
  }
  return 0;
}

export function checkDeadCodeStrict(files: Map<string, string>): boolean {
  const report = scanDeadCode(files);
  return report.entries.length === 0;
}
