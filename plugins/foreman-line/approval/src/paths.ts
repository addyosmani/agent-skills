/**
 * Repo root, resolved from this module's location: src -> approval ->
 * foreman-line -> plugins -> root. Mirrors the shipped `shaping`/`projection`
 * packages' `DEFAULT_REPO_ROOT` derivation (same directory depth).
 */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const DEFAULT_REPO_ROOT: string = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '..',
)

/** Repo-relative POSIX path of the parcel specs' `active/` directory. */
export const ACTIVE_SPECS_DIR = 'plugins/foreman-line/docs/specs/active'
