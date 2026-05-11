// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Release manifest types and factory functions.
 *
 * Pure functions — no I/O. Produces structured manifest objects
 * describing a release artifact set with SHA-256 hashes and provenance.
 */

import { createHash } from "node:crypto";

export interface ArtifactProvenance {
  source: string;
  buildTool: string;
  buildCommand: string;
}

export interface ReleaseArtifact {
  name: string;
  hash: string;
  provenance: ArtifactProvenance;
}

export interface ReleaseManifest {
  version: string;
  commit: string;
  buildId: string;
  timestamp: string;
  artifacts: ReleaseArtifact[];
  dependencies: Record<string, string>;
}

export function computeSHA256(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

export function createArtifact(
  name: string,
  content: string | Buffer,
  provenance: ArtifactProvenance,
): ReleaseArtifact {
  return {
    name,
    hash: computeSHA256(content),
    provenance,
  };
}

export function createManifest(options: {
  version: string;
  commit: string;
  buildId: string;
  timestamp?: string;
  artifacts?: ReleaseArtifact[];
  dependencies?: Record<string, string>;
}): ReleaseManifest {
  return {
    version: options.version,
    commit: options.commit,
    buildId: options.buildId,
    timestamp: options.timestamp ?? new Date().toISOString(),
    artifacts: options.artifacts ?? [],
    dependencies: options.dependencies ?? {},
  };
}

export function manifestToJSON(manifest: ReleaseManifest, indent = 2): string {
  return JSON.stringify(manifest, null, indent);
}

export function manifestFromJSON(json: string): ReleaseManifest {
  const parsed = JSON.parse(json) as ReleaseManifest;
  if (!parsed.version || !parsed.commit || !parsed.buildId || !parsed.timestamp) {
    throw new Error("Invalid release manifest: missing required fields");
  }
  return parsed;
}
