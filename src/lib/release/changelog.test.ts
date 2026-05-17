// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import {
  parseConventionalCommit,
  parseCommits,
  groupByType,
  extractBreakingChanges,
  entriesToChangelog,
  generateChangelog,
  changelogToMarkdown,
} from "./changelog";

describe("parseConventionalCommit", () => {
  it("parses a basic feature commit", () => {
    const result = parseConventionalCommit("feat: add release manifest");
    expect(result).not.toBeNull();
    expect(result!.type).toBe("feat");
    expect(result!.subject).toBe("add release manifest");
    expect(result!.breaking).toBe(false);
  });

  it("parses a commit with scope", () => {
    const result = parseConventionalCommit("fix(cli): handle edge case");
    expect(result!.type).toBe("fix");
    expect(result!.scope).toBe("cli");
    expect(result!.subject).toBe("handle edge case");
  });

  it("detects breaking change with exclamation mark", () => {
    const result = parseConventionalCommit("feat!: change API format");
    expect(result!.breaking).toBe(true);
  });

  it("detects breaking change in body", () => {
    const result = parseConventionalCommit("refactor: restructure modules\n\nBREAKING CHANGE: module paths changed");
    expect(result!.breaking).toBe(true);
  });

  it("returns null for non-conventional commit", () => {
    const result = parseConventionalCommit("not a conventional commit");
    expect(result).toBeNull();
  });

  it("extracts body when multiline", () => {
    const result = parseConventionalCommit("docs: update readme\n\nAdded more examples.");
    expect(result!.body).toBe("Added more examples.");
  });

  it("includes commit hash", () => {
    const result = parseConventionalCommit("test: add unit tests", "abc1234");
    expect(result!.hash).toBe("abc1234");
  });
});

describe("parseCommits", () => {
  it("parses multiple commits", () => {
    const commits = parseCommits([
      { message: "feat: add feature", hash: "aaa" },
      { message: "fix: fix bug", hash: "bbb" },
    ]);
    expect(commits).toHaveLength(2);
    expect(commits[0].type).toBe("feat");
    expect(commits[1].type).toBe("fix");
  });

  it("filters out non-conventional commits", () => {
    const commits = parseCommits([
      { message: "feat: add feature", hash: "aaa" },
      { message: "merged from main", hash: "bbb" },
    ]);
    expect(commits).toHaveLength(1);
  });
});

describe("groupByType", () => {
  it("groups entries by type in order", () => {
    const entries = [
      { type: "fix", subject: "fix one", description: "fix one", breaking: false, hash: "a" },
      { type: "feat", subject: "feat one", description: "feat one", breaking: false, hash: "b" },
      { type: "fix", subject: "fix two", description: "fix two", breaking: false, hash: "c" },
    ];
    const sections = groupByType(entries);
    expect(sections).toHaveLength(2);
    expect(sections[0].type).toBe("feat");
    expect(sections[1].type).toBe("fix");
    expect(sections[1].entries).toHaveLength(2);
  });

  it("uses correct section titles", () => {
    const entries = [
      { type: "perf", subject: "improve speed", description: "improve speed", breaking: false, hash: "a" },
    ];
    const sections = groupByType(entries);
    expect(sections[0].title).toBe("Performance Improvements");
  });

  it("excludes empty sections", () => {
    const entries = [
      { type: "feat", subject: "new thing", description: "new thing", breaking: false, hash: "a" },
    ];
    const sections = groupByType(entries);
    expect(sections.every((s) => s.entries.length > 0)).toBe(true);
  });
});

describe("extractBreakingChanges", () => {
  it("returns only breaking entries", () => {
    const entries = [
      { type: "feat", subject: "normal", description: "normal", breaking: false, hash: "a" },
      { type: "feat", subject: "breaking!", description: "breaking!", breaking: true, hash: "b" },
    ];
    const breaking = extractBreakingChanges(entries);
    expect(breaking).toHaveLength(1);
    expect(breaking[0].description).toBe("breaking!");
  });
});

describe("generateChangelog", () => {
  it("generates full changelog from messages", () => {
    const changelog = generateChangelog("0.2.0", "2026-05-10", [
      { message: "feat: add new feature", hash: "abc1234" },
      { message: "fix(cli): resolve crash", hash: "def5678" },
    ]);
    expect(changelog.version).toBe("0.2.0");
    expect(changelog.date).toBe("2026-05-10");
    expect(changelog.sections).toHaveLength(2);
    expect(changelog.breakingChanges).toHaveLength(0);
  });

  it("captures breaking changes", () => {
    const changelog = generateChangelog("1.0.0", "2026-05-10", [
      { message: "feat!: breaking change", hash: "aaa1111" },
    ]);
    expect(changelog.breakingChanges).toHaveLength(1);
  });
});

describe("changelogToMarkdown", () => {
  it("generates markdown with version header", () => {
    const changelog = generateChangelog("0.1.0", "2026-05-10", [
      { message: "feat: new feature", hash: "abcdef1" },
    ]);
    const md = changelogToMarkdown(changelog);
    expect(md).toContain("## 0.1.0 (2026-05-10)");
    expect(md).toContain("- new feature (abcdef1)");
  });

  it("includes breaking changes section", () => {
    const changelog = generateChangelog("1.0.0", "2026-05-10", [
      { message: "feat!: breaking api", hash: "1234567" },
    ]);
    const md = changelogToMarkdown(changelog);
    expect(md).toContain("### BREAKING CHANGES");
    expect(md).toContain("- breaking api (1234567)");
  });

  it("groups entries under section headers", () => {
    const changelog = generateChangelog("0.1.0", "2026-05-10", [
      { message: "feat(cli): add command", hash: "aaaaaaa" },
    ]);
    const md = changelogToMarkdown(changelog);
    expect(md).toContain("### Features");
    expect(md).toContain("cli: add command (aaaaaaa)");
  });

  it("handles changelog with no commits", () => {
    const changelog = entriesToChangelog("0.1.0", "2026-05-10", []);
    const md = changelogToMarkdown(changelog);
    expect(md).toContain("## 0.1.0 (2026-05-10)");
    expect(md).not.toContain("### BREAKING");
  });
});
