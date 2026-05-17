#!/usr/bin/env node
// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const runDir = path.join(root, '.artifacts', 'local-governed-proof');
fs.rmSync(runDir, { recursive: true, force: true });
console.log('cleaned .artifacts/local-governed-proof');
