// Issue #181: deterministic review routing. A diff maps to the review
// agents it warrants by configured greps, with zero model tokens. The
// routes below are homelab's .claude/hooks/review-router.sh, ported, so
// these tests double as the parity check against that script.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'

import { reviewConfig, type ReviewConfig } from './review-config.ts'
import { collectDiff, formatRouting, routeReview, type DiffInput } from './review-router.ts'

const HOMELAB: ReviewConfig = reviewConfig({
  ignore: ['.claude/curator/**'],
  routes: [
    {
      agent: 'dependency-auditor',
      why: 'dependency manifest/lockfile changed',
      paths: ['**/build.gradle', '**/build.gradle.kts', '**/libs.versions.toml', '**/package.json', '**/package-lock.json', '**/go.{mod,sum}', '**/Cargo.{toml,lock}'],
    },
    {
      agent: 'silent-failure-hunter',
      why: 'error-handling constructs added/changed',
      added: /\b(catch|except|runCatching|rescue|recover)\b|\.catch\(|orElse|getOrDefault|getOrNull/,
    },
    {
      agent: 'resilience-reviewer',
      why: 'network/retry/offline code or coroutine scope in diff',
      added: /\b(HttpClient|HttpRequest|socket|grpc|retrofit|okhttp|axios|retry|retries|backoff|timeout|withTimeout|reconnect|offline)\b/i,
    },
    {
      agent: 'resilience-reviewer',
      why: 'network/retry/offline code or coroutine scope in diff',
      added: /\b(GlobalScope|CoroutineScope\(|SupervisorJob|runBlocking|Channel\(|callbackFlow)/,
    },
    {
      agent: 'architecture-conformance-reviewer',
      why: 'test doubles added/changed',
      added: /\b(mockk|Mockito|jest\.mock|sinon|unittest\.mock|MagicMock|spyk)\b/,
      lines: 'code',
    },
    {
      agent: 'architecture-conformance-reviewer',
      why: 'third-party imports added in production source',
      added: /^\s*(import |from .+ import |use |require\()/,
      notAdded: /^\s*import (homelab|kotlin|kotlinx\.(coroutines|serialization|datetime|collections)|java\.(util|time|math|text|lang)|javax\.annotation)\./,
    },
    {
      agent: 'agent-skills:security-auditor',
      why: 'auth/crypto/secret handling in diff',
      added: /(password|secrets?|apiKey|api_key|credentials?|bearer|jwt|oauth|cookies?|(access|refresh|auth|id)Token|sessionId)\b|\b(authenticat|authoriz|crypt)|hash\(/i,
    },
  ],
  fallback: ['code-reviewer', 'silent-failure-hunter'],
})

const ROOT = '/repo'
function diff(added: Record<string, string[]>, extraFiles: string[] = []): DiffInput {
  return { files: [...Object.keys(added), ...extraFiles], added, binary: [] }
}
const agentsOf = (input: DiffInput, config = HOMELAB) => routeReview(config, input, ROOT).agents.map((a) => a.agent)

test('should route a manifest change by path alone', () => {
  assert.deepEqual(agentsOf(diff({}, ['services/api/build.gradle.kts'])), ['dependency-auditor'])
})

test('should route error handling added in production code', () => {
  assert.deepEqual(agentsOf(diff({ 'services/api/src/main/A.kt': ['val x = runCatching { f() }'] })), ['silent-failure-hunter'])
})

test('should ignore a content trigger that only appears in a test source set', () => {
  const input = diff({ 'services/api/src/test/ATest.kt': ['try { f() } catch (e: Exception) {}'] })
  assert.deepEqual(agentsOf(input), [])
})

test('should let a lines: "code" route see test sources too', () => {
  const input = diff({ 'services/api/src/test/ATest.kt': ['val repo = mockk<Repo>()'] })
  assert.deepEqual(agentsOf(input), ['architecture-conformance-reviewer'])
})

test('should honour regex flags: case-insensitive and case-sensitive routes', () => {
  assert.deepEqual(agentsOf(diff({ 'a/src/main/A.kt': ['val client = OkHttp()'] })), ['resilience-reviewer'])
  assert.deepEqual(agentsOf(diff({ 'a/src/main/A.kt': ['val s = globalscope'] })), ['code-reviewer', 'silent-failure-hunter'])
  assert.deepEqual(agentsOf(diff({ 'a/src/main/A.kt': ['GlobalScope.launch {}'] })), ['resilience-reviewer'])
})

test('should fire "added and not notAdded" on the same line', () => {
  const own = diff({ 'a/src/main/A.kt': ['import homelab.core.Notes', 'import kotlinx.coroutines.flow.Flow'] })
  assert.deepEqual(agentsOf(own), ['code-reviewer', 'silent-failure-hunter'])
  const thirdParty = diff({ 'a/src/main/A.kt': ['import homelab.core.Notes', 'import io.ktor.client.HttpClient'] })
  assert.deepEqual(agentsOf(thirdParty), ['architecture-conformance-reviewer', 'resilience-reviewer'])
})

test('should list an agent once, gathering every reason, in configured spelling', () => {
  const input = diff({
    'a/src/main/A.kt': ['import io.ktor.Foo'],
    'a/src/test/ATest.kt': ['every { mockk<X>() }'],
  })
  const routing = routeReview(HOMELAB, input, ROOT)
  assert.deepEqual(routing.agents, [
    {
      agent: 'architecture-conformance-reviewer',
      why: ['test doubles added/changed', 'third-party imports added in production source'],
    },
  ])
})

test('should keep a plugin-prefixed agent spelling in the output', () => {
  const input = diff({ 'a/src/main/Auth.kt': ['val refreshToken = load()'] })
  assert.deepEqual(agentsOf(input), ['agent-skills:security-auditor'])
})

test('should fall back to the general reviewers when production code changed and nothing fired', () => {
  assert.deepEqual(agentsOf(diff({ 'a/src/main/A.kt': ['val x = 1'] })), ['code-reviewer', 'silent-failure-hunter'])
})

test('should route nothing for a docs- or config-only diff', () => {
  const input = diff({ 'docs/runbook.md': ['retry the secret rotation'], '.github/workflows/ci.yml': ['timeout-minutes: 10'] })
  assert.deepEqual(agentsOf(input), [])
})

// Homelab bug: YAML/Markdown hit code triggers (timeout-minutes fired resilience).
test('should keep non-code files out of content greps', () => {
  const input = diff({ '.github/workflows/ci.yml': ['timeout-minutes: 10'], 'a/src/main/A.kt': ['val x = 1'] })
  assert.deepEqual(agentsOf(input), ['code-reviewer', 'silent-failure-hunter'])
})

// Homelab bug: stray untracked curator reports triggered routes.
test('should drop ignored paths entirely', () => {
  const input = diff({ '.claude/curator/REPORT-1.md': ['oauth'], '.claude/curator/x.kt': ['runCatching {}'] })
  assert.deepEqual(agentsOf(input), [])
})

test('should keep binary files out of greps and out of the fallback', () => {
  const input: DiffInput = { files: ['ui/goldens/notes.populated.390w.jvm.png'], added: {}, binary: ['ui/goldens/notes.populated.390w.jvm.png'] }
  assert.deepEqual(agentsOf(input), [])
})

test('should add always-agents to every diff that has changes', () => {
  const config = reviewConfig({ ...HOMELAB, always: ['code-reviewer'] })
  assert.deepEqual(agentsOf(diff({ 'a/src/main/A.kt': ['runCatching {}'] }), config), ['code-reviewer', 'silent-failure-hunter'])
  assert.deepEqual(agentsOf(diff({}), config), [])
})

test('should match route paths relative to the review root', () => {
  const config = reviewConfig({ routes: [{ agent: 'ui-reviewer', why: 'ui', paths: ['ui/**'] }] })
  const input = diff({}, ['app/ui/Screen.kt'])
  assert.deepEqual(routeReview({ ...config, root: 'app' }, input, ROOT).agents.map((a) => a.agent), ['ui-reviewer'])
  assert.deepEqual(routeReview(config, input, ROOT).agents.map((a) => a.agent), [])
})

test('should format text output as agent|why lines', () => {
  const routing = routeReview(HOMELAB, diff({ 'a/src/main/A.kt': ['runCatching {}', 'import io.x.Y'] }), ROOT)
  assert.equal(
    formatRouting(routing, 'text'),
    'architecture-conformance-reviewer|third-party imports added in production source\n' +
      'silent-failure-hunter|error-handling constructs added/changed\n',
  )
})

// --- collecting the diff from git -------------------------------------------

function repo(t: { after(fn: () => void): void }) {
  const dir = mkdtempSync(join(tmpdir(), 'review-router-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const git = (...args: string[]) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim()
  const write = (file: string, content: string | Buffer) => {
    mkdirSync(join(dir, dirname(file)), { recursive: true })
    writeFileSync(join(dir, file), content)
  }
  git('init', '-q', '-b', 'main')
  git('config', 'user.email', 't@example.com')
  git('config', 'user.name', 't')
  write('README.md', 'x\n')
  write('a/src/main/A.kt', 'val keep = 1\n')
  git('add', '.')
  git('commit', '-q', '-m', 'init')
  return { dir, git, write }
}

test('should collect added lines, not diff headers, from committed, staged and unstaged changes', (t) => {
  const { dir, git, write } = repo(t)
  const base = git('rev-parse', 'HEAD')
  write('a/src/main/RetryPolicy.kt', 'val x = 1\n')
  git('add', '.')
  git('commit', '-q', '-m', 'add')
  write('a/src/main/A.kt', 'val keep = 1\nval staged = 2\n')
  git('add', 'a/src/main/A.kt')
  write('a/src/main/A.kt', 'val keep = 1\nval staged = 2\nval unstaged = 3\n')
  const input = collectDiff(dir, { base })
  assert.deepEqual(input.files.sort(), ['a/src/main/A.kt', 'a/src/main/RetryPolicy.kt'])
  assert.deepEqual(input.added['a/src/main/RetryPolicy.kt'], ['val x = 1'])
  assert.ok(input.added['a/src/main/A.kt']!.includes('val unstaged = 3'))
  assert.ok(!Object.values(input.added).flat().some((line) => line.includes('RetryPolicy')), 'header leaked')
})

test('should read untracked text files in full and skip untracked binaries', (t) => {
  const { dir, git, write } = repo(t)
  write('a/src/main/New.kt', 'val a = runCatching { 1 }\n')
  write('ui/goldens/x.png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 1, 2]))
  write('ignored/out.kt', 'x\n')
  write('.gitignore', 'ignored/\n')
  const input = collectDiff(dir, { base: git('rev-parse', 'HEAD') })
  assert.deepEqual(input.added['a/src/main/New.kt'], ['val a = runCatching { 1 }'])
  assert.ok(input.binary.includes('ui/goldens/x.png'))
  assert.ok(!input.files.includes('ignored/out.kt'))
})

test('should leave untracked files out when includeUntracked is false', (t) => {
  const { dir, git, write } = repo(t)
  write('a/src/main/New.kt', 'x\n')
  assert.deepEqual(collectDiff(dir, { base: git('rev-parse', 'HEAD'), includeUntracked: false }).files, [])
})

test('should mark tracked binary changes as binary', (t) => {
  const { dir, git, write } = repo(t)
  const base = git('rev-parse', 'HEAD')
  write('ui/goldens/y.png', Buffer.from([0x89, 0, 0, 1]))
  git('add', '.')
  git('commit', '-q', '-m', 'golden')
  assert.ok(collectDiff(dir, { base }).binary.includes('ui/goldens/y.png'))
})

test('should collect a committed range only, between two commits', (t) => {
  const { dir, git, write } = repo(t)
  const from = git('rev-parse', 'HEAD')
  write('a/src/main/B.kt', 'val b = getOrNull()\n')
  git('add', '.')
  git('commit', '-q', '-m', 'b')
  const to = git('rev-parse', 'HEAD')
  write('a/src/main/C.kt', 'untracked\n')
  const input = collectDiff(dir, { base: from, head: to })
  assert.deepEqual(input.files, ['a/src/main/B.kt'])
  assert.deepEqual(input.added['a/src/main/B.kt'], ['val b = getOrNull()'])
})

// --- #181 part 2: obligations a diff incurs ---------------------------------

const THIN = {
  glob: '!ui/web/src/commonMain/**/*Screen.kt',
  id: 'thin-rendering',
  reviewWith: 'agent-skills:code-reviewer',
  check: 'no branching on domain state',
  reason: 'screens are thin rendering; logic is unit-tested in the view model',
}

test('should list an obligation the diff incurs, with its files, and route its reviewer', () => {
  const input = diff({ 'ui/web/src/commonMain/notes/NotesScreen.kt': ['Text(state.title)'] })
  const routing = routeReview(HOMELAB, input, ROOT, [THIN])
  assert.deepEqual(routing.obligations, [
    { id: 'thin-rendering', reviewWith: 'agent-skills:code-reviewer', check: 'no branching on domain state', reason: THIN.reason, files: ['ui/web/src/commonMain/notes/NotesScreen.kt'] },
  ])
  assert.deepEqual(
    routing.agents.find((a) => a.agent === 'code-reviewer'),
    { agent: 'code-reviewer', why: ['no specific trigger; default pass for source changes', 'obligation thin-rendering: no branching on domain state'] },
  )
})

test('should not let an obligation suppress the fallback, nor duplicate its reviewer', () => {
  const input = diff({ 'ui/web/src/commonMain/notes/NotesScreen.kt': ['Text(state.title)'] })
  const agents = routeReview(HOMELAB, input, ROOT, [THIN]).agents.map((a) => a.agent)
  // fallback code-reviewer and the obligation's agent-skills:code-reviewer are one persona
  assert.deepEqual(agents, ['code-reviewer', 'silent-failure-hunter'])
})

test('should incur nothing when no changed file matches the exemption', () => {
  const routing = routeReview(HOMELAB, diff({ 'ui/web/src/commonMain/notes/NotesViewModel.kt': ['val x = 1'] }), ROOT, [THIN])
  assert.deepEqual(routing.obligations, [])
})

test('should print obligations in text output as extra agent lines', () => {
  const routing = routeReview(reviewConfig({}), diff({ 'ui/web/src/commonMain/A/AScreen.kt': ['x'] }), ROOT, [THIN])
  assert.equal(formatRouting(routing, 'text'), 'agent-skills:code-reviewer|obligation thin-rendering: no branching on domain state\n')
})
