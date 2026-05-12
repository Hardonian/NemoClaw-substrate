// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Speculative fanout implementation.
 *
 * Hard rules:
 * - Opt-in only
 * - Bounded max candidates
 * - Explicit cancellation receipts
 * - Winner selection deterministic
 * - Losing branches recorded
 * - No fanout around policy denial
 */

import {
  FanoutPolicy,
  FanoutCandidate,
  FanoutBudget,
  FanoutCancellation,
  FanoutReceipt,
  FanoutRun,
  FanoutStatus,
  CandidateStatus,
  FanoutReasonCode,
  FanoutReceiptType,
  DEFAULT_FANOUT_POLICY,
  createFanoutBudget,
  allocateCandidate,
  validateFanoutCandidate,
} from "./types";

import { isSpeculativeFanoutEnabled } from "../orchestration/types";

// ============================================================================
// Store interface
// ============================================================================

export interface FanoutStore {
  getRun(fanoutId: string): FanoutRun | undefined;
  saveRun(run: FanoutRun): void;
  getBudget(runId: string): FanoutBudget | undefined;
  saveBudget(budget: FanoutBudget): void;
}

export interface FanoutManagerOptions {
  now?: () => string;
}

export class InMemoryFanoutStore implements FanoutStore {
  private runs = new Map<string, FanoutRun>();
  private budgets = new Map<string, FanoutBudget>();

  getRun(fanoutId: string): FanoutRun | undefined {
    return this.runs.get(fanoutId);
  }

  saveRun(run: FanoutRun): void {
    this.runs.set(run.fanoutId, run);
  }

  getBudget(runId: string): FanoutBudget | undefined {
    return this.budgets.get(runId);
  }

  saveBudget(budget: FanoutBudget): void {
    this.budgets.set(budget.runId, budget);
  }
}

// ============================================================================
// Fanout manager
// ============================================================================

export class FanoutManager {
  private store: FanoutStore;
  private receipts: FanoutReceipt[] = [];
  private policies = new Map<string, FanoutPolicy>();
  private sequence = 0;
  private now: () => string;

  constructor(store: FanoutStore, options: FanoutManagerOptions = {}) {
    this.store = store;
    this.now = options.now ?? (() => new Date().toISOString());
  }

  registerPolicy(policy: FanoutPolicy): void {
    this.policies.set(policy.policyId, policy);
  }

  startFanout(
    runId: string,
    fanoutId: string,
    policyId: string,
    candidatePayloads: Record<string, unknown>[],
  ): { allowed: boolean; run?: FanoutRun; receipt: FanoutReceipt } {
    if (!isSpeculativeFanoutEnabled()) {
      const receipt = this.makeReceipt(
        runId,
        fanoutId,
        undefined,
        FanoutReasonCode.FANOUT_NOT_ENABLED,
        FanoutReceiptType.FANOUT_STARTED,
        { reason: "Fanout is not enabled. Set NEMOCLAW_SPECULATIVE_FANOUT=1 to enable." },
      );
      return { allowed: false, receipt };
    }

    const policy = this.policies.get(policyId);
    if (!policy || !policy.enabled) {
      const receipt = this.makeReceipt(
        runId,
        fanoutId,
        undefined,
        FanoutReasonCode.POLICY_DENIED,
        FanoutReceiptType.FANOUT_STARTED,
        { reason: "Fanout policy is not enabled" },
      );
      return { allowed: false, receipt };
    }

    if (candidatePayloads.length > policy.maxCandidates) {
      const receipt = this.makeReceipt(
        runId,
        fanoutId,
        undefined,
        FanoutReasonCode.MAX_CANDIDATES_EXCEEDED,
        FanoutReceiptType.FANOUT_STARTED,
        {
          requested: candidatePayloads.length,
          maxAllowed: policy.maxCandidates,
        },
      );
      return { allowed: false, receipt };
    }

    let budget = this.store.getBudget(runId);
    if (!budget) {
      if (policy.budgetRequired) {
        budget = { ...createFanoutBudget(runId, policy.maxCandidates), createdAt: this.now(), updatedAt: this.now() };
        this.store.saveBudget(budget);
      }
    }

    if (budget && budget.remainingCandidates < candidatePayloads.length) {
      const receipt = this.makeReceipt(
        runId,
        fanoutId,
        undefined,
        FanoutReasonCode.BUDGET_EXHAUSTED,
        FanoutReceiptType.FANOUT_STARTED,
        {
          requested: candidatePayloads.length,
          remaining: budget.remainingCandidates,
        },
      );
      return { allowed: false, receipt };
    }

    const now = this.now();
    const candidates: FanoutCandidate[] = candidatePayloads.map((payload, index) => {
      let updatedBudget = budget;
      if (updatedBudget) {
        const allocated = allocateCandidate(updatedBudget);
        if (allocated) {
          updatedBudget = { ...allocated, updatedAt: this.now() };
          this.store.saveBudget(updatedBudget);
        }
      }

      return {
        candidateId: `candidate-${fanoutId}-${index}`,
        fanoutId,
        runId,
        candidateIndex: index,
        status: "pending",
        payload,
        startedAt: now,
      };
    });

    const run: FanoutRun = {
      fanoutId,
      runId,
      policyId,
      budgetId: budget?.budgetId,
      candidates,
      status: "running",
      startedAt: now,
      receipts: [],
      cancellations: [],
    };
    this.store.saveRun(run);

    const receipt = this.makeReceipt(
      runId,
      fanoutId,
      undefined,
      FanoutReasonCode.FANOUT_STARTED,
      FanoutReceiptType.FANOUT_STARTED,
      { candidateCount: candidates.length },
    );

    return { allowed: true, run: this.store.getRun(fanoutId) ?? run, receipt };
  }

