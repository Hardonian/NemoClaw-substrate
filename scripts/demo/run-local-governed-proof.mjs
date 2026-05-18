#!/usr/bin/env node
// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runLocalGovernedProof } from "../../dist/lib/control-plane/local-governed-proof.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const result = runLocalGovernedProof({ rootDir: root });
console.log(JSON.stringify({ ok: result.verification.ok && result.proofpackOk, runDir: result.runDir, reasons: result.verification.reasons }, null, 2));
if (!(result.verification.ok && result.proofpackOk)) process.exit(1);
