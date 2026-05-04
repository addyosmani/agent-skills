#!/usr/bin/env bash
# setup-code-graph.sh — bootstrap the codebase-memory-mcp code-knowledge-graph engine.
#
# Operator-side: this script is invoked by the operator (or by
# batuta-project-hygiene mode=project-init|project-retrofit). It is NEVER
# invoked from inside a Claude tool call. Therefore it does not pass through the
# delegation-guard.sh PreToolUse hook and may freely write to the operator's PATH
# and to ~/.claude.json (via `claude mcp add`). It MUST NOT touch
# .claude/settings.json — that path is reserved for the v2.7 kill-switch.
#
# Idempotent: re-running is safe and quick.
#
# History: v2.8–v3.7 also bootstrapped graphify (multimodal CLI). v4.0
# deprecated graphify (Windows-broken, bus factor 1) — see ADR-0013. The
# state file keeps a `graphify` key marked DEPRECATED for backward compat
# with older check-code-graph-engines.sh callers.
#
# Source: https://github.com/DeusData/codebase-memory-mcp (verified 2026-04-29, codebase-memory-mcp@0.6.0)
# Source: https://code.claude.com/docs/en/mcp (verified 2026-04-29, claude mcp add semantics)

# NOTE on `set -uo pipefail` (no `-e`): this is a status-tracking installer that
# intentionally continues past partial failures so the operator gets a coherent
# state file regardless of which step failed.
set -uo pipefail

if (( BASH_VERSINFO[0] < 4 )); then
  echo "ERROR: this script requires bash >= 4 (current: $BASH_VERSION)." >&2
  echo "  macOS users: brew install bash; then invoke as /opt/homebrew/bin/bash $0" >&2
  exit 5
fi

# ---------- platform detection ----------
OS="$(uname -s 2>/dev/null || echo unknown)"
IS_WINDOWS=false
[[ "$OS" == MINGW* || "$OS" == MSYS* || "$OS" == CYGWIN* ]] && IS_WINDOWS=true

# ---------- flags ----------
UPGRADE=false
SKIP_CBM=false
for arg in "$@"; do
  case "$arg" in
    --upgrade)        UPGRADE=true ;;
    --skip-cbm)       SKIP_CBM=true ;;
    -h|--help)
      sed -n '2,18p' "$0"
      exit 0 ;;
    *)
      echo "Usage: $0 [--upgrade] [--skip-cbm]" >&2
      exit 1 ;;
  esac
done

# ---------- pinned versions (v2.9 hardening, M1 from GATE 3 audit) ----------
# codebase-memory-mcp: full release-asset pin + SHA-256 verification against
# the release's checksums.txt. The release tag below points at an immutable
# GitHub Release; the binary is downloaded directly (skipping install.sh, which
# is not a release asset and lives on a mutable branch).
# Source: https://github.com/DeusData/codebase-memory-mcp/releases/tag/v0.6.0 (verified 2026-04-29)
CBM_PIN_TAG="v0.6.0"

# ---------- state ----------
STATE_DIR="$HOME/.claude"
STATE_FILE="$STATE_DIR/code-graph-engines.json"
mkdir -p "$STATE_DIR"

CBM_STATUS="MISSING"
CBM_VERSION=""
CBM_BINARY=""

# ---------- helpers ----------
have() { command -v "$1" >/dev/null 2>&1; }

log()  { printf "  %s\n" "$1"; }
warn() { printf "  WARN: %s\n" "$1" >&2; }
err()  { printf "  ERROR: %s\n" "$1" >&2; }

semver_ge() {
  # semver_ge "0.6.0" "0.6.0" → true ; "0.5.9" "0.6.0" → false
  # Crude but enough for x.y.z. Strips leading 'v' and any non-numeric suffix.
  local a b
  a="${1#v}"; b="${2#v}"
  a="${a%%[!0-9.]*}"; b="${b%%[!0-9.]*}"
  printf '%s\n%s\n' "$b" "$a" | sort -V -C
}

