# Approval Verification — the HITL Gate Playbook

The single discovery→implementation gate (Phase II → III/IV) is the load-bearing
wall of this skill. This doc defines the **forgery-resistant approval artifact**
and the **mechanical verification** the gate runs every time. Companion to
`schemas/approval.schema.json` and SKILL.md rule #3.

---

## 1. Why a boolean won't do (threat model)

An autonomous agent running `modernize` has write access to `MANIFEST.yaml`.
If approval were a self-asserted field (`approved: true`), the agent could write
it and walk straight into implementation with no human in the loop — defeating
rule #3 entirely. So approval evidence must be:

1. **Forgery-resistant** — bound to an act only a human's private key can perform
   (a signed git tag/commit). The agent cannot produce a valid signature without
   the key.
2. **Tamper-evident** — bound to the *exact* content approved via a content hash,
   so you cannot approve manifest A and then swap in manifest B.
3. **Re-verified live** — the gate trusts nothing stored in the manifest as a
   fact; it re-runs verification on every transition. There is deliberately no
   `verified` field to trust.

---

## 2. The trust assumption (state it plainly)

This scheme's security holds **iff no allowlisted private signing key is reachable
by the agent's execution environment.** The allowlist (`approval.allowed_signers`)
stops the gate from accepting an arbitrary signature; the *unforgeability* comes
from the human's private key living somewhere the agent cannot use it (hardware
token, the human's laptop, a CI secret the run can't read). If you hand the agent
a signing key on the allowlist, no gate design saves you. Configure accordingly.

---

## 3. What gets hashed — `manifest_hash`

The chicken-and-egg: the `approval` block lives *inside* `MANIFEST.yaml` but
references the hash *of* it. Resolution — hash the manifest with `approval` removed:

```
manifest_hash = "sha256:" + hex( SHA256( canonical_json( manifest WITHOUT `approval` ) ) )
```

`canonical_json` = RFC 8785 (JCS): UTF-8, object keys sorted lexicographically,
no insignificant whitespace, normalized numbers. (Minimum acceptable: sorted-key
compact JSON.) Parse the YAML, delete the `approval` key, canonicalize, hash.

**Transitive binding (close the contract-swap hole):** the manifest MUST record a
content hash per contract entry (`{id, version, hash}`). Because those hashes are
inside the hashed content, editing any approved contract file changes its hash →
`manifest_hash` mismatch → gate refuses. Approving a list of refs without content
hashes would let the agent edit a contract body post-approval — not allowed.

---

## 4. Human approve workflow

```bash
# 1. Compute the approval-excluded canonical hash (skill provides this helper;
#    shown here as intent). Suppose it prints: sha256:<H>
modernize approval-hash contracts/MANIFEST.yaml      # -> sha256:<H>

# 2. Create a SIGNED tag whose message embeds the hash. The signature is the
#    unforgeable part; the embedded hash binds it to this exact manifest.
git tag -s "modernize/approve/<run_id>/<short_H>" \
        -m "modernize approval manifest_hash=sha256:<H>"
git push origin "modernize/approve/<run_id>/<short_H>"

# 3. Record the approval block in MANIFEST.yaml (validate vs approval.schema.json).
```

`approval` block written by the human/tooling (NOT load-bearing — pointers only):

```yaml
approval:
  approver: "clinton.morgan"
  approved_at: "2026-06-08T15:04:05Z"
  manifest_hash: "sha256:<H>"
  method: "git-signed-tag"
  anchor:
    ref: "modernize/approve/<run_id>/<short_H>"
    object: "<tag-object-sha>"
    signing_key_fingerprint: "SHA256:<key-fp>"
```

---

## 5. Gate verification algorithm (the refuse logic)

Run on EVERY attempt to transition Phase II → III/IV. REFUSE (stay in Phase II,
emit the failing check) unless ALL of the following hold:

```
1. PHASE COVERAGE  — Phase I coverage check passed: v_open_nodes is empty for the
                     discovery phase (no dangling pending/started). [from #6]
2. SCHEMA          — MANIFEST.yaml has an `approval` block valid against
                     schemas/approval.schema.json.
3. SIGNATURE       — the anchor object verifies and the signer is allowlisted:
                       git verify-tag    <ref>     # method=git-signed-tag
                       git verify-commit <ref>     # method=git-signed-commit
                     AND anchor.signing_key_fingerprint ∈ approval.allowed_signers.
4. REF INTEGRITY   — the ref resolves to anchor.object (a mutable tag/branch was
                     not repointed after approval).
5. SIGNED HASH     — the manifest_hash embedded in the signed message
                     (manifest_hash=sha256:<H>) == approval.manifest_hash.
6. LIVE HASH       — recompute_hash(manifest WITHOUT approval) == approval.manifest_hash,
                     AND every contract still hashes to its recorded content hash.
```

Any failure → ABORT the transition. Never accept a partial match. Never trust a
stored `verified` flag (there isn't one — re-verify live).

### SSH-signature verification setup
```bash
git config gpg.format ssh
git config gpg.ssh.allowedSignersFile .modernize/allowed_signers   # the allowlist
# allowed_signers line:  clinton.morgan ssh-ed25519 AAAA...
```
GPG path: the signing key must be in the keyring and the gate checks the key id
against `approval.allowed_signers`.

---

## 6. The receipt — `receipts/approval_verification.json`

The gate's decision is itself replayable (ties into #5 / DEFENSIBILITY.md). On a
PASS, write the record; it is evidence, not authority (the gate still re-verifies
on the next transition):

```json
{
  "run_id": "<run_id>",
  "transition": "II->III",
  "decision": "pass",
  "checks": {
    "phase_coverage": "pass",
    "schema": "pass",
    "signature": "pass",
    "ref_integrity": "pass",
    "signed_hash": "pass",
    "live_hash": "pass"
  },
  "approver": "clinton.morgan",
  "signing_key_fingerprint": "SHA256:<key-fp>",
  "anchor": { "ref": "modernize/approve/<run_id>/<short_H>", "object": "<sha>" },
  "manifest_hash": "sha256:<H>",
  "verifier_output": "Good \"git\" signature for clinton.morgan ...",
  "verified_at": "2026-06-08T15:06:00Z"
}
```

On FAIL: write `decision: "refuse"` with the failing check(s) and remain in Phase II.

---

## 7. Fallback — detached signature (no git)

When git signing is unavailable, `method: detached-signature`: the approver signs
the raw `manifest_hash` and the gate verifies the detached signature against the
allowlisted public key.

```bash
# SSH
ssh-keygen -Y sign -f ~/.ssh/id_ed25519 -n modernize manifest.hash   # -> manifest.hash.sig
ssh-keygen -Y verify -f .modernize/allowed_signers -I clinton.morgan \
           -n modernize -s manifest.hash.sig < manifest.hash
# GPG
gpg --detach-sign --armor manifest.hash   # verify: gpg --verify manifest.hash.asc manifest.hash
```

`anchor.ref` points at the `.sig` artifact; checks 3/4 become "detached signature
verifies against an allowlisted key." Everything else is identical. An unsigned
approval is never acceptable.
