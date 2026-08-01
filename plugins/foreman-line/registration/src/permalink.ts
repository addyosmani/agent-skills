/**
 * SPEC-CONVENTION §5 SHA-permalink construction (net-new in this parcel).
 * Template (coordinator ruling A):
 * `https://github.com/<owner>/<repo>/blob/<sha>/<posix-spec-path>`, with
 * owner/repo parsed linear-time from `git config --get remote.origin.url`. A
 * repo URL is not a credential (§7). All parsing is index/`split`-based - no
 * regex over untrusted text (lesson #19).
 */

export interface OwnerRepo {
  readonly owner: string
  readonly repo: string
}

/**
 * Parse `owner`/`repo` from a GitHub remote URL - both HTTPS
 * (`https://github.com/OWNER/REPO.git`) and SSH
 * (`git@github.com:OWNER/REPO.git`) forms. Linear-time.
 */
export function parseOwnerRepo(remoteUrl: string): OwnerRepo {
  let s = remoteUrl.trim()
  if (s.endsWith('.git')) {
    s = s.slice(0, s.length - '.git'.length)
  }
  const marker = 'github.com'
  const idx = s.indexOf(marker)
  if (idx === -1) {
    throw new Error(`parseOwnerRepo: not a github.com remote: ${JSON.stringify(remoteUrl)}`)
  }
  let rest = s.slice(idx + marker.length)
  // HTTPS gives a leading '/', SSH gives a leading ':'.
  if (rest.startsWith('/') || rest.startsWith(':')) {
    rest = rest.slice(1)
  }
  const parts = rest.split('/')
  const owner = parts[0]
  const repo = parts[1]
  if (owner === undefined || repo === undefined || owner.length === 0 || repo.length === 0) {
    throw new Error(`parseOwnerRepo: cannot extract owner/repo from ${JSON.stringify(remoteUrl)}`)
  }
  return { owner, repo }
}

/** Build the SHA-pinned permalink to `posixSpecPath` at `sha`. */
export function buildPermalink(ownerRepo: OwnerRepo, sha: string, posixSpecPath: string): string {
  return `https://github.com/${ownerRepo.owner}/${ownerRepo.repo}/blob/${sha}/${posixSpecPath}`
}
