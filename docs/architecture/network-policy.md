<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Network Policy

Network policy is deterministic and DNS-free at this layer.
The validator classifies the URL host from the literal hostname or IP address supplied by the caller.

Address classes:

- `loopback`
- `private`
- `tailscale_or_cgnat`
- `lan_link_local`
- `public`
- `hostname`
- `unknown`

Local-only policy allows loopback and blocks private, Tailscale/CGNAT, link-local, public, and hostname targets.
Remote policy allows loopback, private, Tailscale/CGNAT, public, and hostname targets by default to preserve existing explicit remote probe/execution behavior.

Private and LAN-safe classifications are recognized only when deterministically visible from the input:

- RFC1918 IPv4 ranges
- IPv4 loopback and link-local ranges
- IPv6 loopback, link-local, and unique-local prefixes
- `100.64.0.0/10` as `tailscale_or_cgnat`

This layer does not resolve DNS or infer network trust from names.
Future callers that need DNS-aware policy must perform that resolution in a separate audited seam and pass explicit evidence into policy decisions.
