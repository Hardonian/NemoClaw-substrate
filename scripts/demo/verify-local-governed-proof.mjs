#!/usr/bin/env node
// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const runDir = path.join(root, '.artifacts', 'local-governed-proof');
const requiredFiles = [
  'manifest.json',
  'proofpack.json',
  'replay-envelope.json',
  'receipts.ndjson',
  'events.ndjson',
  'diagnostics.json',
  'queue.json',
  'lease.json',
  'plan.json',
  'intent.json',
  'node.json',
  'probe.json',
];

const sha = (v) => crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(runDir, name), 'utf8'));

for (const f of requiredFiles) {
  if (!fs.existsSync(path.join(runDir, f))) {
    throw new Error(`missing required artifact: ${f}`);
  }
}

const manifest = readJson('manifest.json');
const proofpack = readJson('proofpack.json');
const replay = readJson('replay-envelope.json');
const receiptRows = fs.readFileSync(path.join(runDir, 'receipts.ndjson'), 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
const eventRows = fs.readFileSync(path.join(runDir, 'events.ndjson'), 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));

if (!manifest.manifestHash) throw new Error('manifest missing manifestHash');
const { manifestHash: _ignoredHash, ...manifestBody } = manifest;
const computed = sha(manifestBody);
if (computed !== manifest.manifestHash) throw new Error('manifest hash mismatch');
if (proofpack.manifestHash !== manifest.manifestHash) throw new Error('proofpack manifest hash mismatch');
if (replay.reasonCode !== 'replay_validated') throw new Error('replay not validated');
if (receiptRows.length === 0) throw new Error('no receipt rows present');
if (eventRows.length < 2) throw new Error('insufficient event rows');

console.log('local proof verification passed');
console.log(`manifestHash=${manifest.manifestHash}`);
