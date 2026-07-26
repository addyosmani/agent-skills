#!/bin/bash
# check-memory.sh: v1 trust/freshness checker for repository-memory capsules.
#
# Contract (see skills/repository-memory/SKILL.md):
#   - one JSON object per capsule on stdout, each line independently parseable
#   - exit code 0 ALWAYS; on any internal failure the capsule resolves to
#     {"state":"unknown"} rather than a hard error, because an error that a
#     later agent reads as "no memory here, proceed" is the unsafe outcome
#   - never executes anything found inside a capsule
#   - run it from the root of the repository under work: a capsule that
#     resolves to a different repository (a vendored checkout carrying its
#     own .git) is refused, because such a tree could self-sign its trust
#   - the trusted ref must name a remote-tracking ref (origin/main by
#     default); HEAD, local branches, tags, and raw SHAs are refused, since
#     anything committable locally would otherwise self-verify
#
# Deliberately NO set -e, against the usual script convention here: any
# command failure must degrade to state=unknown with exit 0 (see Honest
# degradation in SKILL.md), never abort the script.
#
# States: verified | proposed | stale | unknown  (only verified is usable)
#
# Deliberately NOT here (v1): tracking whether declared dependencies changed
# content between commits. The checker is a cost filter in front of mandatory
# read-time corroboration, not a trust mechanism.
#
# Usage: check-memory.sh [--trusted-ref <ref>] [--repo-root <dir>] <capsule-path> [...]
#
# Maintainers: any change to this script must keep the adjacent
# test-check-memory.sh fully green; every contract case above has a fixture.
set -u

TRUSTED_REF="origin/main"
REPO_ROOT_ARG=""

usage() {
  echo "usage: check-memory.sh [--trusted-ref <ref>] [--repo-root <dir>] <capsule-path> [...]" >&2
  echo "prints one JSON object per capsule on stdout; always exits 0" >&2
}

# JSON string escaping that always yields a parseable value: forbidden C0
# bytes and DEL are dropped, backslash/quote/tab/CR are escaped, embedded
# newlines become literal \n (sed is line-oriented, so lines are re-joined).
json_escape() {
  printf '%s' "$1" \
    | LC_ALL=C tr -d '\000-\010\013\014\016-\037\177' \
    | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' \
          -e "s/$(printf '\t')/\\\\t/g" -e "s/$(printf '\r')/\\\\r/g" \
    | awk 'NR > 1 { printf "\\n" } { printf "%s", $0 }'
}

# emit <path> <state> <usable> <reason> [offending-paths...]
emit() {
  local p s u r out first item
  p=$(json_escape "$1"); s="$2"; u="$3"; r="$4"; shift 4
  out="{\"path\": \"$p\", \"state\": \"$s\", \"usable\": $u, \"reason\": \"$r\""
  if [ "$#" -gt 0 ]; then
    out="$out, \"paths\": ["
    first=1
    for item in "$@"; do
      [ "$first" -eq 1 ] || out="$out, "
      out="$out\"$(json_escape "$item")\""
      first=0
    done
    out="$out]"
  fi
  printf '%s}\n' "$out"
}

