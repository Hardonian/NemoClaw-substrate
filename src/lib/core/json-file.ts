// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import fs from "node:fs";

/**
 * Reads a JSON file synchronously and parses it.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function readJsonFileSync<T = any>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}
