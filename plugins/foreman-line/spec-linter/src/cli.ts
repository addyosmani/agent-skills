/**
 * `spec-linter validate [--no-permission-profile-warning] <path>`
 *
 * Exit-code contract (frozen by this parcel, no CI wiring):
 *   0  all specs valid (advisory warnings do not affect exit code)
 *   1  at least one schema or semantic-invariant violation (every violation on stderr)
 *   2  usage error: missing/unreadable path, bad invocation, or directory with no .md files
 *
 * Advisory warnings (stderr, exit 0 unchanged):
 *   - permission_profile absent in a spec
 *   - surfaces entry does not begin with a known SPEC-CONVENTION §4 vocabulary prefix
 *
 * --no-permission-profile-warning  fully suppresses the absent-permission-profile advisory
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { parseFrontmatter, validateSpecFrontmatter } from './validate.js'

/** Recursively collects every .md file under `dir`. */
function collectMdFiles(dir: string): string[] {
  const results: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...collectMdFiles(fullPath))
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(fullPath)
    }
  }
  return results
}

/**
 * Validates a single .md file.
 * Returns exit code 0 (valid), 1 (violation), or 2 (IO error).
 * Writes all errors and warnings to stderr prefixed with the file path.
 */
function validateFile(filePath: string, noPermissionProfileWarning: boolean): number {
  let content: string
  try {
    content = readFileSync(filePath, 'utf8')
  } catch (err) {
    process.stderr.write(`error: cannot read '${filePath}': ${(err as Error).message}\n`)
    return 2
  }

  const doc = parseFrontmatter(content)
  if (doc === null) {
    process.stderr.write(`${filePath}: error: no valid YAML frontmatter found\n`)
    return 1
  }

  const result = validateSpecFrontmatter(doc, {
    noPermissionProfileWarning,
    basename: basename(filePath),
    // Grandfather waivers are scoped to files whose parent directory is
    // `done` (CLOSE-P2 rework R1a) — validation checks this signal.
    parentDirName: basename(dirname(filePath)),
  })

  for (const warning of result.warnings) {
    process.stderr.write(`${filePath}: ${warning}\n`)
  }
  if (!result.valid) {
    for (const error of result.errors) {
      process.stderr.write(`${filePath}: ${error}\n`)
    }
    return 1
  }
  return 0
}

function run(argv: readonly string[]): number {
  const noPermissionProfileWarning = argv.includes('--no-permission-profile-warning')
  const filtered = argv.filter((a) => a !== '--no-permission-profile-warning')
  const [command, targetPath] = filtered

  if (command !== 'validate' || targetPath === undefined) {
    process.stderr.write('usage: spec-linter validate [--no-permission-profile-warning] <path>\n')
    return 2
  }

  let isDirectory: boolean
  try {
    isDirectory = statSync(targetPath).isDirectory()
  } catch (err) {
    process.stderr.write(`error: cannot access '${targetPath}': ${(err as Error).message}\n`)
    return 2
  }

  if (!isDirectory) {
    return validateFile(targetPath, noPermissionProfileWarning)
  }

  // Directory mode: collect all .md files recursively
  let mdFiles: string[]
  try {
    mdFiles = collectMdFiles(targetPath)
  } catch (err) {
    process.stderr.write(
      `error: cannot read directory '${targetPath}': ${(err as Error).message}\n`,
    )
    return 2
  }

  if (mdFiles.length === 0) {
    process.stderr.write(`error: '${targetPath}' contains no .md files\n`)
    return 2
  }

  let anyViolations = false
  for (const file of mdFiles.sort()) {
    const code = validateFile(file, noPermissionProfileWarning)
    if (code === 1) anyViolations = true
    if (code === 2) return 2
  }
  return anyViolations ? 1 : 0
}

process.exitCode = run(process.argv.slice(2))
