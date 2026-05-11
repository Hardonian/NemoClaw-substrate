// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Automated changelog generation from conventional commit messages.
 *
 * Pure functions — no I/O. Parses conventional commit messages into
 * structured changelog entries grouped by type.
 */

export interface ConventionalCommit {
  type: string;
  scope?: string;
  subject: string;
  body?: string;
  breaking: boolean;
  hash: string;
}

export interface ChangelogEntry {
  type: string;
  scope?: string;
  description: string;
  breaking: boolean;
  hash: string;
}

export interface ChangelogSection {
  type: string;
  title: string;
  entries: ChangelogEntry[];
}

export interface Changelog {
  version: string;
  date: string;
  sections: ChangelogSection[];
  breakingChanges: ChangelogEntry[];
}

const TYPE_TITLES: Record<string, string> = {
  feat: "Features",
  fix: "Bug Fixes",
  perf: "Performance Improvements",
  refactor: "Code Refactoring",
  docs: "Documentation",
  style: "Styles",
  test: "Tests",
  ci: "Continuous Integration",
  chore: "Miscellaneous Chores",
  build: "Build System",
  revert: "Reverts",
  merge: "Merges",
};

const COMMIT_PATTERN = /^((\w+)(?:\(([^)]+)\))?!?):\s*(.+)$/;

export function parseConventionalCommit(
  message: string,
  hash: string = "",
): ConventionalCommit {
  const normalized = message.trim();
  const match = normalized.match(COMMIT_PATTERN);

  if (!match) {
    return {
      type: "chore",
      subject: normalized,
      breaking: false,
      hash,
    };
  }

  const fullHeader = match[1];
  const type = match[2].toLowerCase();
  const scope = match[3];
  const subject = match[4];
  const breaking = fullHeader.endsWith("!") || normalized.includes("BREAKING CHANGE");

  return { type, scope, subject, breaking, hash };
}

export function commitsToEntries(commits: ConventionalCommit[]): ChangelogEntry[] {
  return commits.map((commit) => ({
    type: commit.type,
    scope: commit.scope,
    description: commit.scope
      ? `${commit.scope}: ${commit.subject}`
      : commit.subject,
    breaking: commit.breaking,
    hash: commit.hash,
  }));
}

export function groupEntriesByType(entries: ChangelogEntry[]): ChangelogSection[] {
  const grouped = new Map<string, ChangelogEntry[]>();

  for (const entry of entries) {
    const type = entry.type;
    if (!grouped.has(type)) {
      grouped.set(type, []);
    }
    grouped.get(type)!.push(entry);
  }

  const sections: ChangelogSection[] = [];
  for (const [type, typeEntries] of grouped) {
    const title = TYPE_TITLES[type] ?? type.charAt(0).toUpperCase() + type.slice(1);
    sections.push({ type, title, entries: typeEntries });
  }

  return sections.sort((a, b) => {
    const order = ["feat", "fix", "perf", "refactor", "docs", "test", "ci", "build", "chore", "revert", "merge"];
    const aIndex = order.indexOf(a.type);
    const bIndex = order.indexOf(b.type);
    if (aIndex === -1 && bIndex === -1) return a.type.localeCompare(b.type);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
}

export function extractBreakingChanges(entries: ChangelogEntry[]): ChangelogEntry[] {
  return entries.filter((entry) => entry.breaking);
}

export function generateChangelog(
  version: string,
  date: string,
  commitMessages: string[],
  hashes: string[] = [],
): Changelog {
  const commits = commitMessages.map((msg, i) =>
    parseConventionalCommit(msg, hashes[i] ?? ""),
  );
  const entries = commitsToEntries(commits);
  const sections = groupEntriesByType(entries);
  const breakingChanges = extractBreakingChanges(entries);

  return { version, date, sections, breakingChanges };
}

export function changelogToMarkdown(changelog: Changelog): string {
  const lines: string[] = [];

  lines.push(`## ${changelog.version} (${changelog.date})`);
  lines.push("");

  if (changelog.breakingChanges.length > 0) {
    lines.push("### ⚠ BREAKING CHANGES");
    lines.push("");
    for (const entry of changelog.breakingChanges) {
      const ref = entry.hash ? ` (${entry.hash.slice(0, 7)})` : "";
      lines.push(`- ${entry.description}${ref}`);
    }
    lines.push("");
  }

  for (const section of changelog.sections) {
    lines.push(`### ${section.title}`);
    lines.push("");
    for (const entry of section.entries) {
      if (entry.breaking) continue;
      const ref = entry.hash ? ` (${entry.hash.slice(0, 7)})` : "";
      lines.push(`- ${entry.description}${ref}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
