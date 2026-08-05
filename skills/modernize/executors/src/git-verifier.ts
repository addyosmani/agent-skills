// git-verifier.ts — the signature/integrity I/O boundary for the approval gate.
//
// Abstracted behind an interface so the gate's refuse-logic is unit-testable with a
// fake (no repo, no keys, deterministic), while production shells out to real git /
// ssh-keygen. The gate trusts NOTHING stored in the manifest as a fact: it calls
// these live on every transition (approval-verification.md §5).
//
// Security: every invocation passes arguments as an array to spawnSync (shell:false
// by default) — there is no shell string, so a hostile ref cannot inject a command.
// Refs are additionally guarded to a conservative charset before use.

import { spawnSync } from 'node:child_process';
import { GitCommandError } from './approval-errors.js';
import type { ApprovalMethod } from './approval-hash.js';

export interface GitVerifyResult {
  ok: boolean;
  /** Human-readable verifier output (git/ssh-keygen writes signature status to stderr). */
  output: string;
}

export interface GitVerifier {
  /** `git verify-tag` / `git verify-commit`. ok === good signature. */
  verifySignature(method: ApprovalMethod, ref: string): GitVerifyResult;
  /** Object id the ref currently resolves to (annotated/signed tag -> tag-object sha; commit -> commit sha). */
  resolveObject(method: ApprovalMethod, ref: string): string;
  /** The signed object's message text, for extracting the embedded manifest_hash=. */
  signedMessage(method: ApprovalMethod, ref: string): string;
  /** Detached-signature fallback: verify `sigArtifact` over `payload` against an allowlisted key. */
  verifyDetached(sigArtifact: string, payload: string, allowedSignersFile: string, principal: string, namespace: string): GitVerifyResult;
}

const REF_RE = /^[A-Za-z0-9._/-]+$/;
function guardRef(ref: string): void {
  if (!REF_RE.test(ref)) throw new GitCommandError(`unsafe ref/path rejected: ${JSON.stringify(ref)}`);
}

const EMBEDDED_RE = /manifest_hash=(sha256:[a-f0-9]{64})/;
/** Pull the `manifest_hash=sha256:<H>` the human embedded in the signed message. */
export function extractManifestHash(message: string): string | null {
  const m = EMBEDDED_RE.exec(message);
  return m ? m[1] : null;
}

export class ChildProcessGitVerifier implements GitVerifier {
  constructor(private readonly cwd: string, private readonly gitBin: string = 'git') {}

  private run(bin: string, args: string[], input?: string): { status: number; stdout: string; stderr: string } {
    const r = spawnSync(bin, args, { cwd: this.cwd, encoding: 'utf8', input });
    if (r.error) throw new GitCommandError(`failed to run ${bin}: ${r.error.message}`);
    return { status: r.status ?? -1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
  }

  verifySignature(method: ApprovalMethod, ref: string): GitVerifyResult {
    guardRef(ref);
    const sub = method === 'git-signed-commit' ? 'verify-commit' : 'verify-tag';
    const r = this.run(this.gitBin, [sub, ref]);
    return { ok: r.status === 0, output: (r.stderr || r.stdout).trim() };
  }

  resolveObject(method: ApprovalMethod, ref: string): string {
    guardRef(ref);
    const target = method === 'git-signed-tag' ? `refs/tags/${ref}` : ref;
    const r = this.run(this.gitBin, ['rev-parse', '--verify', target]);
    if (r.status !== 0) throw new GitCommandError(`rev-parse failed for ${ref}: ${(r.stderr || '').trim()}`);
    return r.stdout.trim();
  }

  signedMessage(method: ApprovalMethod, ref: string): string {
    guardRef(ref);
    if (method === 'git-signed-commit') {
      const r = this.run(this.gitBin, ['log', '-1', '--format=%B', ref]);
      if (r.status !== 0) throw new GitCommandError(`log failed for ${ref}: ${(r.stderr || '').trim()}`);
      return r.stdout;
    }
    const r = this.run(this.gitBin, ['cat-file', '-p', `refs/tags/${ref}`]);
    if (r.status !== 0) throw new GitCommandError(`cat-file failed for ${ref}: ${(r.stderr || '').trim()}`);
    return r.stdout;
  }

  verifyDetached(sigArtifact: string, payload: string, allowedSignersFile: string, principal: string, namespace: string): GitVerifyResult {
    guardRef(sigArtifact);
    const r = this.run('ssh-keygen', ['-Y', 'verify', '-f', allowedSignersFile, '-I', principal, '-n', namespace, '-s', sigArtifact], payload);
    return { ok: r.status === 0, output: ((r.stderr || '') + (r.stdout || '')).trim() };
  }
}
