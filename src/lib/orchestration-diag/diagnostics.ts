// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Orchestration observability and diagnostics.
 *
 * Exposes state for:
 * - Orchestration state
 * - Daemon state
 * - Retry attempts
 * - Fanout branches
 * - GPU scoring rationale
 * - Dynamo adapter status
 * - Remote enablement decision
 * - Policy learning proposals
 */

import { OrchestrationEngine } from "../orchestration";
import { DaemonScheduler, SchedulerState, DaemonStatus } from "../scheduler";
import { RetryManager } from "../retry";
import { FanoutManager } from "../fanout";
import { GpuScheduler } from "../gpu-scheduling";
import { DynamoAdapter } from "../dynamo";
import { RemoteEnablementEvaluator } from "../remote-enablement";
import { PolicyLearningManager } from "../policy-learning";

// ============================================================================
// Diagnostic snapshot types
// ============================================================================

export interface OrchestrationDiagnosticSnapshot {
  generatedAt: string;
  orchestration: {
    enabled: boolean;
    planCount: number;
    runCount: number;
    receiptCount: number;
    decisionCount: number;
  };
  scheduler: {
    enabled: boolean;
    status: DaemonStatus;
    state: SchedulerState | null;
  };
  retry: {
    explicit: boolean;
    receiptCount: number;
  };
  fanout: {
    enabled: boolean;
    receiptCount: number;
  };
  gpu: {
    enabled: boolean;
    scoreCount: number;
    decisionCount: number;
  };
  dynamo: {
    enabled: boolean;
    connected: boolean;
    registeredWorkers: number;
    gaps: string[];
  };
  remoteEnablement: {
    enabled: boolean;
  };
  policyLearning: {
    proposalCount: number;
  };
}

// ============================================================================
// Diagnostic collector
// ============================================================================

export class OrchestrationDiagnostics {
  private orchestrationEngine: OrchestrationEngine;
  private daemonScheduler: DaemonScheduler;
  private retryManager: RetryManager;
  private fanoutManager: FanoutManager;
  private gpuScheduler: GpuScheduler;
  private dynamoAdapter: DynamoAdapter;
  private remoteEvaluator: RemoteEnablementEvaluator;
  private policyLearningManager: PolicyLearningManager;

  constructor(
    orchestrationEngine: OrchestrationEngine,
    daemonScheduler: DaemonScheduler,
    retryManager: RetryManager,
    fanoutManager: FanoutManager,
    gpuScheduler: GpuScheduler,
    dynamoAdapter: DynamoAdapter,
    remoteEvaluator: RemoteEnablementEvaluator,
    policyLearningManager: PolicyLearningManager,
  ) {
    this.orchestrationEngine = orchestrationEngine;
    this.daemonScheduler = daemonScheduler;
    this.retryManager = retryManager;
    this.fanoutManager = fanoutManager;
    this.gpuScheduler = gpuScheduler;
    this.dynamoAdapter = dynamoAdapter;
    this.remoteEvaluator = remoteEvaluator;
    this.policyLearningManager = policyLearningManager;
  }

  collectSnapshot(): OrchestrationDiagnosticSnapshot {
    const dynamoReport = this.dynamoAdapter.getStatusReport();

    return {
      generatedAt: new Date().toISOString(),
      orchestration: {
        enabled: this.orchestrationEngine.getAllPlans().length > 0,
        planCount: this.orchestrationEngine.getAllPlans().length,
        runCount: this.orchestrationEngine.getAllRuns().length,
        receiptCount: this.orchestrationEngine.getAllReceipts().length,
        decisionCount: this.orchestrationEngine.getAllDecisions().length,
      },
      scheduler: {
        enabled: this.daemonScheduler.isRunning(),
        status: this.daemonScheduler.getStatus(),
        state: this.daemonScheduler.getState(),
      },
      retry: {
        explicit: process.env.NEMOCLAW_RETRY_POLICY === "explicit",
        receiptCount: this.retryManager.getReceipts().length,
      },
      fanout: {
        enabled: process.env.NEMOCLAW_SPECULATIVE_FANOUT === "1",
        receiptCount: this.fanoutManager.getReceipts().length,
      },
      gpu: {
        enabled: process.env.NEMOCLAW_GPU_AWARE_SCHEDULING === "1",
        scoreCount: this.gpuScheduler.getScores().length,
        decisionCount: this.gpuScheduler.getDecisions().length,
      },
      dynamo: {
        enabled: dynamoReport.enabled,
        connected: dynamoReport.connected,
        registeredWorkers: dynamoReport.registeredWorkers,
        gaps: dynamoReport.gaps,
      },
      remoteEnablement: {
        enabled: process.env.NEMOCLAW_REMOTE_EXECUTION === "1",
      },
      policyLearning: {
        proposalCount: this.policyLearningManager.getAllProposals().length,
      },
    };
  }

  getOrchestrationState(): Record<string, unknown>[] {
    return this.orchestrationEngine.getAllPlans().map((plan) => ({
      planId: plan.planId,
      name: plan.name,
      status: plan.status,
      stepCount: plan.steps.length,
      createdAt: plan.createdAt,
    }));
  }

  getDaemonState(): SchedulerState | null {
    return this.daemonScheduler.getState();
  }

  getRetryAttempts(): Record<string, unknown>[] {
    return this.retryManager.getReceipts().map((r) => ({
      receiptId: r.receiptId,
      runId: r.runId,
      stepId: r.stepId,
      allowed: r.allowed,
      reasonCode: r.reasonCode,
      timestamp: r.timestamp,
    }));
  }

  getFanoutBranches(): Record<string, unknown>[] {
    return this.fanoutManager.getReceipts().map((r) => ({
      receiptId: r.receiptId,
      runId: r.runId,
      fanoutId: r.fanoutId,
      candidateId: r.candidateId,
      type: r.type,
      reasonCode: r.reasonCode,
      timestamp: r.timestamp,
    }));
  }

  getGpuScoringRationale(): Record<string, unknown>[] {
    return this.gpuScheduler.getScores().map((s) => ({
      gpuId: s.gpuId,
      score: s.score,
      diagnostics: s.diagnostics,
      degradationFlags: s.degradationFlags,
      scoredAt: s.scoredAt,
    }));
  }

  getDynamoAdapterStatus(): Record<string, unknown> {
    const report = this.dynamoAdapter.getStatusReport();
    return {
      enabled: report.enabled,
      connected: report.connected,
      registeredWorkers: report.registeredWorkers,
      gaps: report.gaps,
      implementationStatuses: report.implementationStatuses,
      generatedAt: report.generatedAt,
    };
  }

  getRemoteEnablementDecisions(): Record<string, unknown>[] {
    return [];
  }

  getPolicyLearningProposals(): Record<string, unknown>[] {
    return this.policyLearningManager.getAllProposals().map((p) => ({
      proposalId: p.proposalId,
      policyId: p.policyId,
      currentVersion: p.currentPolicyVersion,
      proposedVersion: p.proposedPolicyVersion,
      status: p.status,
      changeCount: p.proposedChanges.length,
      evidenceCount: p.evidenceIds.length,
      createdAt: p.createdAt,
    }));
  }
}
