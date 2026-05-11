// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export interface ProofpackMetadata {
  version: string;
  createdAt: string;
  sessionId: string;
  agent: string;
  model: string;
}

export interface ProofpackSignature {
  algorithm: string;
  publicKey: string;
  value: string;
  verified: boolean;
}

export interface ProofpackContentSummary {
  totalSteps: number;
  totalTokens: number;
  durationMs: number;
  toolsUsed: string[];
}

export interface ProofpackInfo {
  metadata: ProofpackMetadata;
  signatures: ProofpackSignature[];
  summary: ProofpackContentSummary;
}

export function parseProofpack(raw: Record<string, unknown>): ProofpackInfo {
  return {
    metadata: parseMetadata(raw.metadata ?? {}),
    signatures: parseSignatures(raw.signatures ?? []),
    summary: parseSummary(raw.summary ?? {}),
  };
}

function parseMetadata(raw: unknown): ProofpackMetadata {
  const m = raw as Record<string, unknown>;
  return {
    version: String(m.version ?? "unknown"),
    createdAt: String(m.createdAt ?? ""),
    sessionId: String(m.sessionId ?? ""),
    agent: String(m.agent ?? ""),
    model: String(m.model ?? ""),
  };
}

function parseSignatures(raw: unknown): ProofpackSignature[] {
  const arr = Array.isArray(raw) ? raw : [];
  return arr.map((s) => {
    const sig = s as Record<string, unknown>;
    return {
      algorithm: String(sig.algorithm ?? ""),
      publicKey: String(sig.publicKey ?? ""),
      value: String(sig.value ?? ""),
      verified: Boolean(sig.verified),
    };
  });
}

function parseSummary(raw: unknown): ProofpackContentSummary {
  const s = raw as Record<string, unknown>;
  return {
    totalSteps: Number(s.totalSteps ?? 0),
    totalTokens: Number(s.totalTokens ?? 0),
    durationMs: Number(s.durationMs ?? 0),
    toolsUsed: Array.isArray(s.toolsUsed)
      ? s.toolsUsed.map(String)
      : [],
  };
}

export function proofpackAllVerified(info: ProofpackInfo): boolean {
  return info.signatures.length > 0 && info.signatures.every((s) => s.verified);
}

export function diffProofpack(
  a: ProofpackInfo,
  b: ProofpackInfo,
): { field: string; oldValue: string | number; newValue: string | number }[] {
  const diffs: { field: string; oldValue: string | number; newValue: string | number }[] = [];

  const metaKeys: (keyof ProofpackMetadata)[] = ["version", "createdAt", "sessionId", "agent", "model"];
  for (const key of metaKeys) {
    if (a.metadata[key] !== b.metadata[key]) {
      diffs.push({ field: `metadata.${key}`, oldValue: a.metadata[key], newValue: b.metadata[key] });
    }
  }

  if (a.summary.totalSteps !== b.summary.totalSteps) {
    diffs.push({ field: "summary.totalSteps", oldValue: a.summary.totalSteps, newValue: b.summary.totalSteps });
  }
  if (a.summary.totalTokens !== b.summary.totalTokens) {
    diffs.push({ field: "summary.totalTokens", oldValue: a.summary.totalTokens, newValue: b.summary.totalTokens });
  }
  if (a.summary.durationMs !== b.summary.durationMs) {
    diffs.push({ field: "summary.durationMs", oldValue: a.summary.durationMs, newValue: b.summary.durationMs });
  }

  const toolsA = new Set(a.summary.toolsUsed);
  const toolsB = new Set(b.summary.toolsUsed);
  for (const t of a.summary.toolsUsed) {
    if (!toolsB.has(t)) diffs.push({ field: "summary.toolsUsed", oldValue: t, newValue: "(removed)" });
  }
  for (const t of b.summary.toolsUsed) {
    if (!toolsA.has(t)) diffs.push({ field: "summary.toolsUsed", oldValue: "(absent)", newValue: t });
  }

  if (proofpackAllVerified(a) !== proofpackAllVerified(b)) {
    diffs.push({
      field: "signatures.allVerified",
      oldValue: proofpackAllVerified(a),
      newValue: proofpackAllVerified(b),
    });
  }

  return diffs;
}

export function formatProofpack(info: ProofpackInfo): string {
  const lines: string[] = [];
  lines.push(`Proofpack ${info.metadata.version}`);
  lines.push(`  session:   ${info.metadata.sessionId}`);
  lines.push(`  agent:     ${info.metadata.agent}`);
  lines.push(`  model:     ${info.metadata.model}`);
  lines.push(`  created:   ${info.metadata.createdAt}`);
  lines.push("");
  lines.push(`  steps:     ${info.summary.totalSteps}`);
  lines.push(`  tokens:    ${info.summary.totalTokens}`);
  lines.push(`  duration:  ${info.summary.durationMs}ms`);
  lines.push(`  tools:     ${info.summary.toolsUsed.join(", ") || "none"}`);
  lines.push("");
  lines.push(`  signatures: ${info.signatures.length}`);
  for (const sig of info.signatures) {
    lines.push(`    ${sig.algorithm} ${sig.verified ? "verified" : "UNVERIFIED"}`);
  }
  return lines.join("\n");
}
