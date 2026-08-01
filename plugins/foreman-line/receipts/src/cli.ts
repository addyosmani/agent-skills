/**
 * `receipts validate <path>` — thin wrapper over `validateReceiptDocument` /
 * `validateChain`. Exit-code contract (frozen by this parcel):
 *   0  valid
 *   1  schema or semantic-invariant violation (every violation on stderr)
 *   2  usage error (missing/unreadable path, empty chain directory, bad invocation)
 *
 * Directory semantics (ratified at Step 0): files are sorted ascending by
 * their 6-digit filename sequence prefix — the filename is the sort key, not
 * the payload's `sequence` field. A filename<->payload disagreement is not a
 * distinct CLI-layer error; it surfaces as whatever AC5 violations it causes.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { ReceiptDocument } from './types.js'
import { validateChain, validateReceiptDocument } from './validator.js'

function readJsonFile(path: string): unknown {
  const raw = readFileSync(path, 'utf8')
  return JSON.parse(raw)
}

function reportErrors(errors: readonly string[]): number {
  for (const message of errors) {
    process.stderr.write(`${message}\n`)
  }
  return 1
}

function validateFile(path: string): number {
  let doc: unknown
  try {
    doc = readJsonFile(path)
  } catch (err) {
    process.stderr.write(`error: cannot read '${path}': ${(err as Error).message}\n`)
    return 2
  }
  const result = validateReceiptDocument(doc)
  return result.valid ? 0 : reportErrors(result.errors)
}

function validateDirectory(dirPath: string): number {
  const entries = readdirSync(dirPath)
    .filter((name) => name.endsWith('.json'))
    .sort()

  if (entries.length === 0) {
    process.stderr.write(`error: '${dirPath}' contains no receipt JSON files\n`)
    return 2
  }

  const docs: ReceiptDocument[] = []
  for (const entry of entries) {
    try {
      docs.push(readJsonFile(join(dirPath, entry)) as ReceiptDocument)
    } catch (err) {
      process.stderr.write(`error: cannot read '${entry}': ${(err as Error).message}\n`)
      return 2
    }
  }

  const result = validateChain(docs)
  return result.valid ? 0 : reportErrors(result.errors)
}

function run(argv: readonly string[]): number {
  const [command, path] = argv
  if (command !== 'validate' || path === undefined) {
    process.stderr.write('usage: receipts validate <path>\n')
    return 2
  }

  let isDirectory: boolean
  try {
    isDirectory = statSync(path).isDirectory()
  } catch (err) {
    process.stderr.write(`error: cannot read '${path}': ${(err as Error).message}\n`)
    return 2
  }

  return isDirectory ? validateDirectory(path) : validateFile(path)
}

process.exitCode = run(process.argv.slice(2))
