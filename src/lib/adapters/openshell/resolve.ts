// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { execSync } from "node:child_process";
import { accessSync, constants } from "node:fs";
import { isAbsolute, join, extname } from "node:path";

export interface ResolveOpenshellOptions {
  /** Mock result for `command -v` (undefined = run real command). */
  commandVResult?: string | null;
  /** Override executable check (default: fs.accessSync X_OK). */
  checkExecutable?: (path: string) => boolean;
  /** HOME directory override. */
  home?: string;
}

/**
 * Resolve the openshell binary path.
 *
 * Checks `command -v` first (must return an absolute path to prevent alias
 * injection), then falls back to common installation directories.
 */
export function resolveOpenshell(opts: ResolveOpenshellOptions = {}): string | null {
  const home = opts.home ?? process.env.HOME ?? process.env.USERPROFILE;
  const checkExecutable =
    opts.checkExecutable ??
    ((p: string): boolean => {
      try {
        accessSync(p, constants.X_OK);
        return true;
      } catch {
        return false;
      }
    });

  const override = process.env.NEMOCLAW_OPENSHELL_BIN;
  if (override && isAbsolute(override) && checkExecutable(override)) {
    return override;
  }

  // Step 1: system path discovery
  if (opts.commandVResult === undefined) {
    try {
      const isWin = process.platform === "win32";
      const cmd = isWin ? "where openshell" : "command -v openshell";
      const lines = execSync(cmd, { encoding: "utf-8" }).split(/\r?\n/).filter(l => l.trim());
      let found = "";
      if (isWin) {
        const pathext = (process.env.PATHEXT || ".EXE;.CMD;.BAT;.COM").toUpperCase().split(";");
        found = lines.find(l => pathext.includes(extname(l).toUpperCase())) || lines[0];
      } else {
        found = lines[0];
      }
      found = found.trim();
      if (found && isAbsolute(found)) return found;
    } catch {
      /* ignored */
    }
  } else if (opts.commandVResult && isAbsolute(opts.commandVResult)) {
    return opts.commandVResult;
  }

  // Step 2: fallback candidates
  const isWin = process.platform === "win32";
  const candidates: string[] = [];
  if (home) {
    const base = join(home, ".local", "bin", "openshell");
    if (isWin) {
      candidates.push(`${base}.exe`, `${base}.cmd`, `${base}.bat`, base);
    } else {
      candidates.push(base);
    }
  }

  if (!isWin) {
    candidates.push("/usr/local/bin/openshell", "/usr/bin/openshell");
  }

  for (const p of candidates) {
    if (checkExecutable(p)) return p;
  }

  return null;
}
