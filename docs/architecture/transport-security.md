<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Transport Security

Transport security lives at the boundary before a URL is fetched or a remote transport adapter is invoked.
The guard accepts only configured schemes, strips embedded URL credentials, removes fragments, classifies the host, and normalizes timeouts to a deterministic ceiling.

Current default transport policy:

- allowed schemes: `https:` only (remote execution default)
- timeout minimum: 250 ms
- timeout default: 2 seconds
- timeout ceiling: 10 seconds
- embedded URL credentials: stripped before transport

Local-only transport policy additionally permits `http:` for loopback endpoints (e.g., Ollama at `http://localhost:11434`). This is safe because credentials never transit over a network boundary.

The `INSECURE_HTTP_TRANSPORT_POLICY` export re-enables `http:` for both local and remote targets. Use only when the operator explicitly accepts the risk of credentials in cleartext.

Unsupported schemes fail closed with `unsupported_scheme`.
Malformed URLs fail closed with `transport_url_invalid`.
Network-policy denials fail before fetch or remote transport.

Remote probes and remote execution both use this policy before their respective transport calls.
Remote execution still requires the existing opt-in flag and governance gates; this layer only hardens the already guarded seam.
