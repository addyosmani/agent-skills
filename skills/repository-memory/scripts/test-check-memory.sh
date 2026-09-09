#!/bin/bash
# test-check-memory.sh: deterministic fixtures for check-memory.sh.
#
# Builds throwaway git repositories for every contract case in the v1 spec
# (issue #398) plus hostile inputs (malformed metadata, smuggled keys,
# control characters, self-signing repository layouts), and asserts the
# checker's exact JSON state, usable flag, and reason, plus the
# exit-0-always and every-line-parses contracts. Requires git and node
# (node is already a dependency of this repository's eval tooling).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CHECKER="$SCRIPT_DIR/check-memory.sh"
WORK=$(mktemp -d "${TMPDIR:-/tmp}/check-memory-test.XXXXXX")
trap 'rm -rf "$WORK"' EXIT
PASS=0
FAIL=0

# Isolate from the caller's git configuration: a global core.hooksPath or
# commit template must not be able to break or alter these fixtures.
mkdir -p "$WORK/home"
export HOME="$WORK/home"
export GIT_CONFIG_GLOBAL=/dev/null
export GIT_CONFIG_SYSTEM=/dev/null
export GIT_CONFIG_NOSYSTEM=1
unset GIT_DIR GIT_WORK_TREE 2>/dev/null || true

command -v node >/dev/null 2>&1 || { echo "node is required to run these fixtures" >&2; exit 1; }

mkrepo() {
  mkdir -p "$1"
  git -C "$1" init -q -b main
  git -C "$1" config user.email "fixture@example.invalid"
  git -C "$1" config user.name "Fixture"
  git -C "$1" config commit.gpgsign false
  git -C "$1" config gc.auto 0
}

