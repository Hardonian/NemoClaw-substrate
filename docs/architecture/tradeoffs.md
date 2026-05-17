<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Tradeoffs

These notes explain the practical choices behind the current fork. They are not roadmap promises.

## Orchestration Was Delayed

The repo already had enough moving parts: CLI, OpenShell, policies, inference setup, runtime probes, and docs. Adding a worker fabric before replay, receipt, lease, and proofpack contracts were tested would make failures harder to explain. The current code builds the records first and leaves durable distribution for a later, narrower change.

## Telemetry Is Evidence, Not Authority

GPU and runtime telemetry can be unavailable, stale, malformed, or partial. Treating it as authority would turn missing data into false confidence. Probe outputs therefore annotate decisions, diagnostics, and registries, but they do not silently override policy.

## Approvals Are Explicit

Approval state is represented in records instead of inferred from operator intent. That is slower than optimistic execution, but it makes replay and review possible. Tests cover approval-required and denial paths before transport is attempted.

## Replay Fails Closed

Replay rejects missing lineage, digest mismatch, ownership mismatch, lease mismatch, trust drift, and missing reason codes. This can feel strict during development, but accepting partial replay would make the evidence trail less useful than plain logs.

## Remote Execution Is Opt-In

Remote execution is blocked by default and requires explicit configuration plus policy and trust context. The cost is extra ceremony. The benefit is that default local behavior stays stable while the review surface grows.

## Some Components Are Intentionally Boring

The repository uses deterministic serialization, stable identifiers, fixture-backed CLI output, and table-driven reason codes. These choices are not glamorous, but they make review cheaper and reduce ambiguity.

## Proofpacks Come Before Distributed Execution

Distributed execution without portable evidence would be hard to debug and easy to overclaim. Proofpack helpers make the expected evidence shape visible before there is a worker fleet producing it.

## What Is Overbuilt Today

The naming and documentation are sometimes larger than the implementation. Terms such as `substrate` and `governed` should be used sparingly unless they point to a specific policy, replay, or lifecycle boundary.

## What Would Be Removed If The Scope Narrowed

If this became only a local sandbox CLI, the remote execution adapter, worker trust model, telemetry registry, and policy-promotion proposal code could be removed or archived. The lifecycle, replay, redaction, and verification helpers would still be useful.
