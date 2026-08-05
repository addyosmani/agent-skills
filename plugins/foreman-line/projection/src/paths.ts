/**
 * Repo root, resolved from this module's location: src -> projection ->
 * foreman-line -> plugins -> root. Mirrors the shipped `shaping` package's
 * `DEFAULT_REPO_ROOT` derivation (same directory depth).
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
