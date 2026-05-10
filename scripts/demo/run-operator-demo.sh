#!/usr/bin/env bash
# SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail
for t in status diagnostics workers telemetry trust attestation replay receipts proofpack queue policy degraded plans approvals; do
  node ./bin/nemoclaw.js operator "$t" --json >/dev/null
  echo "ok:$t"
done
