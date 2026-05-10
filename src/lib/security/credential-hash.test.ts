// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { hashCredential } from "./credential-hash.js";

describe("hashCredential", () => {
  it("should return null for null", () => {
    expect(hashCredential(null)).toBeNull();
  });

  it("should return null for undefined", () => {
    expect(hashCredential(undefined)).toBeNull();
  });

  it("should return null for empty string", () => {
    expect(hashCredential("")).toBeNull();
  });

  it("should hash valid strings using sha256 hex", () => {
    const value = "my-secret-credential";
    const expectedHash = crypto.createHash("sha256").update(value).digest("hex");
    expect(hashCredential(value)).toBe(expectedHash);
  });
});
