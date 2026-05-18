// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export const EXECUTION_STATES = [
  "observed","planned","queued","leased","executing","completed","failed","blocked","degraded","cancelled","expired","replay_valid","replay_invalid","proofpack_exported",
] as const;

export type ExecutionState = (typeof EXECUTION_STATES)[number];
export type ExecutionTransitionReasonCode =
  | "intent_observed" | "plan_approved" | "enqueued" | "lease_acquired" | "execution_started"
  | "execution_completed" | "execution_failed" | "execution_blocked" | "execution_degraded"
  | "execution_cancelled" | "lease_expired" | "replay_validated" | "replay_rejected" | "proofpack_exported";

export interface ExecutionTransition { from: ExecutionState; to: ExecutionState; reasonCode?: ExecutionTransitionReasonCode; atIso: string; lineageId: string; }
export interface ExecutionTransitionResult { ok: boolean; error?: string; state: ExecutionState; transition: ExecutionTransition; }

const ALLOWED: Record<ExecutionState, ExecutionState[]> = {
  observed:["planned"], planned:["queued","blocked","cancelled"], queued:["leased","expired","cancelled"], leased:["executing","expired","cancelled"],
  executing:["completed","failed","blocked","degraded","cancelled"], completed:["replay_valid","replay_invalid"], failed:["replay_invalid"], blocked:["cancelled"], degraded:["executing","failed","cancelled"],
  cancelled:[], expired:[], replay_valid:["proofpack_exported"], replay_invalid:[], proofpack_exported:[],
};

export function validateExecutionTransition(transition: ExecutionTransition): ExecutionTransitionResult {
  if (!transition.reasonCode) return { ok:false, error:"missing_reason_code", state:transition.from, transition };
  if (!ALLOWED[transition.from].includes(transition.to)) return { ok:false, error:"illegal_transition", state:transition.from, transition };
  return { ok:true, state:transition.to, transition };
}

export function applyExecutionTransition(current: ExecutionState, next: Omit<ExecutionTransition,"from">): ExecutionTransitionResult {
  return validateExecutionTransition({ ...next, from: current });
}

export function createTransitionReceipt(result: ExecutionTransitionResult): Record<string,string|boolean> {
  return { id:`receipt-${result.transition.lineageId}-${result.transition.to}`, ok: result.ok, from: result.transition.from, to: result.transition.to, reasonCode: result.transition.reasonCode ?? "", atIso: result.transition.atIso };
}

export function createTransitionEvent(result: ExecutionTransitionResult): Record<string,string|boolean> {
  return { id:`event-${result.transition.lineageId}-${result.transition.to}`, type:"execution_transition", state: result.transition.to, ok: result.ok, reasonCode: result.transition.reasonCode ?? "", atIso: result.transition.atIso };
}
