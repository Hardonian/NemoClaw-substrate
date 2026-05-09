// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("changelog hygiene", () => {
  it("has a single changelog title/SPDX pair and no duplicate bullet lines", () => {
    const content = fs.readFileSync(path.join(process.cwd(), "CHANGELOG.md"), "utf8");
    expect(content.split(/\r?\n/).filter((line) => line.trim() === "# Changelog").length).toBe(1);
    expect((content.match(/SPDX-FileCopyrightText/g) ?? []).length).toBe(1);
    expect((content.match(/SPDX-License-Identifier/g) ?? []).length).toBe(1);
    const bullets = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith("- ") && line.length > 2);
    const duplicateBullets = bullets.filter((line, index) => bullets.indexOf(line) !== index);
    expect(duplicateBullets).toEqual([]);
  });
});
