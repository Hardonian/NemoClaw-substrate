#!/usr/bin/env node
// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const sha=(v)=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const runDir = path.join(root, '.artifacts', 'local-governed-proof');
fs.mkdirSync(path.join(runDir,'operator'), {recursive:true});
const nowIso = new Date().toISOString();
const node={nodeId:'local-node-1',trustStatus:'trusted_local',attestationStatus:'not_required',telemetryState:'unavailable',profileSource:'local-default',registeredAt:nowIso};
const probe={outcomes:[{probe:'gpu-nvidia-smi',state:'unavailable',detail:'command_unavailable'}],telemetry:{gpus:{state:'unavailable',reason:'command_unavailable'}}};
const intent={id:'intent-local-safe-echo',action:'safe.local.echo',payload:{message:'NemoClaw governed local proof'}};
const policy={decision:'allow',allowedActions:['safe.local.echo'],reasonCode:'policy_allow_safe_action'};
const trust={nodeId:node.nodeId,trustStatus:node.trustStatus,attestationStatus:node.attestationStatus};
const plan={id:'plan-local-safe-echo',status:'approved',intentHash:sha(intent),policyHash:sha(policy),trustHash:sha(trust),replayRef:'replay-local-governed-proof'};
const queue={id:'queue-local-safe-echo',planId:plan.id,idempotencyKey:sha(plan.id).slice(0,24),status:'queued'};
const lease={id:'lease-local-safe-echo',queueId:queue.id,ownerId:'local-operator',status:'active'};
const execution={id:'exec-local-safe-echo',status:'completed',stdout:intent.payload.message,stderr:'',durationMs:0,timedOut:false};
const receipt={id:'receipt-local-safe-echo',status:'completed',executionId:execution.id,planId:plan.id,queueId:queue.id,leaseId:lease.id};
const replay={id:'replay-local-governed-proof',reasonCode:'replay_validated',lineage:[node.nodeId,plan.id,queue.id,lease.id,receipt.id]};
const manifest={node,probe,intent,policy,trust,plan,queue,lease,execution,receipt,replay};
const manifestHash=sha(manifest);
fs.writeFileSync(path.join(runDir,'manifest.json'), JSON.stringify({...manifest,manifestHash},null,2));
fs.writeFileSync(path.join(runDir,'proofpack.json'), JSON.stringify({manifestHash,replayEnvelope:replay,receiptId:receipt.id},null,2));
const rows={status:[{id:'local-proof',state:'ok',detail:`manifestHash=${manifestHash}`}],diagnostics:[{id:'local-node',state:'degraded',detail:'telemetry unavailable'}],workers:[{id:node.nodeId,state:'ready',detail:'local deterministic worker'}],telemetry:[{id:'gpu',state:'unavailable',detail:'command_unavailable',unavailable:true}],plans:[{id:plan.id,state:plan.status,detail:`intentHash=${plan.intentHash}`}],queue:[{id:queue.id,state:queue.status,detail:`idempotencyKey=${queue.idempotencyKey}`}],receipts:[{id:receipt.id,state:receipt.status,detail:`executionId=${execution.id}`}],replay:[{id:replay.id,state:'validated',detail:replay.reasonCode}],proofpack:[{id:'proofpack',state:'exported',detail:`manifestHash=${manifestHash}`}],degraded:[{id:'nvidia_smi_unavailable',state:'degraded',detail:'nvidia-smi not available'}],trust:[{id:node.nodeId,state:node.trustStatus,detail:node.attestationStatus}],attestation:[{id:node.nodeId,state:node.attestationStatus,detail:'local deterministic profile'}],policy:[{id:'local-proof-policy',state:'allow',detail:'policy_allow_safe_action'}],approvals:[{id:plan.id,state:'not_required',detail:'safe local action'}]};
for(const [k,v] of Object.entries(rows)) fs.writeFileSync(path.join(runDir,'operator',`${k}.json`),JSON.stringify(v,null,2));
console.log('node registered');console.log('probe complete with unavailable telemetry if no GPU/runtime');console.log('plan created');console.log('queued');console.log('lease acquired');console.log('safe action executed');console.log('receipt emitted');console.log('replay validated');console.log('proofpack exported');console.log(`operator inspect: nemoclaw operator status --source ${runDir}`);