  completeCandidate(
    fanoutId: string,
    candidateId: string,
    resultHash?: string,
    costEstimate?: number,
  ): FanoutReceipt {
    const run = this.store.getRun(fanoutId);
    if (!run) {
      return this.makeReceipt(
        "",
        fanoutId,
        candidateId,
        FanoutReasonCode.CANDIDATE_FAILED,
        FanoutReceiptType.CANDIDATE_FAILED,
        { reason: "Fanout run not found" },
      );
    }

    const candidate = run.candidates.find((c) => c.candidateId === candidateId);
    if (!candidate) {
      return this.makeReceipt(
        run.runId,
        fanoutId,
        candidateId,
        FanoutReasonCode.CANDIDATE_FAILED,
        FanoutReceiptType.CANDIDATE_FAILED,
        { reason: "Fanout candidate not found" },
      );
    }
    if (candidate.status !== "pending" && candidate.status !== "running") {
      return this.makeReceipt(
        run.runId,
        fanoutId,
        candidateId,
        FanoutReasonCode.CANDIDATE_FAILED,
        FanoutReceiptType.CANDIDATE_FAILED,
        { reason: `Fanout candidate is ${candidate.status}` },
      );
    }

    const now = this.now();
    const durationMs = candidate.startedAt ? this.nowMs() - Date.parse(candidate.startedAt) : undefined;

    const updatedCandidates = run.candidates.map((c) => {
      if (c.candidateId === candidateId) {
        return {
          ...c,
          status: "completed" as CandidateStatus,
          completedAt: now,
          resultHash,
          costEstimate,
          durationMs,
        };
      }
      return c;
    });

    this.store.saveRun({ ...run, candidates: updatedCandidates });

    return this.makeReceipt(
      run.runId,
      fanoutId,
      candidateId,
      FanoutReasonCode.CANDIDATE_COMPLETED,
      FanoutReceiptType.CANDIDATE_COMPLETED,
      { candidateId, durationMs },
    );
  }

  cancelCandidate(fanoutId: string, candidateId: string, reason: string): FanoutReceipt {
    const run = this.store.getRun(fanoutId);
    if (!run) {
      return this.makeReceipt(
        "",
        fanoutId,
        candidateId,
        FanoutReasonCode.CANDIDATE_CANCELLED,
        FanoutReceiptType.CANDIDATE_CANCELLED,
        { reason },
      );
    }

    const now = this.now();
    const updatedCandidates = run.candidates.map((c) => {
      if (c.candidateId === candidateId) {
        return { ...c, status: "cancelled" as CandidateStatus, cancelledAt: now };
      }
      return c;
    });

    this.store.saveRun({ ...run, candidates: updatedCandidates });

    return this.makeReceipt(
      run.runId,
      fanoutId,
      candidateId,
      FanoutReasonCode.CANDIDATE_CANCELLED,
      FanoutReceiptType.CANDIDATE_CANCELLED,
      { candidateId, reason },
    );
  }

