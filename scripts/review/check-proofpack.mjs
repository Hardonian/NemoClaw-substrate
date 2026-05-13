// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { promises as fs } from 'fs';
import path from 'path';

async function checkProofpack() {
  console.log('[check-proofpack] Currently evidence export/proofpack support is partial.');
  console.log('[check-proofpack] Checking for basic verification docs...');
  
  try {
    await fs.access('./docs/verification/proofpack-review-checks.md');
    console.log('[check-proofpack] Review checks doc exists.');
  } catch (e) {
    console.warn('[check-proofpack] WARNING: docs/verification/proofpack-review-checks.md is missing.');
  }
}

checkProofpack().catch(err => {
  console.error(err);
  process.exit(1);
});
