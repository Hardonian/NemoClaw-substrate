// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { execFileSync, spawn, spawnSync, type ExecFileSyncOptionsWithStringEncoding } from "node:child_process";

export type DockerExecFileSyncOptions = Omit<ExecFileSyncOptionsWithStringEncoding, "encoding">;
export type DockerSpawnSyncOptions = Parameters<typeof spawnSync>[2];
export type DockerSpawnSyncResult = ReturnType<typeof spawnSync>;

export function dockerExecFileSync(
  args: readonly string[],
  opts: DockerExecFileSyncOptions = {},
): string {
  return String(
    execFileSync("docker", [...args], {
      encoding: "utf-8",
      shell: process.platform === "win32",
      ...opts,
    }),
  );
}

export function dockerSpawnSync(
  args: readonly string[],
  opts: DockerSpawnSyncOptions = {},
): DockerSpawnSyncResult {
  return spawnSync("docker", [...args], {
    shell: process.platform === "win32",
    ...opts,
  });
}

export function dockerSpawn(
  args: readonly string[],
  opts: Parameters<typeof spawn>[2] = {},
): ReturnType<typeof spawn> {
  return spawn("docker", [...args], {
    shell: process.platform === "win32",
    ...opts,
  });
}
