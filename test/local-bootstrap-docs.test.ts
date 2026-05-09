// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("local bootstrap docs", () => {
  it("documents ignore-scripts as local verification fallback", () => {
    const content = fs.readFileSync("docs/contributing/local-bootstrap.md", "utf8");
    expect(content).toContain("npm install --ignore-scripts");
    expect(content).toContain("local verification only");
  });
});
