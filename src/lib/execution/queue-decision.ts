// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Deterministic queue decision with explicit reason codes.
 * All decisions are replay-visible and non-deterministic state transitions fail closed.
 */

import { QueueReasonCode } from './reason-codes';

export class QueueDecision {
  readonly allowed: boolean;
  readonly reasonCode?: QueueReasonCode;
  readonly message: string;
  readonly timestamp: string;

  private constructor(allowed: boolean, reasonCode: QueueReasonCode | undefined, message: string) {
    this.allowed = allowed;
    this.reasonCode = reasonCode;
    this.message = message;
    this.timestamp = new Date().toISOString();
  }

  static allow(message = 'Allowed'): QueueDecision {
    return new QueueDecision(true, undefined, message);
  }

  static block(reasonCode: QueueReasonCode, message: string): QueueDecision {
    return new QueueDecision(false, reasonCode, message);
  }
}