# Map (uname -s, uname -m) to the codebase-memory-mcp release-asset platform
# tag. Returns empty string on unsupported platforms.
detect_platform_tag() {
  local os arch
  case "$(uname -s 2>/dev/null)" in
    Linux*)                 os="linux" ;;
    Darwin*)                os="darwin" ;;
    MINGW*|MSYS*|CYGWIN*)   os="windows" ;;
    *) return ;;
  esac
  case "$(uname -m 2>/dev/null)" in
    x86_64|amd64)           arch="amd64" ;;
    aarch64|arm64)          arch="arm64" ;;
    *) return ;;
  esac
  # Windows release ships only amd64.
  if [[ "$os" == "windows" && "$arch" != "amd64" ]]; then
    return
  fi
  echo "${os}-${arch}"
}

# Compute SHA-256 of a file using whichever tool is available. Returns the hex
# digest on stdout. Empty stdout on failure.
sha256_of() {
  local f="$1"
  if   have sha256sum;  then sha256sum "$f" | awk '{print $1}'
  elif have shasum;     then shasum -a 256 "$f" | awk '{print $1}'
  elif have certutil;   then certutil -hashfile "$f" SHA256 | awk 'NR==2 {print $1}' | tr -d '\r '
  fi
}

# ---------- block 1: codebase-memory-mcp ----------
install_cbm() {
  if $SKIP_CBM; then
    log "codebase-memory-mcp install skipped (--skip-cbm)"
    return
  fi
  echo ""
  echo "[1/2] codebase-memory-mcp (code knowledge graph engine)"

  if have codebase-memory-mcp && ! $UPGRADE; then
    CBM_BINARY="$(command -v codebase-memory-mcp)"
    CBM_VERSION="$(codebase-memory-mcp --version 2>/dev/null | head -n1 | awk '{print $NF}')"
    if [[ -n "$CBM_VERSION" ]] && semver_ge "$CBM_VERSION" "0.6.0"; then
      CBM_STATUS="OK"
      log "✓ codebase-memory-mcp $CBM_VERSION already installed at $CBM_BINARY"
    fi
  fi

  if [[ "$CBM_STATUS" != "OK" ]]; then
    # v2.9 hardening (M1 from GATE 3 audit, v2.8): instead of fetching install.sh
    # from a mutable branch and executing it, we download the platform-specific
    # binary tarball directly from the pinned GitHub Release and verify it against
    # the release's signed checksums.txt. This eliminates install.sh as a trust
    # surface entirely. Source: https://github.com/DeusData/codebase-memory-mcp/releases/tag/v0.6.0
    # (verified 2026-04-29, codebase-memory-mcp@0.6.0).
    local rc=0
    local arch_tag asset_name install_dir extracted_bin
    arch_tag="$(detect_platform_tag)"
    if [[ -z "$arch_tag" ]]; then
      err "could not detect a supported platform (uname -s = $(uname -s), uname -m = $(uname -m))"
      err "supported: darwin-amd64, darwin-arm64, linux-amd64, linux-arm64, windows-amd64"
      CBM_STATUS="MISSING"
      return
    fi
    if [[ "$arch_tag" == "windows-amd64" ]]; then
      asset_name="codebase-memory-mcp-${arch_tag}.zip"
    else
      asset_name="codebase-memory-mcp-${arch_tag}.tar.gz"
    fi
    log "Platform: $arch_tag → asset: $asset_name"

    local download_dir
    download_dir="$(mktemp -d 2>/dev/null || mktemp -d -t cbm-dl)"
    trap 'rm -rf "$download_dir"' RETURN

    log "Downloading release asset (pinned to $CBM_PIN_TAG)..."
    if ! curl -fsSL \
      "https://github.com/DeusData/codebase-memory-mcp/releases/download/${CBM_PIN_TAG}/${asset_name}" \
      -o "$download_dir/$asset_name"; then
      err "failed to download $asset_name"
      CBM_STATUS="MISSING"
      return
    fi
    if ! curl -fsSL \
      "https://github.com/DeusData/codebase-memory-mcp/releases/download/${CBM_PIN_TAG}/checksums.txt" \
      -o "$download_dir/checksums.txt"; then
      err "failed to download checksums.txt"
      CBM_STATUS="MISSING"
      return
    fi

    log "Verifying SHA-256 against release checksums.txt..."
    local actual expected
    actual="$(sha256_of "$download_dir/$asset_name")"
    expected="$(awk -v name="$asset_name" '$2 == name {print $1}' "$download_dir/checksums.txt")"
    if [[ -z "$expected" ]]; then
      err "checksums.txt does not list $asset_name"
      CBM_STATUS="BROKEN"
      return
    fi
    if [[ "$actual" != "$expected" ]]; then
      err "SHA-256 mismatch for $asset_name"
      err "  expected: $expected"
      err "  actual:   $actual"
      err "Refusing to install. The asset may have been tampered with or the download was corrupted."
      CBM_STATUS="BROKEN"
      return
    fi
    log "✓ SHA-256 match: $actual"

    # v3.1 hardening — gh attestation verify against the release's
    # provenance bundle. Gate 3 of 3 (release pin → SHA-256 → attestation).
    # SHA-256 verification (above) proves the asset matches the value listed
    # in checksums.txt of the same release; attestation verify proves both
    # the asset AND checksums.txt were produced by the expected GitHub Actions
    # workflow in the expected repo (defense in depth against a maintainer-
    # account compromise that re-publishes both the asset and its hash with
    # new content).
    # Source: https://docs.github.com/en/actions/security-guides/using-artifact-attestations-to-establish-provenance-for-builds (verified 2026-04-29)
    # Source: gh attestation verify --help (gh 2.87.3, verified 2026-04-29)
    if have gh; then
      if gh auth status >/dev/null 2>&1; then
        log "Verifying GitHub Actions attestation (gh attestation verify)..."
        if gh attestation verify "$download_dir/$asset_name" \
             --repo DeusData/codebase-memory-mcp 2>&1 | sed 's/^/    /'; then
          log "✓ attestation verified"
        else
          err "attestation verification failed for $asset_name"
          err "Refusing to install. The asset may have been re-uploaded by a"
          err "compromised account, or the GitHub Actions workflow that produced"
          err "it does not match the expected SourceRepository."
          CBM_STATUS="BROKEN"
          return
        fi
      else
        warn "gh CLI present but not authenticated; skipping attestation verify"
        warn "  (SHA-256 already verified — attestation is defense in depth)"
        warn "  Authenticate with 'gh auth login' to enable attestation verification"
      fi
    else
      warn "gh CLI not installed; skipping attestation verify"
      warn "  (SHA-256 already verified — attestation is defense in depth)"
      warn "  Install gh: https://cli.github.com/  then re-run for stronger guarantee"
    fi

    install_dir="$HOME/.local/bin"
    mkdir -p "$install_dir"
    log "Extracting to $install_dir ..."
    # Both branches now extract into a dedicated $download_dir/extracted/ subdir
    # for symmetry — the find that locates the binary cannot accidentally pick
    # up the original archive even if a future release ships a flat tarball.
    mkdir -p "$download_dir/extracted"
    if [[ "$arch_tag" == "windows-amd64" ]]; then
      if ! unzip -q -o "$download_dir/$asset_name" -d "$download_dir/extracted"; then
        err "unzip failed"; CBM_STATUS="BROKEN"; return
      fi
      extracted_bin="$(find "$download_dir/extracted" -type f -name 'codebase-memory-mcp*.exe' | head -n1)"
    else
      # tar flags rationale:
      #   --no-same-owner       — extract files as the current user, not the
      #                           uid/gid stored in the archive (defense vs
      #                           archives crafted to drop priv).
      #   --no-same-permissions — strip setuid/setgid/sticky bits.
      # Together these cap the worst case if a future release (or upstream
      # compromise) ships a tarball with weird ownership/perms.
      # GNU tar 1.32+ refuses '..' path traversal by default; older systems
      # (rare today) still extract relative paths. The dedicated extracted/
      # subdir bounds the blast radius to that subdir.
      if ! tar -xzf "$download_dir/$asset_name" -C "$download_dir/extracted" \
           --no-same-owner --no-same-permissions 2>&1 | sed 's/^/    /'; then
        err "tar extract failed"; CBM_STATUS="BROKEN"; return
      fi
      extracted_bin="$(find "$download_dir/extracted" -type f -name 'codebase-memory-mcp' | head -n1)"
    fi
    if [[ -z "$extracted_bin" || ! -f "$extracted_bin" ]]; then
      err "extracted archive but did not find the binary"
      CBM_STATUS="BROKEN"
      return
    fi

    if [[ "$arch_tag" == "windows-amd64" ]]; then
      CBM_BINARY="$install_dir/codebase-memory-mcp.exe"
    else
      CBM_BINARY="$install_dir/codebase-memory-mcp"
    fi
    cp "$extracted_bin" "$CBM_BINARY"
    chmod +x "$CBM_BINARY" 2>/dev/null || true

    log "✓ codebase-memory-mcp installed at $CBM_BINARY"
    CBM_VERSION="$("$CBM_BINARY" --version 2>/dev/null | head -n1 | awk '{print $NF}')"

    # Reachable from PATH? Warn but do not abort — operator may need to add
    # ~/.local/bin to PATH manually. The MCP registration uses absolute path.
    if ! have codebase-memory-mcp; then
      warn "$install_dir is not on PATH; binary is at $CBM_BINARY (absolute path used for MCP registration)"
    fi
  fi

  # Register as MCP server (idempotent).
  # Source: https://code.claude.com/docs/en/mcp (verified 2026-04-29).
  if ! have claude; then
    warn "claude CLI not found; cannot register MCP server. Install Claude Code first"
    CBM_STATUS="BROKEN"
    return
  fi

  if claude mcp list 2>/dev/null | grep -q '^codebase-memory'; then
    log "✓ codebase-memory MCP server already registered"
  else
    log "Registering MCP server (scope=user, transport=stdio)..."
    if ! claude mcp add --scope user --transport stdio codebase-memory -- "$CBM_BINARY" 2>&1 | sed 's/^/    /'; then
      err "claude mcp add failed"
      CBM_STATUS="BROKEN"
      return
    fi
    log "✓ codebase-memory registered in ~/.claude.json (user scope)"
  fi

  CBM_STATUS="OK"
  log "✓ codebase-memory-mcp ${CBM_VERSION:-unknown} ready at $CBM_BINARY"
}