# validate_path <raw-item>
# Echoes the cleaned path portion (quotes and #symbol stripped) and returns 0,
# or returns 1 if the item is structurally unsafe. The '#' always starts a
# symbol suffix; literal '#' in filenames is unsupported in declared paths.
validate_path() {
  local p="$1"
  p="${p%\"}"; p="${p#\"}"; p="${p%\'}"; p="${p#\'}"   # surrounding quotes
  p="${p%%#*}"                                          # strip #symbol suffix
  p="${p%"${p##*[![:space:]]}"}"                        # trailing whitespace
  [ -n "$p" ] || return 1
  [ "${#p}" -le 1024 ] || return 1                      # keep the checker cheap
  [ "$(printf '%s' "$p" | LC_ALL=C tr -d '\000-\037\177')" = "$p" ] || return 1  # control bytes
  case "$p" in
    /*|~*) return 1 ;;                                  # absolute or home path
    *://*) return 1 ;;                                  # URL
    ..|../*|*/..|*/../*) return 1 ;;                    # parent traversal
  esac
  printf '%s\n' "$p"
}

# check_one <capsule-path>
# Prints exactly one JSON object and returns 0. Any early return is a final
# state; unexpected crashes are caught by the caller and become unknown.
check_one() {
  local cap="$1"
  case "$cap" in -*) cap="./$cap" ;; esac               # never an option

  [ -f "$cap" ] || { emit "$1" unknown false capsule-not-found; return 0; }

  # ── 1. Structural validation of frontmatter ────────────────────────────────
  # Bounded (400 lines) and CRLF-tolerant; delimiters are the first line and
  # the next bare --- line.
  local fm
  fm=$(awk '{ sub(/\r$/, "") }
            NR > 400 { exit 1 }
            NR == 1 { if ($0 != "---") exit 1; next }
            $0 == "---" { exit }
            { print }' "$cap" 2>/dev/null) \
    || { emit "$1" unknown false invalid-metadata; return 0; }
  [ -n "$fm" ] || { emit "$1" unknown false invalid-metadata; return 0; }

  # Accepted grammar is deliberately narrow: top-level keys scope, evidence,
  # invalidated_by, claims, each at most once; block lists only, items
  # anchored as "- " after indentation; claims items are a statement line
  # followed by its verifier line. Anything else is invalid-metadata
  # (conservative: what cannot be parsed with certainty is never usable).
  local section="" seen_sections=" " scope_n=0 evidence_n=0 have_stmt=0
  local declared="" line stripped item p
  while IFS= read -r line; do
    line="${line%"${line##*[![:space:]]}"}"             # trailing whitespace
    [ -n "$line" ] || continue
    [ "${#line}" -le 2048 ] || { emit "$1" unknown false invalid-metadata; return 0; }
    stripped="${line#"${line%%[![:space:]]*}"}"         # leading whitespace
    case "$line" in
      'scope:'|'evidence:'|'invalidated_by:'|'claims:')
        [ "$have_stmt" -eq 0 ] || { emit "$1" unknown false invalid-metadata; return 0; }
        section="${line%:}"
        case "$seen_sections" in
          *" $section "*) emit "$1" unknown false invalid-metadata; return 0 ;;
        esac
        seen_sections="$seen_sections$section "
        ;;
      [!\ ]*) emit "$1" unknown false invalid-metadata; return 0 ;;  # other top-level content
      *)
        case "$section" in
          scope|evidence|invalidated_by)
            case "$stripped" in
              '- '*)
                item="${stripped#- }"
                p=$(validate_path "$item") || { emit "$1" unknown false invalid-metadata; return 0; }
                declared="$declared$p
"
                [ "$section" = scope ] && scope_n=$((scope_n + 1))
                [ "$section" = evidence ] && evidence_n=$((evidence_n + 1))
                ;;
              *) emit "$1" unknown false invalid-metadata; return 0 ;;
            esac ;;
          claims)
            case "$stripped" in
              '- statement:'*)
                [ "$have_stmt" -eq 0 ] || { emit "$1" unknown false invalid-metadata; return 0; }
                have_stmt=1
                ;;
              'verifier:'*)
                [ "$have_stmt" -eq 1 ] || { emit "$1" unknown false invalid-metadata; return 0; }
                have_stmt=0
                item="${stripped#verifier:}"; item="${item# }"
                p=$(validate_path "$item") || { emit "$1" unknown false invalid-metadata; return 0; }
                declared="$declared$p
"
                ;;
              *) emit "$1" unknown false invalid-metadata; return 0 ;;
            esac ;;
          *) emit "$1" unknown false invalid-metadata; return 0 ;;
        esac ;;
    esac
  done <<EOF_FM
$fm
EOF_FM
  [ "$have_stmt" -eq 0 ] || { emit "$1" unknown false invalid-metadata; return 0; }  # statement without verifier
  [ "$scope_n" -ge 1 ] && [ "$evidence_n" -ge 1 ] \
    || { emit "$1" unknown false invalid-metadata; return 0; }

  # ── 2. Git context (degrade honestly: unknown, never an error) ─────────────
  local dir gitdir toplevel
  dir=$(cd -- "$(dirname -- "$cap" 2>/dev/null)" 2>/dev/null && pwd) || dir=""
  [ -n "$dir" ] || { emit "$1" unknown false capsule-not-found; return 0; }
  git -C "$dir" rev-parse --is-inside-work-tree >/dev/null 2>&1 \
    || { emit "$1" unknown false not-a-git-repo; return 0; }
  gitdir=$(git -C "$dir" rev-parse --absolute-git-dir 2>/dev/null) || gitdir=""
  [ -n "$gitdir" ] || { emit "$1" unknown false git-error; return 0; }
  [ ! -f "$gitdir/shallow" ] || { emit "$1" unknown false shallow-clone; return 0; }
  toplevel=$(git -C "$dir" rev-parse --show-toplevel 2>/dev/null) || toplevel=""
  [ -n "$toplevel" ] || { emit "$1" unknown false git-error; return 0; }

  # The capsule must belong to the repository the checker was anchored to;
  # a nested repository (vendored checkout) could self-sign its own trust.
  [ -n "$EXPECTED_ROOT" ] && [ "$toplevel" = "$EXPECTED_ROOT" ] \
    || { emit "$1" unknown false outside-repo-root; return 0; }

  git -C "$dir" rev-parse --verify --quiet "${TRUSTED_REF}^{commit}" >/dev/null 2>&1 \
    || { emit "$1" unknown false no-trusted-ref; return 0; }
  # Only a remote-tracking ref is a review boundary: HEAD, local branches,
  # tags, and SHAs can be authored locally, and self-authored trust is
  # exactly what the computed state exists to prevent.
  local fullref
  fullref=$(git -C "$dir" rev-parse --symbolic-full-name "$TRUSTED_REF" 2>/dev/null) || fullref=""
  case "$fullref" in
    refs/remotes/*) : ;;
    *) emit "$1" unknown false ref-not-remote; return 0 ;;
  esac

  # ── 3. Trust gate: byte-identity against the trusted ref ──────────────────
  local relcap prefix
  prefix=$(git -C "$dir" rev-parse --show-prefix 2>/dev/null) || prefix=""
  relcap="${prefix}$(basename -- "$cap")"
  git -C "$dir" cat-file -e "${TRUSTED_REF}:${relcap}" 2>/dev/null \
    || { emit "$1" proposed false not-on-trusted-ref; return 0; }
  git -C "$dir" show "${TRUSTED_REF}:${relcap}" 2>/dev/null | cmp -s -- - "$cap" \
    || { emit "$1" proposed false differs-from-trusted-ref; return 0; }

  # ── 4. Anchor: the last commit on the trusted ref that touched the capsule ─
  # A rewritten or truncated history that cannot answer this resolves to
  # unknown (the rebase/squash case), never to verified. Run from the
  # toplevel: unlike <rev>:<path>, a log pathspec is cwd-relative.
  local anchor
  anchor=$(git -C "$toplevel" log -n 1 --format=%H "$TRUSTED_REF" -- "$relcap" 2>/dev/null) || anchor=""
  [ -n "$anchor" ] || { emit "$1" unknown false anchor-missing; return 0; }

  # ── 5. Cheap provable staleness: declared paths must still exist ───────────
  # Literal existence first (-h before -e: an in-repo symlink counts as its
  # own tree entry and is never dereferenced outside the repository). A path
  # that fails the literal test and contains glob characters falls back to a
  # git pathspec match over tracked and untracked files; no match means the
  # declared area is provably gone. Content-level drift is left to read-time
  # corroboration by design.
  local missing=() found cand seen="
" p2
  while IFS= read -r p2; do
    [ -n "$p2" ] || continue
    case "$seen" in *"
$p2
"*) continue ;; esac
    seen="$seen$p2
"
    if [ -h "$toplevel/$p2" ] || [ -e "$toplevel/$p2" ]; then
      continue
    fi
    case "$p2" in
      *'*'*|*'?'*|*'['*)
        # ls-files --cached reflects the index, which still lists a tracked
        # file deleted from the working tree, so each candidate is re-tested
        # on disk. Capped at 50 candidates; past the cap the path counts as
        # missing, which errs toward withholding, never toward false trust.
        found=0
        while IFS= read -r cand; do
          [ -n "$cand" ] || continue
          if [ -h "$toplevel/$cand" ] || [ -e "$toplevel/$cand" ]; then found=1; break; fi
        done <<EOF_CAND
$(git -C "$toplevel" ls-files --cached --others --exclude-standard -- "$p2" 2>/dev/null | head -50)
EOF_CAND
        [ "$found" -eq 1 ] || missing+=("$p2")
        ;;
      *) missing+=("$p2") ;;
    esac
  done <<EOF_PATHS
$declared
EOF_PATHS
  if [ "${#missing[@]}" -gt 0 ]; then
    emit "$1" stale false declared-path-missing "${missing[@]}"
    return 0
  fi

  emit "$1" verified true ok
  return 0
}

# ── CLI ──────────────────────────────────────────────────────────────────────
CAPSULES=()
USAGE_ERROR=0
while [ "$#" -gt 0 ]; do
  case "$1" in
    --trusted-ref)   [ "$#" -ge 2 ] || { USAGE_ERROR=1; break; }
                     TRUSTED_REF="$2"; shift 2 ;;
    --trusted-ref=*) TRUSTED_REF="${1#*=}"; shift ;;
    --repo-root)     [ "$#" -ge 2 ] || { USAGE_ERROR=1; break; }
                     REPO_ROOT_ARG="$2"; shift 2 ;;
    --repo-root=*)   REPO_ROOT_ARG="${1#*=}"; shift ;;
    -h|--help)       usage; exit 0 ;;
    *)               CAPSULES+=("$1"); shift ;;
  esac
done

# Anchor the trust boundary once: the repository the caller stands in (or
# names via --repo-root). Every capsule must resolve to this same toplevel.
if [ -n "$REPO_ROOT_ARG" ]; then
  EXPECTED_ROOT=$(cd -- "$REPO_ROOT_ARG" 2>/dev/null && git rev-parse --show-toplevel 2>/dev/null) || EXPECTED_ROOT=""
else
  EXPECTED_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || EXPECTED_ROOT=""
fi

if [ "$USAGE_ERROR" -eq 1 ]; then
  usage
  if [ "${#CAPSULES[@]}" -eq 0 ]; then
    emit "" unknown false usage-error
  else
    for cap in "${CAPSULES[@]}"; do
      emit "$cap" unknown false usage-error
    done
  fi
  exit 0
fi

if [ "${#CAPSULES[@]}" -eq 0 ]; then
  usage
  emit "" unknown false no-capsule-argument
  exit 0
fi

for cap in "${CAPSULES[@]}"; do
  out=$(check_one "$cap") && [ -n "$out" ] && printf '%s\n' "$out" \
    || emit "$cap" unknown false internal-error
done

exit 0