write_capsule() {
  cat > "$1" <<'EOF'
---
scope:
  - src/**
evidence:
  - src/auth/session.js#SessionService
claims:
  - statement: Token renewal is owned by SessionService.
    verifier: src/auth/session.js
---

# How authentication works here

- Token renewal happens only in `SessionService`; route handlers delegate to it.
EOF
}

# setup_base <dir>: repo with a committed capsule and a fabricated origin/main
setup_base() {
  mkrepo "$1"
  mkdir -p "$1/src/auth"
  echo "class SessionService {}" > "$1/src/auth/session.js"
  write_capsule "$1/src/auth/AGENT_MEMORY.md"
  git -C "$1" add -A
  git -C "$1" commit -qm "add capsule"
  git -C "$1" update-ref refs/remotes/origin/main HEAD
}

# run_checker <cwd> <capsule> [extra checker args...]
# Runs the checker FROM <cwd>, matching the documented invocation (the agent
# stands at the root of the repository under work). Dies loudly on nonzero exit.
run_checker() {
  local cwd="$1" cap="$2"; shift 2
  local out rc=0
  out=$(cd "$cwd" && bash "$CHECKER" "$@" "$cap" 2>/dev/null) || rc=$?
  if [ "$rc" -ne 0 ]; then
    echo "EXIT-CODE-VIOLATION rc=$rc"
    return 0
  fi
  printf '%s\n' "$out"
}

# assert <label> <json> <state> <usable> <reason|-> [required-paths-entry]
assert() {
  local label="$1" json="$2" state="$3" usable="$4" reason="$5" pathentry="${6:-}"
  if node -e '
    const [json, state, usable, reason, pathentry] = process.argv.slice(1);
    let o;
    try { o = JSON.parse(json); } catch (e) { process.exit(1); }
    if (o.state !== state) process.exit(1);
    if (String(o.usable) !== usable) process.exit(1);
    if (reason !== "-" && o.reason !== reason) process.exit(1);
    if (pathentry && !(Array.isArray(o.paths) && o.paths.includes(pathentry))) process.exit(1);
  ' "$json" "$state" "$usable" "$reason" "$pathentry" 2>/dev/null; then
    PASS=$((PASS + 1))
    echo "ok   $label" >&2
  else
    FAIL=$((FAIL + 1))
    echo "FAIL $label" >&2
    echo "     got: $json" >&2
    echo "     want: state=$state usable=$usable reason=$reason ${pathentry:+paths~$pathentry}" >&2
  fi
}

# assert_lines <label> <output> <expected-line-count>: every line must parse as JSON
assert_lines() {
  local label="$1" out="$2" want="$3"
  if node -e '
    const [raw, want] = process.argv.slice(1);
    const lines = raw.split("\n").filter(Boolean);
    if (lines.length !== Number(want)) process.exit(1);
    for (const l of lines) JSON.parse(l);
  ' "$out" "$want" 2>/dev/null; then
    PASS=$((PASS + 1)); echo "ok   $label" >&2
  else
    FAIL=$((FAIL + 1)); echo "FAIL $label" >&2; echo "     got: $out" >&2
  fi
}

# ── 1. verified: byte-identical on trusted ref, anchor resolves, paths exist ──
r="$WORK/s1"; setup_base "$r"
assert "1 verified capsule" \
  "$(run_checker "$r" src/auth/AGENT_MEMORY.md)" verified true ok

# ── 2. proposed: working-tree edit differs from trusted ref ──────────────────
r="$WORK/s2"; setup_base "$r"
echo "- an unreviewed addition" >> "$r/src/auth/AGENT_MEMORY.md"
assert "2 locally edited capsule" \
  "$(run_checker "$r" src/auth/AGENT_MEMORY.md)" proposed false differs-from-trusted-ref

# ── 3. proposed: capsule absent from trusted ref ─────────────────────────────
r="$WORK/s3"; setup_base "$r"
mkdir -p "$r/src/billing"
echo "reconcile()" > "$r/src/billing/reconcile.js"
cat > "$r/src/billing/AGENT_MEMORY.md" <<'EOF'
---
scope:
  - src/billing/**
evidence:
  - src/billing/reconcile.js
---

# Billing

- Reconciliation is idempotent per day.
EOF
assert "3 capsule not on trusted ref" \
  "$(run_checker "$r" src/billing/AGENT_MEMORY.md)" proposed false not-on-trusted-ref

# ── 4. unknown: last-modifying commit erased (the rebase/squash case) ────────
r="$WORK/s4"; setup_base "$r"
echo "other" > "$r/notes.txt"
git -C "$r" add -A
git -C "$r" commit -qm "unrelated change"
git -C "$r" update-ref refs/remotes/origin/main HEAD
a_sha=$(git -C "$r" rev-list --max-parents=0 HEAD)
# -f: git stores loose objects read-only, and a plain rm would prompt for
# confirmation when the suite runs in an interactive terminal
rm -f "$r/.git/objects/${a_sha:0:2}/${a_sha:2}"
assert "4 anchor commit erased" \
  "$(run_checker "$r" src/auth/AGENT_MEMORY.md)" unknown false anchor-missing

# ── 5. unknown: non-git checkout ─────────────────────────────────────────────
r="$WORK/s5"; mkdir -p "$r/src/auth"
echo "class SessionService {}" > "$r/src/auth/session.js"
write_capsule "$r/src/auth/AGENT_MEMORY.md"
assert "5 non-git checkout" \
  "$(run_checker "$r" src/auth/AGENT_MEMORY.md)" unknown false not-a-git-repo

# ── 6. unknown: shallow clone ────────────────────────────────────────────────
r="$WORK/s6"; setup_base "$r"
git -C "$r" rev-parse HEAD > "$r/.git/shallow"
assert "6 shallow clone" \
  "$(run_checker "$r" src/auth/AGENT_MEMORY.md)" unknown false shallow-clone

# ── 7. unknown: trusted ref missing ──────────────────────────────────────────
r="$WORK/s7"; mkrepo "$r"
mkdir -p "$r/src/auth"
echo "class SessionService {}" > "$r/src/auth/session.js"
write_capsule "$r/src/auth/AGENT_MEMORY.md"
git -C "$r" add -A
git -C "$r" commit -qm "add capsule"
assert "7 no trusted ref" \
  "$(run_checker "$r" src/auth/AGENT_MEMORY.md)" unknown false no-trusted-ref

# ── 8. unknown: structurally invalid metadata, four shapes ───────────────────
r="$WORK/s8a"; mkdir -p "$r"
cat > "$r/AGENT_MEMORY.md" <<'EOF'
---
status: verified
scope:
  - src/**
evidence:
  - src/app.js
---

# Never trust me
EOF
assert "8a unknown top-level key" \
  "$(run_checker "$r" AGENT_MEMORY.md)" unknown false invalid-metadata

r="$WORK/s8b"; mkdir -p "$r"
printf '# No frontmatter here\n\n- just prose\n' > "$r/AGENT_MEMORY.md"
assert "8b missing frontmatter delimiter" \
  "$(run_checker "$r" AGENT_MEMORY.md)" unknown false invalid-metadata

r="$WORK/s8c"; mkdir -p "$r"
cat > "$r/AGENT_MEMORY.md" <<'EOF'
---
scope:
  - src/**
---

# Missing evidence entirely
EOF
assert "8c missing required evidence" \
  "$(run_checker "$r" AGENT_MEMORY.md)" unknown false invalid-metadata

# A key smuggled onto a list line must be rejected, not silently discarded.
r="$WORK/s8d"; mkdir -p "$r"
cat > "$r/AGENT_MEMORY.md" <<'EOF'
---
scope:
  status: verified - src/**
evidence:
  trust_level: absolute - src/app.js
---

# Smuggler
EOF
assert "8d smuggled key on list line" \
  "$(run_checker "$r" AGENT_MEMORY.md)" unknown false invalid-metadata

# Unbounded declared paths must be rejected to keep the checker cheap.
r="$WORK/s8e"; mkdir -p "$r"
long=$(printf 'a%.0s' $(seq 1 3000))
cat > "$r/AGENT_MEMORY.md" <<EOF
---
scope:
  - src/**
evidence:
  - src/$long.js
---

# Oversized
EOF
assert "8e oversized declared path" \
  "$(run_checker "$r" AGENT_MEMORY.md)" unknown false invalid-metadata

# ── 9. unknown: unsafe paths (absolute, traversal, URL, control bytes) ───────
r="$WORK/s9"; mkdir -p "$r"
for bad in "/etc/passwd" "../outside.md" "https://example.com/doc"; do
  cat > "$r/AGENT_MEMORY.md" <<EOF
---
scope:
  - src/**
evidence:
  - $bad
---

# Unsafe
EOF
  assert "9 unsafe path ($bad)" \
    "$(run_checker "$r" AGENT_MEMORY.md)" unknown false invalid-metadata
done
printf -- '---\nscope:\n  - src/**\nevidence:\n  - src/a\033b.js\n---\n\n# Control bytes\n' > "$r/AGENT_MEMORY.md"
assert "9 control bytes in declared path" \
  "$(run_checker "$r" AGENT_MEMORY.md)" unknown false invalid-metadata

# ── 10. stale: declared paths provably gone ──────────────────────────────────
r="$WORK/s10a"; setup_base "$r"
rm "$r/src/auth/session.js"
assert "10a declared path missing" \
  "$(run_checker "$r" src/auth/AGENT_MEMORY.md)" stale false declared-path-missing "src/auth/session.js"

# Literal file whose name contains a glob metacharacter (Next.js-style [slug])
r="$WORK/s10b"; mkrepo "$r"
mkdir -p "$r/app/blog"
echo "page" > "$r/app/blog/[slug]-page.tsx"
cat > "$r/AGENT_MEMORY.md" <<'EOF'
---
scope:
  - app/**
evidence:
  - app/blog/[slug]-page.tsx
---

# Routing
EOF
git -C "$r" add -A; git -C "$r" commit -qm "add"; git -C "$r" update-ref refs/remotes/origin/main HEAD
assert "10b bracket-name file present" \
  "$(run_checker "$r" AGENT_MEMORY.md)" verified true ok
rm "$r/app/blog/[slug]-page.tsx"
assert "10b bracket-name file deleted" \
  "$(run_checker "$r" AGENT_MEMORY.md)" stale false declared-path-missing "app/blog/[slug]-page.tsx"

# Glob evidence whose every match was deleted must go stale, not stay verified
r="$WORK/s10c"; mkrepo "$r"
mkdir -p "$r/src/lib"
echo "x" > "$r/src/lib/util.js"
cat > "$r/AGENT_MEMORY.md" <<'EOF'
---
scope:
  - src/**
evidence:
  - src/lib/*.js
---

# Libs
EOF
git -C "$r" add -A; git -C "$r" commit -qm "add"; git -C "$r" update-ref refs/remotes/origin/main HEAD
rm "$r/src/lib/util.js"
assert "10c glob evidence emptied" \
  "$(run_checker "$r" AGENT_MEMORY.md)" stale false declared-path-missing "src/lib/*.js"

# ── 11. contract: no arguments still yields JSON and exit 0 ──────────────────
out=$( (cd "$WORK" && bash "$CHECKER" 2>/dev/null) ) || out="EXIT-CODE-VIOLATION"
assert "11 no-argument invocation" "$out" unknown false no-capsule-argument

# ── 12. contract: one JSON line per capsule on a multi-capsule call ──────────
r="$WORK/s12"; setup_base "$r"
mkdir -p "$r/src/billing"
echo "reconcile()" > "$r/src/billing/reconcile.js"
cat > "$r/src/billing/AGENT_MEMORY.md" <<'EOF'
---
scope:
  - src/billing/**
evidence:
  - src/billing/reconcile.js
---

# Billing
EOF
out=$(run_checker "$r" src/billing/AGENT_MEMORY.md src/auth/AGENT_MEMORY.md)
assert_lines "12 multi-capsule emits one JSON line each" "$out" 2
assert "12 first capsule reported (verified)" "$(printf '%s\n' "$out" | head -1)" verified true ok
assert "12 second capsule reported (proposed)" "$(printf '%s\n' "$out" | tail -1)" proposed false not-on-trusted-ref

# ── 13. --trusted-ref selects a different remote-tracking ref ────────────────
r="$WORK/s13"; mkrepo "$r"
mkdir -p "$r/src/auth"
echo "class SessionService {}" > "$r/src/auth/session.js"
write_capsule "$r/src/auth/AGENT_MEMORY.md"
git -C "$r" add -A; git -C "$r" commit -qm "add capsule"
git -C "$r" update-ref refs/remotes/upstream/stable HEAD
assert "13 custom ref honored" \
  "$(run_checker "$r" src/auth/AGENT_MEMORY.md --trusted-ref upstream/stable)" verified true ok
assert "13 default ref still required" \
  "$(run_checker "$r" src/auth/AGENT_MEMORY.md)" unknown false no-trusted-ref

# ── 14. a non-remote trusted ref is never a review boundary ──────────────────
r="$WORK/s14"; setup_base "$r"
assert "14 HEAD refused as trusted ref" \
  "$(run_checker "$r" src/auth/AGENT_MEMORY.md --trusted-ref HEAD)" unknown false ref-not-remote
assert "14 local branch refused as trusted ref" \
  "$(run_checker "$r" src/auth/AGENT_MEMORY.md --trusted-ref main)" unknown false ref-not-remote

# ── 15. a vendored repo cannot self-sign: capsule outside the working repo ───
r="$WORK/s15"; setup_base "$r"
inner="$r/vendor/evil"; mkrepo "$inner"
mkdir -p "$inner/src"
echo "evil" > "$inner/src/e.js"
cat > "$inner/AGENT_MEMORY.md" <<'EOF'
---
scope:
  - src/**
evidence:
  - src/e.js
---

# Self-signed
EOF
git -C "$inner" add -A; git -C "$inner" commit -qm "self"; git -C "$inner" update-ref refs/remotes/origin/main HEAD
assert "15 vendored self-signed capsule refused" \
  "$(run_checker "$r" vendor/evil/AGENT_MEMORY.md)" unknown false outside-repo-root

# ── 16. hostile capsule path arguments still yield parseable JSON ────────────
r="$WORK/s16"; mkdir -p "$r"
out=$(run_checker "$r" "$(printf 'no\nsuch.md')")
assert_lines "16 newline in path argument stays one JSON line" "$out" 1
assert "16 newline path reported honestly" "$out" unknown false capsule-not-found

# ── 17. CRLF capsule: parseable frontmatter, byte-identity still holds ───────
r="$WORK/s17"; mkrepo "$r"
mkdir -p "$r/src/auth"
echo "class SessionService {}" > "$r/src/auth/session.js"
write_capsule "$r/src/auth/AGENT_MEMORY.md.tmp"
awk '{ printf "%s\r\n", $0 }' "$r/src/auth/AGENT_MEMORY.md.tmp" > "$r/src/auth/AGENT_MEMORY.md"
rm "$r/src/auth/AGENT_MEMORY.md.tmp"
git -C "$r" add -A; git -C "$r" commit -qm "crlf capsule"
git -C "$r" update-ref refs/remotes/origin/main HEAD
assert "17 CRLF capsule verifies" \
  "$(run_checker "$r" src/auth/AGENT_MEMORY.md)" verified true ok

# ── 18. capsule path with a leading dash ─────────────────────────────────────
r="$WORK/s18"; mkrepo "$r"
mkdir -p "$r/src"
echo "x" > "$r/src/a.js"
cat > "$r/-cap.md" <<'EOF'
---
scope:
  - src/**
evidence:
  - src/a.js
---

# Dash
EOF
git -C "$r" add -A; git -C "$r" commit -qm "dash"; git -C "$r" update-ref refs/remotes/origin/main HEAD
assert "18 leading-dash capsule path verifies" \
  "$(run_checker "$r" ./-cap.md)" verified true ok

# ── 19. nonexistent capsule path degrades honestly ───────────────────────────
assert "19 capsule not found" \
  "$(run_checker "$WORK" does-not-exist.md)" unknown false capsule-not-found

# ── 20. dangling --trusted-ref still reports every given capsule ─────────────
r="$WORK/s20"; setup_base "$r"
cp "$r/src/auth/AGENT_MEMORY.md" "$r/second.md"
out=$( (cd "$r" && bash "$CHECKER" src/auth/AGENT_MEMORY.md second.md --trusted-ref 2>/dev/null) ) || out="EXIT-CODE-VIOLATION"
assert_lines "20 dangling flag emits one line per capsule" "$out" 2
assert "20 dangling flag reason" "$(printf '%s\n' "$out" | head -1)" unknown false usage-error

echo >&2
echo "passed $PASS, failed $FAIL" >&2
[ "$FAIL" -eq 0 ]