# ---------- block 2: persist state ----------
write_state() {
  # The `graphify` key is preserved with status DEPRECATED so older
  # check-code-graph-engines.sh installations (cached plugin) keep parsing
  # the file without errors. New code should ignore this key entirely.
  cat > "$STATE_FILE" <<EOF
{
  "schema_version": 2,
  "updated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "platform": "$OS",
  "graphify": {
    "status": "DEPRECATED",
    "version": ""
  },
  "codebase_memory_mcp": {
    "status": "$CBM_STATUS",
    "version": "$CBM_VERSION",
    "binary": "$CBM_BINARY"
  }
}
EOF
  log "state persisted at $STATE_FILE"
}

# ---------- run ----------

# Test sourcing guard: when the file is sourced from a unit-test (with
# SOURCING_FOR_TESTS=1 in the environment), exit early with the helper
# functions defined but without running the install or writing state.
if [[ "${SOURCING_FOR_TESTS:-}" == "1" ]]; then
  return 0 2>/dev/null || exit 0
fi

echo "setup-code-graph.sh — codebase-memory-mcp bootstrap"
echo "platform: $OS  |  upgrade: $UPGRADE"

install_cbm

echo ""
echo "[2/2] state"
write_state

echo ""
echo "Summary:"
log "codebase-memory-mcp  = $CBM_STATUS  (${CBM_VERSION:-n/a})"

if [[ "$CBM_STATUS" == "OK" ]]; then
  echo ""
  echo "Engine is functional. The code-graph skill is ready to use."
  exit 0
else
  echo ""
  err "Engine install failed. The code-graph skill will instruct re-bootstrap on next invocation."
  exit 2
fi
