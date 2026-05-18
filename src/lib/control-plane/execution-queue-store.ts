// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
import fs from "node:fs";
import path from "node:path";
import { readJsonFileSync } from "../core/json-file";

export interface ExecutionQueueItem { id: string; planId: string; idempotencyKey: string; status: "queued"|"leased"|"completed"|"failed"; }
export interface ExecutionLease { id: string; queueId: string; ownerId: string; status: "active"|"released"|"expired"; }
export interface ExecutionOwnership { queueId: string; ownerId: string; }
export interface IdempotencyRecord { key: string; queueId: string; }

function read<T>(file: string, fallback: T): T { if (!fs.existsSync(file)) return fallback; return readJsonFileSync(file) as T; }
function write(file: string, value: unknown): void { fs.writeFileSync(file, JSON.stringify(value, null, 2)); }

export function rejectDuplicateExecution(runDir: string, key: string): void {
  const file = path.join(runDir, "idempotency.json");
  const records = read<IdempotencyRecord[]>(file, []);
  if (records.some((r) => r.key === key)) throw new Error("duplicate_execution");
}

export function enqueueExecution(runDir: string, item: ExecutionQueueItem): ExecutionQueueItem {
  rejectDuplicateExecution(runDir, item.idempotencyKey);
  const queueFile = path.join(runDir, "queue.json");
  const idFile = path.join(runDir, "idempotency.json");
  const queue = read<ExecutionQueueItem[]>(queueFile, []);
  queue.push(item);
  write(queueFile, queue.sort((a,b)=>a.id.localeCompare(b.id)));
  const id = read<IdempotencyRecord[]>(idFile, []);
  id.push({ key:item.idempotencyKey, queueId:item.id });
  write(idFile, id.sort((a,b)=>a.key.localeCompare(b.key)));
  return item;
}

export function acquireLease(runDir: string, lease: ExecutionLease): ExecutionLease {
  const file = path.join(runDir, "lease.json");
  const leases = read<ExecutionLease[]>(file, []);
  if (leases.some((l) => l.queueId === lease.queueId && l.status === "active")) throw new Error("duplicate_lease");
  leases.push(lease);
  write(file, leases.sort((a,b)=>a.id.localeCompare(b.id)));
  return lease;
}

export function releaseLease(runDir: string, leaseId: string): void { const file=path.join(runDir,"lease.json"); const leases=read<ExecutionLease[]>(file,[]).map((l)=>l.id===leaseId?{...l,status:"released" as const}:l); write(file,leases); }
export function expireLease(runDir: string, leaseId: string): void { const file=path.join(runDir,"lease.json"); const leases=read<ExecutionLease[]>(file,[]).map((l)=>l.id===leaseId?{...l,status:"expired" as const}:l); write(file,leases); }

export function validateOwnership(runDir: string, ownership: ExecutionOwnership): void {
  const leases = read<ExecutionLease[]>(path.join(runDir,"lease.json"),[]);
  const active = leases.find((l)=>l.queueId===ownership.queueId && l.status==="active");
  if (!active || active.ownerId !== ownership.ownerId) throw new Error("ownership_mismatch");
}

export function readQueueState(runDir: string): ExecutionQueueItem[] { return read<ExecutionQueueItem[]>(path.join(runDir,"queue.json"),[]); }
export function readLeaseState(runDir: string): ExecutionLease[] { return read<ExecutionLease[]>(path.join(runDir,"lease.json"),[]); }
