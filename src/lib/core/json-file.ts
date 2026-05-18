// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
import fs from "node:fs";

/**
 * Synchronously reads a file and parses it as JSON.
 * Returns the parsed JSON typed as `T`.
 * @param filePath The path to the file.
 */
export function readJsonFileSync<T = unknown>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}