  selectWinner(fanoutId: string): { winnerId?: string; receipts: FanoutReceipt[] } {
    const run = this.store.getRun(fanoutId);
    if (!run) {
      return { receipts: [] };
    }

    const policy = this.policies.get(run.policyId);
    if (!policy) {
      return { receipts: [] };
    }

    const completedCandidates = run.candidates.filter((c) => c.status === "completed");
    if (completedCandidates.length === 0) {
      return { receipts: [] };
    }

    let winner: FanoutCandidate;
    switch (policy.winnerSelectionStrategy) {
      case "first_complete":
        winner = completedCandidates[0];
        break;
      case "lowest_cost":
        winner = completedCandidates.reduce((best, current) => {
          if (!current.costEstimate) return best;
          if (!best.costEstimate) return current;
          return current.costEstimate < best.costEstimate ? current : best;
        });
        break;
      default:
        winner = completedCandidates[0];
    }

    const receipts: FanoutReceipt[] = [];
    const now = this.now();

    const updatedCandidates = run.candidates.map((c) => {
      if (c.candidateId === winner.candidateId) {
        return c;
      }
      const cancelled = { ...c, status: "cancelled" as CandidateStatus, cancelledAt: now };
      receipts.push(
        this.makeReceipt(
          run.runId,
          fanoutId,
          c.candidateId,
          FanoutReasonCode.LOSER_RECORDED,
          FanoutReceiptType.LOSER_RECORDED,
          { candidateId: c.candidateId, winnerId: winner.candidateId },
        ),
      );
      return cancelled;
    });

    this.store.saveRun({
      ...run,
      candidates: updatedCandidates,
      winnerCandidateId: winner.candidateId,
      status: "completed" as FanoutStatus,
      completedAt: now,
    });

    receipts.push(
      this.makeReceipt(
        run.runId,
        fanoutId,
        winner.candidateId,
        FanoutReasonCode.WINNER_SELECTED,
        FanoutReceiptType.WINNER_SELECTED,
        { winnerId: winner.candidateId },
      ),
    );

    return { winnerId: winner.candidateId, receipts };
  }

  cancelFanout(fanoutId: string, reason: string, cancelledBy?: string): FanoutReceipt {
    const run = this.store.getRun(fanoutId);
    if (!run) {
      return this.makeReceipt(
        "",
        fanoutId,
        undefined,
        FanoutReasonCode.FANOUT_CANCELLED,
        FanoutReceiptType.FANOUT_CANCELLED,
        { reason },
      );
    }

    const now = this.now();
    const cancelledCandidateIds = run.candidates
      .filter((c) => c.status === "pending" || c.status === "running")
      .map((c) => c.candidateId);

    const updatedCandidates = run.candidates.map((c) => {
      if (c.status === "pending" || c.status === "running") {
        return { ...c, status: "cancelled" as CandidateStatus, cancelledAt: now };
      }
      return c;
    });

    const cancellation: FanoutCancellation = {
      cancellationId: this.nextId("cancel", fanoutId),
      fanoutId,
      runId: run.runId,
      cancelledCandidateIds,
      reasonCode: FanoutReasonCode.FANOUT_CANCELLED,
      reasonMessage: reason,
      cancelledAt: now,
      cancelledBy,
      receipts: [],
    };

    this.store.saveRun({
      ...run,
      candidates: updatedCandidates,
      status: "cancelled" as FanoutStatus,
      cancelledAt: now,
      cancellations: [...run.cancellations, cancellation],
    });

    return this.makeReceipt(
      run.runId,
      fanoutId,
      undefined,
      FanoutReasonCode.FANOUT_CANCELLED,
      FanoutReceiptType.FANOUT_CANCELLED,
      { reason, cancelledCount: cancelledCandidateIds.length },
    );
  }

  getReceipts(): FanoutReceipt[] {
    return [...this.receipts];
  }

  private makeReceipt(
    runId: string,
    fanoutId: string,
    candidateId: string | undefined,
    reasonCode: FanoutReasonCode,
    type: FanoutReceiptType,
    data: Record<string, unknown>,
  ): FanoutReceipt {
    const receipt: FanoutReceipt = {
      receiptId: this.nextId("fanout-receipt", fanoutId, candidateId ?? "none", String(type), String(reasonCode)),
      runId,
      fanoutId,
      candidateId,
      timestamp: this.now(),
      reasonCode,
      type,
      data,
    };
    this.receipts.push(receipt);
    const run = this.store.getRun(fanoutId);
    if (run) {
      this.store.saveRun({ ...run, receipts: [...run.receipts, receipt] });
    }
    return receipt;
  }

  private nextId(prefix: string, ...parts: string[]): string {
    this.sequence += 1;
    const cleaned = parts.map((part) => part.replace(/[^a-zA-Z0-9_.:-]+/g, "_") || "none");
    return [prefix, ...cleaned, String(this.sequence).padStart(6, "0")].join("-");
  }

  private nowMs(): number {
    return Date.parse(this.now());
  }
}
