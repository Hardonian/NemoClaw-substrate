import { readJsonFileSync } from "../core/json-file";
// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";
import { readJsonFileSync } from "../core/json-file";
import fs from "node:fs";
import path from "node:path";

export interface LocalProofReadResult {
  runDir: string;
  manifest: Record<string, unknown>;
  proofpack: Record<string, unknown>;
  replayEnvelope: Record<string, unknown>;
  diagnostics: Record<string, unknown>;
  queue: Record<string, unknown>;
  lease: Record<string, unknown>;
  plan: Record<string, unknown>;
  intent: Record<string, unknown>;
  node: Record<string, unknown>;
  probe: Record<string, unknown>;
  receipts: Record<string, unknown>[];
  events: Record<string, unknown>[];
}

export const REQUIRED_LOCAL_PROOF_FILES = [
  "manifest.json",
  "proofpack.json",
  "replay-envelope.json",
  "receipts.ndjson",
  "events.ndjson",
  "diagnostics.json",
  "queue.json",
  "lease.json",
  "plan.json",
  "intent.json",
  "node.json",
  "probe.json",
] as const;

export function localProofRunDir(rootDir: string): string {
  return path.join(rootDir, ".artifacts", "local-governed-proof");
}

export function cleanLocalGovernedProofArtifacts(rootDir: string): string {
  const runDir = localProofRunDir(rootDir);
  fs.rmSync(runDir, { recursive: true, force: true });
  return runDir;
}

function readJson(runDir: string, name: string): Record<string, unknown> {
  return readJsonFileSync(path.join(runDir, name)) as Record<string, unknown>;
}

function readNdjson(runDir: string, name: string): Record<string, unknown>[] {
  const raw = fs.readFileSync(path.join(runDir, name), "utf8").trim();
  if (!raw) return [];
  return raw.split("\n").filter(Boolean).map((line) => JSON.parse(line) as Record<string, unknown>);
}

export function readLocalGovernedProofArtifacts(rootDir: string): LocalProofReadResult {
  const runDir = localProofRunDir(rootDir);
  for (const file of REQUIRED_LOCAL_PROOF_FILES) {
    if (!fs.existsSync(path.join(runDir, file))) throw new Error(`missing required artifact: ${file}`);
  }
  return {
    runDir,
    manifest: readJson(runDir, "manifest.json"),
    proofpack: readJson(runDir, "proofpack.json"),
    replayEnvelope: readJson(runDir, "replay-envelope.json"),
    diagnostics: readJson(runDir, "diagnostics.json"),
    queue: readJson(runDir, "queue.json"),
    lease: readJson(runDir, "lease.json"),
    plan: readJson(runDir, "plan.json"),
    intent: readJson(runDir, "intent.json"),
    node: readJson(runDir, "node.json"),
    probe: readJson(runDir, "probe.json"),
    receipts: readNdjson(runDir, "receipts.ndjson"),
    events: readNdjson(runDir, "events.ndjson"),
  };
}

export function stableSha256(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
