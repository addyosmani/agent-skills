# pcc — Proof-Gated Parcel Compiler CLI

`pcc` is the trust-path binary for the Foreman Line. It compiles parcel plans, seals claims, and verifies receipt chains. This release (`0.1.0-scaffold`) ships the frozen command surface and three utility primitives; all commands exit `2 NOT_IMPLEMENTED`.

## Command surface

| Command | Summary |
|---|---|
| `pcc compile <artifact-path>` | Compile an artifact into a validated parcel plan |
| `pcc answer <plan-id> --file <answers.json>` | Merge clarification answers and recompile |
| `pcc validate <plan-id>` | Run the deterministic validator pipeline (V-01..V-14) |
| `pcc directive <plan-id> <parcel-id>` | Render the implementation directive for a parcel |
| `pcc claim init <parcel-id>` | Scaffold a claim manifest (records author identity + base SHA) |
| `pcc claim seal <parcel-id>` | Hash the evidence tree and freeze the claim manifest |
| `pcc verify <parcel-id>` | Re-derive claim tier from the verification contract (CI only) |
| `pcc receipt verify` | Walk the receipt chain; recompute hashes and check signatures |
| `pcc status <plan-id>` | Fold the receipt chain into per-parcel states |

## Exit-code contract

| Code | Meaning |
|---|---|
| `0` | Success |
| `1` | Validation or verification failure |
| `2` | Usage error, unknown command, or NOT_IMPLEMENTED stub |
| `3` | Trust-invariant violation |
| `4` | Environment error |

In this scaffold only `0` and `2` are reachable.

## Zero-dependency rationale

`pcc` sits in the trust path of every claim and receipt in the Foreman Line. Any third-party runtime dependency is a supply-chain surface that must be trusted unconditionally. Rather than take that risk, `pcc` is built on Node built-ins only (`node:crypto`, `node:child_process`, `node:path`, `node:url`). A test enforces this contract by reading `package.json` and asserting no `dependencies` key is present.

## Packaging status

The `bin` entry in `package.json` points at `./src/cli.ts` directly and is **non-functional** until a packaging parcel ships a build/loader step; `node` cannot execute a `.ts` file with no shebang, so `npm i -g` / `npm link` will not produce a working `pcc` yet.
