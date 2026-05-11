// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Automated changelog generation from conventional commits.
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

const COMMIT_PATTERN =
  /^(?<type>[a-z]+)(?:\((?<scope>[^)]+)\))?(?<breaking>!)?: (?<subject>.+)$/;

const TYPE_SECTION_MAP: Record<string, string> = {
  feat: "Features",
  fix: "Bug Fixes",
  perf: "Performance Improvements",
  refactor: "Code Refactoring",
  docs: "Documentation",
  test: "Tests",
  chore: "Chores",
  ci: "CI",
  build: "Build",
  style: "Style",
};

const SECTION_ORDER = [
  "feat",
  "fix",
  "perf",
  "refactor",
  "docs",
  "test",
  "ci",
  "build",
  "style",
  "chore",
];

export function parseConventionalCommit(
  message: string,
  hash: string = "",
): ConventionalCommit | null {
  const firstLine = message.trim().split("\n")[0] ?? "";
  const match = firstLine.match(COMMIT_PATTERN);
  if (!match) {
    return null;
  }

  const type = match.groups?.type ?? "";
  const scope = match.groups?.scope;
  const breaking = match.groups?.breaking === "!";
  const subject = match.groups?.subject ?? "";
  const body = message.includes("\n")
    ? message.substring(message.indexOf("\n") + 1).trim()
    : undefined;

  const breakingInBody = /\bBREAKING CHANGE\b/.test(body ?? "");

  return {
    type,
    scope,
    subject,
    body: breakingInBody ? body : undefined,
    breaking: breaking || breakingInBody,
    hash,
  };
}

export function parseCommits(
  messages: Array<{ message: string; hash: string }>,
): ConventionalCommit[] {
  return messages
    .map(({ message, hash }) => parseConventionalCommit(message, hash))
    .filter((c): c is ConventionalCommit => c !== null);
}

export function groupByType(
  entries: ChangelogEntry[],
): ChangelogSection[] {
  const grouped: Map<string, ChangelogEntry[]> = new Map();

  for (const entry of entries) {
    const existing = grouped.get(entry.type) ?? [];
    existing.push(entry);
    grouped.set(entry.type, existing);
  }

  return SECTION_ORDER.map((type) => ({
    type,
    title: TYPE_SECTION_MAP[type] ?? type,
    entries: grouped.get(type) ?? [],
  })).filter((section) => section.entries.length > 0);
}

export function extractBreakingChanges(
  entries: ChangelogEntry[],
): ChangelogEntry[] {
  return entries.filter((entry) => entry.breaking);
}

export function entriesToChangelog(
  version: string,
  date: string,
  entries: ChangelogEntry[],
): Changelog {
  const sections = groupByType(entries);
  const breakingChanges = extractBreakingChanges(entries);

  return {
    version,
    date,
    sections,
    breakingChanges,
  };
}

export function generateChangelog(
  version: string,
  date: string,
  messages: Array<{ message: string; hash: string }>,
): Changelog {
  const commits = parseCommits(messages);
  const entries: ChangelogEntry[] = commits.map((commit) => ({
    type: commit.type,
    scope: commit.scope,
    description: commit.scope
      ? `${commit.scope}: ${commit.subject}`
      : commit.subject,
    breaking: commit.breaking,
    hash: commit.hash,
  }));

  return entriesToChangelog(version, date, entries);
}

export function changelogToMarkdown(changelog: Changelog): string {
  const lines: string[] = [];

  lines.push(`## ${changelog.version} (${changelog.date})`);
  lines.push("");

  if (changelog.breakingChanges.length > 0) {
    lines.push("### BREAKING CHANGES");
    lines.push("");
    for (const entry of changelog.breakingChanges) {
      const hashRef = entry.hash ? ` (${entry.hash.substring(0, 7)})` : "";
      const prefix = entry.scope ? `${entry.scope}: ` : "";
      lines.push(`- ${prefix}${entry.subject || entry.description}${hashRef}`);
    }
    lines.push("");
  }

  for (const section of changelog.sections) {
    lines.push(`### ${section.title}`);
    lines.push("");
    for (const entry of section.entries) {
      const hashRef = entry.hash ? ` (${entry.hash.substring(0, 7)})` : "";
      lines.push(`- ${entry.description}${hashRef}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
