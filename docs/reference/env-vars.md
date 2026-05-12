# Environment Variables And Flags

This page covers governed-substrate flags only. The broader CLI environment-variable contract is documented in `docs/reference/commands.md` and enforced by `scripts/check-env-var-docs.ts`.

Flags are not capability claims. A flag listed here may enable a pure contract layer, a diagnostic seam, or a fail-closed adapter preflight without enabling background workers or distributed execution.

## Implemented Governed-Substrate Flags

| Variable | Default | Truthful Behavior |
|:---|:---|:---|
| `NEMOCLAW_ORCHESTRATION` | unset | Set to `1` to enable the in-memory orchestration contract layer. When unset, mutating orchestration operations fail closed with `orchestration_disabled`. |
| `NEMOCLAW_RETRY_POLICY` | unset | Set to `explicit` before the retry manager will allow receipt-backed retry attempts. Unset is fail-closed, not implicit retry. |
| `NEMOCLAW_GOVERNED_ROUTING` | unset | Set to `1` to opt into governed provider routing. Default routing behavior is preserved when unset. |
| `NEMOCLAW_GOVERNED_ROUTING_ALLOW_DEGRADED_STATE_TRIGGER` | unset | Set to `1` to allow degraded-state-trigger routing evidence in the governed routing path. |
| `NEMOCLAW_HETEROGENEOUS_ROUTING` | unset | Set to `1` to enable heterogeneous routing selection contracts. This does not imply remote execution. |
| `NEMOCLAW_REMOTE_EXECUTION` | unset | Set to `1` to allow the guarded remote-execution adapter to consider transport. Policy eligibility and approval are still required before transport. |
| `NEMOCLAW_EVIDENCE_FORMAT` | `json` | Selects default Proofpack export formatting where used. Supported values are `json` and `ndjson`. |

## Scaffolded Or Diagnostic-Only Flags

| Variable | Default | Truthful Behavior |
|:---|:---|:---|
| `NEMOCLAW_DYNAMO_ADAPTER` | unset | Enables the Dynamo adapter seam. The adapter is fail-closed by default and does not provide production Dynamo persistence in this repository. |
| `NEMOCLAW_DAEMON_SCHEDULER` | unset | Enables the in-memory daemon scheduler contract. It does not spawn a background process or poll work by itself. |
| `NEMOCLAW_SPECULATIVE_FANOUT` | unset | Enables bounded fanout contract bookkeeping. It does not launch candidate execution by itself. |
| `NEMOCLAW_GPU_AWARE_SCHEDULING` | unset | Enables GPU scoring from caller-provided telemetry. It does not provide fleet GPU balancing or placement. |

## Not Implemented By Flags

No flag in this repository currently enables:

- autonomous orchestration
- background queue workers
- daemon lease renewal
- hidden retries
- speculative execution fanout
- GPU balancing
- production Dynamo-backed state
- automatic policy learning
- implicit remote execution

If a path cannot prove its prerequisites, it must report a blocked, degraded, unavailable, or disabled state rather than silently continuing.
