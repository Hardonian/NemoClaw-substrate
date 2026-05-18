#!/usr/bin/env node
// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
import path from "node:path";
import { fileURLToPath } from "node:url";
import { verifyLocalGovernedProof } from "../../dist/lib/control-plane/local-governed-proof-verify.js";
import { verifyProofpack } from "../../dist/lib/control-plane/proofpack-validator.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const local = verifyLocalGovernedProof(root);
const proofpack = verifyProofpack(root);
console.log(JSON.stringify({ local, proofpack }, null, 2));
if (!local.ok || !proofpack.ok) process.exit(1);
