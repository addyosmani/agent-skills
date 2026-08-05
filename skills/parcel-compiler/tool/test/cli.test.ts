import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'
import { describe, test } from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { COMMANDS, EXIT, resolveCommand, run } from '../src/cli.js'

const toolRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cliPath = path.join(toolRoot, 'src', 'cli.ts')

// ---------------------------------------------------------------------------
// Subprocess helper (used for smoke tests only)
// ---------------------------------------------------------------------------

const req = createRequire(import.meta.url)
const tsxEsmLoader = pathToFileURL(req.resolve('tsx/esm')).href

function spawnCli(args: string[]): { status: number; stdout: string; stderr: string } {
  const r = spawnSync(process.execPath, ['--import', tsxEsmLoader, cliPath, ...args], {
    cwd: toolRoot,
    encoding: 'utf8',
  })
  return { status: r.status ?? 1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' }
}

// ---------------------------------------------------------------------------
// Router tests (AC8)
// ---------------------------------------------------------------------------

describe('resolveCommand – longest-prefix routing', () => {
  test('two-token: claim init', () => {
    const cmd = resolveCommand(['claim', 'init', 'some-parcel'])
    assert.ok(cmd !== null)
    assert.equal(cmd.key, 'claim init')
  })

  test('two-token: claim seal', () => {
    const cmd = resolveCommand(['claim', 'seal', 'some-parcel'])
    assert.ok(cmd !== null)
    assert.equal(cmd.key, 'claim seal')
  })

  test('two-token: receipt verify', () => {
    const cmd = resolveCommand(['receipt', 'verify'])
    assert.ok(cmd !== null)
    assert.equal(cmd.key, 'receipt verify')
  })

  test('one-token: compile', () => {
    const cmd = resolveCommand(['compile', 'artifact.md'])
    assert.ok(cmd !== null)
    assert.equal(cmd.key, 'compile')
  })

  test('claim alone is not a command → null', () => {
    assert.equal(resolveCommand(['claim']), null)
  })

  test('receipt alone is not a command → null', () => {
    assert.equal(resolveCommand(['receipt']), null)
  })

  test('empty token list → null', () => {
    assert.equal(resolveCommand([]), null)
  })

  test('unknown token → null', () => {
    assert.equal(resolveCommand(['no-such-command']), null)
  })
})

// ---------------------------------------------------------------------------
// run() unit tests – use mock writers to capture output without subprocess
// ---------------------------------------------------------------------------

function capture(argv: string[]): { code: number; out: string; err: string } {
  const out: string[] = []
  const err: string[] = []
  const code = run(
    argv,
    (s) => out.push(s),
    (s) => err.push(s),
  )
  return { code, out: out.join(''), err: err.join('') }
}

describe('bare pcc and --version (AC4)', () => {
  test('bare pcc exits 0', () => {
    assert.equal(capture([]).code, EXIT.SUCCESS)
  })

  test('bare pcc stdout names all 9 commands', () => {
    const { out } = capture([])
    for (const cmd of COMMANDS) {
      assert.ok(out.includes(cmd.key), `usage must mention "${cmd.key}"`)
    }
  })

  test('--version exits 0', () => {
    assert.equal(capture(['--version']).code, EXIT.SUCCESS)
  })

  test('--version stdout matches /^0\\.1\\.0-scaffold/', () => {
    assert.match(capture(['--version']).out, /^0\.1\.0-scaffold/)
  })
})

describe('every declared command (AC5/AC6, closed by construction over COMMANDS)', () => {
  for (const cmd of COMMANDS) {
    const tokens = cmd.key.split(' ')

    test(`${cmd.key}: resolves via resolveCommand`, () => {
      const resolved = resolveCommand([...tokens, 'dummy-arg'])
      assert.ok(resolved !== null, `${cmd.key} must resolve`)
      assert.equal(resolved.key, cmd.key)
    })

    test(`${cmd.key}: dummy arg exits 2 with NOT_IMPLEMENTED + scaffold marker on stderr`, () => {
      const { code, err } = capture([...tokens, 'dummy-arg'])
      assert.equal(code, EXIT.USAGE_ERROR)
      assert.ok(err.includes('NOT_IMPLEMENTED'), `${cmd.key} stderr must include NOT_IMPLEMENTED`)
      assert.ok(err.includes('pcc-scaffold'), `${cmd.key} stderr must include scaffold marker`)
    })

    test(`${cmd.key}: --help exits 0 and prints its usage line`, () => {
      const { code, out } = capture([...tokens, '--help'])
      assert.equal(code, EXIT.SUCCESS)
      assert.ok(out.includes(cmd.usage), `${cmd.key} --help stdout must include "${cmd.usage}"`)
    })
  }
})

describe('unknown commands (AC7)', () => {
  test('unknown command exits 2', () => {
    assert.equal(capture(['no-such-command']).code, EXIT.USAGE_ERROR)
  })

  test('unknown command stderr contains unknown command label', () => {
    assert.ok(capture(['no-such-cmd']).err.includes("unknown command 'no-such-cmd'"))
  })

  test('claim alone exits 2 (prefix that is not a command)', () => {
    assert.equal(capture(['claim']).code, EXIT.USAGE_ERROR)
  })

  test('claim --help exits 2 (help requested on a non-command prefix)', () => {
    assert.equal(capture(['claim', '--help']).code, EXIT.USAGE_ERROR)
  })
})

// ---------------------------------------------------------------------------
// Subprocess smoke tests (ruling 3): assert real process exit codes at the
// process boundary, not via the exported run() function.
// ---------------------------------------------------------------------------

describe('subprocess smoke tests', () => {
  test('bare pcc → process exits 0 and stdout lists commands', () => {
    const r = spawnCli([])
    assert.equal(r.status, 0)
    assert.ok(r.stdout.includes('compile'), 'usage output must mention compile')
  })

  test('pcc compile <path> → process exits 2, NOT_IMPLEMENTED on stderr', () => {
    const r = spawnCli(['compile', 'some-artifact.md'])
    assert.equal(r.status, 2)
    assert.ok(r.stderr.includes('NOT_IMPLEMENTED'))
  })

  test('pcc <unknown> → process exits 2, unknown command on stderr', () => {
    const r = spawnCli(['xyzzy-unknown'])
    assert.equal(r.status, 2)
    assert.ok(r.stderr.includes('unknown command'))
  })
})
