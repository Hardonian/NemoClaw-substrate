// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
import { readLocalGovernedProofArtifacts, stableSha256 } from "./local-governed-proof-artifacts";

export interface ProofpackVerificationResult { ok: boolean; reasons: string[]; }

export function verifyProofpackManifest(rootDir: string, reasons: string[]): void {
  const artifacts = readLocalGovernedProofArtifacts(rootDir);
  const manifestHash = String(artifacts.manifest.manifestHash ?? "");
  const copy = { ...artifacts.manifest }; delete copy.manifestHash;
  if (stableSha256(copy) !== manifestHash) reasons.push("manifest_hash_mismatch");
}
export function verifyProofpackArtifacts(rootDir: string, reasons: string[]): void {
  const artifacts = readLocalGovernedProofArtifacts(rootDir);
  if (artifacts.events.length === 0) reasons.push("missing_events");
  if (artifacts.receipts.length === 0) reasons.push("missing_receipts");
}
export function verifyProofpackHashes(rootDir: string, reasons: string[]): void { verifyProofpackManifest(rootDir, reasons); }
export function verifyProofpackLineage(rootDir: string, reasons: string[]): void {
  const artifacts = readLocalGovernedProofArtifacts(rootDir);
  const replay = artifacts.replayEnvelope;
  if (String(replay.reasonCode ?? "") !== "replay_validated") reasons.push("replay_mismatch");
}
export function verifyProofpackRedaction(rootDir: string, reasons: string[]): void {
  const json = JSON.stringify(readLocalGovernedProofArtifacts(rootDir)).toLowerCase();
  for (const needle of ["token","password","api_key","authorization","private_key","bearer "]) if (json.includes(needle)) reasons.push("secret_leakage");
}
export function verifyProofpackReplayEnvelope(rootDir: string, reasons: string[]): void { verifyProofpackLineage(rootDir, reasons); }

export function verifyProofpack(rootDir: string): ProofpackVerificationResult {
  const reasons: string[] = [];
  verifyProofpackManifest(rootDir, reasons);
  verifyProofpackArtifacts(rootDir, reasons);
  verifyProofpackHashes(rootDir, reasons);
  verifyProofpackLineage(rootDir, reasons);
  verifyProofpackRedaction(rootDir, reasons);
  verifyProofpackReplayEnvelope(rootDir, reasons);
  return { ok: reasons.length===0, reasons };
}
