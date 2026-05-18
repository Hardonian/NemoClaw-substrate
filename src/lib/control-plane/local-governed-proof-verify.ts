// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { readLocalGovernedProofArtifacts, stableSha256 } from "./local-governed-proof-artifacts";

export interface LocalProofVerificationResult {
  ok: boolean;
  manifestHash?: string;
  reasons: string[];
}

export function verifyLocalGovernedProof(rootDir: string): LocalProofVerificationResult {
  const reasons: string[] = [];
  const artifacts = readLocalGovernedProofArtifacts(rootDir);
  const manifestHash = String(artifacts.manifest.manifestHash ?? "");
  if (!manifestHash) reasons.push("manifest_missing_hash");

  const manifestCopy = { ...artifacts.manifest };
  delete manifestCopy.manifestHash;
  const computed = stableSha256(manifestCopy);
  if (manifestHash && computed !== manifestHash) reasons.push("manifest_hash_mismatch");

  if (String(artifacts.proofpack.manifestHash ?? "") !== manifestHash) reasons.push("proofpack_manifest_hash_mismatch");
  if (String(artifacts.replayEnvelope.reasonCode ?? "") !== "replay_validated") reasons.push("replay_not_validated");
  if (artifacts.receipts.length < 1) reasons.push("missing_receipts");
  if (artifacts.events.length < 2) reasons.push("insufficient_events");

  return { ok: reasons.length === 0, reasons, manifestHash: manifestHash || undefined };
}
