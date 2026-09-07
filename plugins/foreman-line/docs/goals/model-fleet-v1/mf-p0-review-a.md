# MF-P0 Independent Review A — Security Boundary

**Reviewer:** `/root/mf_p0_security_review`  
**Date:** 2026-09-03  
**Independence:** fresh read-only review; no builder context, edits, credential inspection, or
provider call  
**Verdict:** `PASS` for the documented `NO-GO`; explicitly not a host-feasibility `GO`

## Findings

1. **HIGH — allowed-root junction bypasses filesystem confinement.** In
   `mf-p0-evidence.md` → Desktop-build comparison, the corrected harness read an outside
   canary through a junction from the allowed root with exit `0`. This violates charter D6
   and creates a realistic disclosure path when combined with working outbound network.
2. **HIGH — worker-command outbound-network denial is ineffective.** In
   `mf-p0-evidence.md` → Desktop-build comparison, sandboxed `curl.exe` received HTTP `200`
   despite `network.enabled=false`. This violates charter D7 and the loop stop conditions.
3. **HIGH — the production Codex runtime cannot start the required confinement boundary.**
   In `mf-p0-evidence.md` → Production-path result, the production runtime returned
   `CreateProcessWithLogonW failed: 5`; therefore no positive confinement control is
   creditable for the proposed worker path.
4. **MEDIUM — the retained OpenRouter profile conflicts with exact permission-profile
   composition.** The overlay's legacy `sandbox_mode` and absence of `-P` on `codex exec`
   prevent the ratified invocation from composing the boundary it claims. The version-pinned
   source excerpt is not embedded in the evidence, so confidence in this supporting finding
   is medium; findings 1–3 independently decide the result.

## Coverage gaps

- The evidence summarizes most canaries rather than preserving a sanitized transcript for
  every command.
- Trusted executable provenance has paths and versions but no signature/hash evidence.
- Egress coverage is HTTP only; DNS, HTTPS, raw sockets, alternate protocols, and proxy
  paths were not tested.
- Junction write, symlink/hard-link variants, races, and other reparse classes were not run.
- Process termination used one `cmd.exe` → `PING.EXE`/`conhost.exe` topology, not detached
  or breakaway descendants.
- The final launcher/schema/skill and provider path were correctly absent and therefore not
  reviewed at MF-P0.

The updated dual-variable canary is sufficient evidence that synthetic parent values under
both required environment-variable names were absent from the model-command environment.
None of the coverage gaps can convert the result to `GO`; under the MF-P0 contract, one
unsupported, ambiguous, or failing required control is sufficient for `NO-GO`.

## Recommendation

MF-P1 must remain stopped. Continue only after separately ratifying a hardened disposable
environment or an overlay/launcher redesign, then rerunning the full confinement suite and
fresh independent review. Do not substitute legacy sandbox labels or prompt-only safety.
