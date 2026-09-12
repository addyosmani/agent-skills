#!/bin/bash
# simplify-ignore.sh — Hook for Read (PreToolUse), Edit|Write (PostToolUse), Stop
#
# PreToolUse Read   → backs up file, replaces blocks with BLOCK_<hash> in-place
# PostToolUse Edit  → expands placeholders, re-filters so file stays hidden
# PostToolUse Write → expands placeholders, re-filters so file stays hidden
# Stop              → restores real file content from backup
#
# The file on disk ALWAYS has placeholders while the session is active.
# The real content (with model's changes applied) lives in the backup.
#
# Dependencies: jq, shasum or sha1sum (auto-detected)

set -euo pipefail

if ! command -v jq >/dev/null 2>&1; then
  printf '%s\n' "error: missing jq" >&2; exit 1
fi

CACHE="${CLAUDE_PROJECT_DIR:-.}/.claude/.simplify-ignore-cache"
if [ -t 0 ]; then INPUT="{}"; else INPUT=$(cat); fi

# Parse hook input — trap errors explicitly so set -e doesn't cause
# a silent exit on malformed JSON, and surface a useful diagnostic.
parse_error=""
TOOL_NAME=$(printf '%s' "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null) || {
  parse_error="failed to parse .tool_name from hook input"
  TOOL_NAME=""
}
FILE_PATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null) || {
  parse_error="failed to parse .tool_input.file_path from hook input"
  FILE_PATH=""
}
if [ -n "$parse_error" ]; then
  printf 'Warning: %s (input: %.120s)\n' "$parse_error" "$INPUT" >&2
fi

hash_cmd() {
  if command -v shasum >/dev/null 2>&1; then shasum
  elif command -v sha1sum >/dev/null 2>&1; then sha1sum
  else printf '%s\n' "error: missing shasum or sha1sum" >&2; exit 1; fi
}
# Normalize a path to a canonical form before hashing so the same physical
# file gets one identity regardless of spelling (C:\x vs /c/x, slashes, case
# of the drive letter). Graceful fallback chain; never aborts under set -e.
normalize_path() {
  local p="$1" n=""
  if command -v cygpath >/dev/null 2>&1; then
    n=$(cygpath -u "$p" 2>/dev/null) || n=""
  fi
  if [ -z "$n" ] && command -v realpath >/dev/null 2>&1; then
    n=$(realpath -m "$p" 2>/dev/null) || n=""
  fi
  [ -z "$n" ] && n="$p"
  n="${n//\\//}"                          # backslashes -> forward slashes
  # Lowercase a leading "C:" drive letter -> "/c" (portable, no GNU sed \L).
  case "$n" in
    [A-Za-z]:*)
      local drive rest
      drive=$(printf '%s' "${n%%:*}" | tr '[:upper:]' '[:lower:]')
      rest="${n#*:}"
      n="/${drive}${rest}"
      ;;
  esac
  printf '%s' "$n"
}
file_id() { printf '%s' "$(normalize_path "$1")" | hash_cmd | cut -c1-16; }
block_hash() { printf '%s' "$1" | hash_cmd | cut -c1-8; }
# Escape glob metacharacters so ${var/pattern/repl} treats pattern as literal.
# Needed for Bash 3.2 (macOS) where quotes don't suppress globbing in PE patterns.
escape_glob() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\*/\\*}"
  s="${s//\?/\\?}"
  s="${s//\[/\\[}"
  printf '%s' "$s"
}

# ── filter_file: replace simplify-ignore blocks with BLOCK_<hash> placeholders ─
# Reads $1 (source), writes filtered version to $2 (dest), saves blocks to cache.
# Returns 0 if blocks were found, 1 if none.
filter_file() {
  local src="$1" dest="$2" fid="$3"
  : > "$dest"
  rm -f "$CACHE/${fid}".block.* "$CACHE/${fid}".reason.* "$CACHE/${fid}".prefix.* "$CACHE/${fid}".suffix.*

  local count=0 in_block=0 buf="" reason="" prefix="" suffix=""

  while IFS= read -r line || [ -n "$line" ]; do
    # Check for start marker (no fork — uses bash case)
    if [ $in_block -eq 0 ]; then
      case "$line" in *simplify-ignore-start*)
        in_block=1
        buf="$line"
        # Extract comment prefix/suffix to preserve language-appropriate syntax
        prefix="${line%%simplify-ignore-start*}"
        suffix=""
        case "$line" in *'*/'*) suffix=" */" ;; *'-->'*) suffix=" -->" ;; esac
        reason=$(printf '%s' "$line" | sed -n 's/.*simplify-ignore-start:[[:space:]]*//p' \
          | sed 's/[[:space:]]*\*\/.*$//' | sed 's/[[:space:]]*-->.*$//' | sed 's/[[:space:]]*$//')
        # Handle single-line block (start + end on same line)
        case "$line" in *simplify-ignore-end*)
          in_block=0
          # Write single-line block immediately and skip to next line
          # to avoid the end-marker check below firing again
          local h; h=$(block_hash "$buf")
          count=$((count + 1))
          printf '%s' "$buf" > "$CACHE/${fid}.block.${h}"
          [ -n "$reason" ] && printf '%s' "$reason" > "$CACHE/${fid}.reason.${h}"
          printf '%s' "$prefix" > "$CACHE/${fid}.prefix.${h}"
          printf '%s' "$suffix" > "$CACHE/${fid}.suffix.${h}"
          if [ -n "$reason" ]; then
            printf '%s\n' "${prefix}BLOCK_${h}: ${reason}${suffix}" >> "$dest"
          else
            printf '%s\n' "${prefix}BLOCK_${h}${suffix}" >> "$dest"
          fi
          buf=""; reason=""; prefix=""; suffix=""
          continue
          ;; *)
          continue
          ;;
        esac
      ;; esac
    fi
    # Accumulate block content
    if [ $in_block -eq 1 ]; then
      buf="${buf}
${line}"
    fi
    # Check for end marker
    case "$line" in *simplify-ignore-end*)
      if [ $in_block -eq 1 ]; then
        local h; h=$(block_hash "$buf")
        count=$((count + 1))
        printf '%s' "$buf" > "$CACHE/${fid}.block.${h}"
        [ -n "$reason" ] && printf '%s' "$reason" > "$CACHE/${fid}.reason.${h}"
        printf '%s' "$prefix" > "$CACHE/${fid}.prefix.${h}"
        printf '%s' "$suffix" > "$CACHE/${fid}.suffix.${h}"
        if [ -n "$reason" ]; then
          printf '%s\n' "${prefix}BLOCK_${h}: ${reason}${suffix}" >> "$dest"
        else
          printf '%s\n' "${prefix}BLOCK_${h}${suffix}" >> "$dest"
        fi
        in_block=0; buf=""; reason=""; prefix=""; suffix=""
        continue
      fi
      ;;
    esac
    [ $in_block -eq 0 ] && printf '%s\n' "$line" >> "$dest"
  done < "$src"

  # Unclosed block → flush as-is
  if [ $in_block -eq 1 ] && [ -n "$buf" ]; then
    printf 'Warning: unclosed simplify-ignore-start in %s (block not hidden)\n' "$src" >&2
    printf '%s\n' "$buf" >> "$dest"
  fi

  # Preserve trailing newline status of source. Source has no trailing
  # newline -> strip the single trailing newline from dest. No perl dependency:
  # read dest and re-emit without a trailing \n.
  if [ -s "$dest" ] && [ -s "$src" ] && [ -n "$(tail -c 1 "$src")" ]; then
    nnl=$(cat "$dest"; printf x); nnl="${nnl%x}"; nnl="${nnl%$'\n'}"
    printf '%s' "$nnl" > "$dest"
  fi

  [ $count -gt 0 ] && return 0 || return 1
}

# ── Stop: restore all files from backup ───────────────────────────────────────
if [ -z "$TOOL_NAME" ]; then
  [ -d "$CACHE" ] || exit 0
  for bak in "$CACHE"/*.bak; do
    [ -f "$bak" ] || continue
    fid="${bak##*/}"; fid="${fid%.bak}"
    pathfile="$CACHE/${fid}.path"
    [ -f "$pathfile" ] || { rm -f "$bak"; continue; }
    orig=$(cat "$pathfile")
    if [ -f "$orig" ]; then
      # TOCTOU/symlink guard: only write back to a regular, non-symlink file.
      if [ -L "$orig" ]; then
        printf 'Warning: restore target %s is a symlink; skipping write-back\n' "$orig" >&2
      else
        cat "$bak" > "$orig"
      fi
      rm -f "$bak" "$pathfile" "$CACHE/${fid}".block.* "$CACHE/${fid}".reason.* "$CACHE/${fid}".prefix.* "$CACHE/${fid}".suffix.*
      rmdir "$CACHE/${fid}.lock" 2>/dev/null
    else
      # File was moved/deleted — save backup as .recovered, don't destroy it
      mkdir -p "$(dirname "${orig}.recovered")"
      mv "$bak" "${orig}.recovered"
      rm -f "$pathfile" "$CACHE/${fid}".block.* "$CACHE/${fid}".reason.* "$CACHE/${fid}".prefix.* "$CACHE/${fid}".suffix.*
      rmdir "$CACHE/${fid}.lock" 2>/dev/null
      printf 'Warning: %s was moved/deleted. Recovered original to %s.recovered\n' "$orig" "$orig" >&2
    fi
  done
  # Clean orphan locks (created but crash before backup)
  for lockdir in "$CACHE"/*.lock; do
    [ -d "$lockdir" ] || continue
    rmdir "$lockdir" 2>/dev/null
  done
  exit 0
fi

[ -z "$FILE_PATH" ] && exit 0

# ── PreToolUse Read: filter in-place ──────────────────────────────────────────
if [ "$TOOL_NAME" = "Read" ]; then
  [ -f "$FILE_PATH" ] || exit 0
  # Refuse to operate on symlinks: a symlinked target could redirect our
  # in-place rewrite/backup/restore at a file outside the intended path.
  [ -L "$FILE_PATH" ] && exit 0
  case "$(basename "$FILE_PATH")" in simplify-ignore*|SIMPLIFY-IGNORE*) exit 0 ;; esac

  mkdir -p "$CACHE"
  ID=$(file_id "$FILE_PATH")

  # If backup exists, file is already filtered — skip
  [ -f "$CACHE/${ID}.bak" ] && exit 0

  grep -q 'simplify-ignore-start' -- "$FILE_PATH" || exit 0

  # Atomic lock: mkdir fails if another session races us
  if ! mkdir "$CACHE/${ID}.lock" 2>/dev/null; then
    # Lock exists — reclaim only if stale (>60s old, no backup = crash leftover)
    if [ ! -f "$CACHE/${ID}.bak" ] && \
       [ -n "$(find "$CACHE/${ID}.lock" -maxdepth 0 -mmin +1 2>/dev/null)" ]; then
      rmdir "$CACHE/${ID}.lock" 2>/dev/null || true
      mkdir "$CACHE/${ID}.lock" 2>/dev/null || exit 0
    else
      exit 0
    fi
  fi

  # Back up the original (preserve trailing newline status)
  cp -p "$FILE_PATH" "$CACHE/${ID}.bak" 2>/dev/null || cp "$FILE_PATH" "$CACHE/${ID}.bak"
  printf '%s' "$FILE_PATH" > "$CACHE/${ID}.path"

  # Filter in-place (cat > preserves inode and permissions)
  FILTERED="$CACHE/${ID}.$$.tmp"
  rm -f "$FILTERED"
  if filter_file "$FILE_PATH" "$FILTERED" "$ID"; then
    # Recheck the target is still a regular non-symlink (TOCTOU since entry).
    if [ -L "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ]; then
      printf 'Warning: %s is a symlink or not a regular file; skipping in-place filter\n' "$FILE_PATH" >&2
      rm -f "$FILTERED" "$CACHE/${ID}.bak" "$CACHE/${ID}.path"
      rmdir "$CACHE/${ID}.lock" 2>/dev/null
      exit 0
    fi
    # Arm restore-on-failure: an abort during the write must not leave the
    # user's file half-placeholdered with the backup intact but unused.
    trap 'cat "$CACHE/${ID}.bak" > "$FILE_PATH" 2>/dev/null; rm -f "$FILTERED"; rmdir "$CACHE/${ID}.lock" 2>/dev/null; exit 1' EXIT
    cat "$FILTERED" > "$FILE_PATH"
    rm -f "$FILTERED"
    trap - EXIT
  else
    rm -f "$FILTERED" "$CACHE/${ID}.bak" "$CACHE/${ID}.path"
    rmdir "$CACHE/${ID}.lock" 2>/dev/null
  fi
  exit 0
fi

# ── PostToolUse Edit|Write: expand, then re-filter ────────────────────────────
if [ "$TOOL_NAME" = "Edit" ] || [ "$TOOL_NAME" = "Write" ]; then
  ID=$(file_id "$FILE_PATH")
  [ -f "$CACHE/${ID}.bak" ] || exit 0
  ls "$CACHE/${ID}".block.* >/dev/null 2>&1 || exit 0

  # Expand placeholders, preserving any inline code the model added around them
  EXPANDED="$CACHE/${ID}.$$.expanded"
  rm -f "$EXPANDED"
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in *BLOCK_*)
      # Expand all placeholders on this line (supports multiple per line)
      for bf in "$CACHE/${ID}".block.*; do
        [ -f "$bf" ] || continue
        h="${bf##*.}"
        case "$line" in *"BLOCK_${h}"*)
          # Reconstruct the exact placeholder pattern
          bp=""; bs=""; br=""
          [ -f "$CACHE/${ID}.prefix.${h}" ] && bp=$(cat "$CACHE/${ID}.prefix.${h}")
          [ -f "$CACHE/${ID}.suffix.${h}" ] && bs=$(cat "$CACHE/${ID}.suffix.${h}")
          [ -f "$CACHE/${ID}.reason.${h}" ] && br=$(cat "$CACHE/${ID}.reason.${h}")
          if [ -n "$br" ]; then
            placeholder="${bp}BLOCK_${h}: ${br}${bs}"
          else
            placeholder="${bp}BLOCK_${h}${bs}"
          fi
          block_content=$(cat "$bf"; printf x); block_content="${block_content%x}"
          # Escape glob metacharacters (* ? [ \) in the pattern
          esc_placeholder=$(escape_glob "$placeholder")
          # Bash native substitution (// = global replace): replace placeholder, keep surrounding code
          line="${line//$esc_placeholder/$block_content}"
          # Fallback: if model altered the reason text, try without reason
          # (only trigger if BLOCK_hash is still present AND wasn't in the original block content)
          case "$block_content" in *"BLOCK_${h}"*) ;; *)
            case "$line" in *"BLOCK_${h}"*)
              printf 'Warning: placeholder BLOCK_%s was modified by model, using fuzzy match\n' "$h" >&2
              esc_fuzzy=$(escape_glob "${bp}BLOCK_${h}${bs}")
              line="${line//$esc_fuzzy/$block_content}"
              # Last resort: match just the hash token
              case "$line" in *"BLOCK_${h}"*)
                line="${line//BLOCK_${h}/$block_content}"
              ;; esac
            ;; esac
          ;; esac
        ;; esac
      done
    ;; esac
    printf '%s\n' "$line" >> "$EXPANDED"
  done < "$FILE_PATH"
  # Preserve trailing newline status. No perl dependency: strip the single
  # trailing newline from EXPANDED when the source lacked one.
  if [ -s "$EXPANDED" ] && [ -s "$FILE_PATH" ] && [ -n "$(tail -c 1 "$FILE_PATH")" ]; then
    nnl=$(cat "$EXPANDED"; printf x); nnl="${nnl%x}"; nnl="${nnl%$'\n'}"
    printf '%s' "$nnl" > "$EXPANDED"
  fi
  # Warn if model deleted a protected block entirely
  for bf in "$CACHE/${ID}".block.*; do
    [ -f "$bf" ] || continue
    bh="${bf##*.}"
    # After expansion, blocks appear as original code (simplify-ignore-start).
    # If neither the expanded code nor the placeholder is in EXPANDED, it was deleted.
    if ! grep -qF "BLOCK_${bh}" "$EXPANDED" 2>/dev/null; then
      # Get first line of block to check if it was expanded back
      first_line=$(head -1 "$bf")
      if ! grep -qF "$first_line" "$EXPANDED" 2>/dev/null; then
        printf 'Warning: protected block BLOCK_%s was deleted by model\n' "$bh" >&2
      fi
    fi
  done
  # Symlink/TOCTOU guard: refuse to write through a symlinked target.
  if [ -L "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ]; then
    printf 'Warning: %s is a symlink or not a regular file; skipping expand write-back\n' "$FILE_PATH" >&2
    rm -f "$EXPANDED"
    exit 0
  fi
  # Arm a restore-on-failure guard: from here until placeholders are written,
  # any unexpected exit must leave the user's file recoverable. Restore the
  # expanded (real, just-unhidden) content rather than a half-placeholdered file.
  _guard="$CACHE/${ID}.$$.guard"
  cp "$EXPANDED" "$_guard" 2>/dev/null || cp "$FILE_PATH" "$_guard"
  trap 'cat "$_guard" > "$FILE_PATH" 2>/dev/null; rm -f "$_guard" "$EXPANDED"; rmdir "$CACHE/${ID}.lock" 2>/dev/null; exit 1' EXIT
  # Preserve inode and permissions
  cat "$EXPANDED" > "$FILE_PATH"
  rm -f "$EXPANDED"

  # Save expanded version as new backup (this is the "real" file with model's changes)
  cp "$FILE_PATH" "$CACHE/${ID}.bak"

  # Re-filter in-place so the file on disk stays with placeholders
  FILTERED="$CACHE/${ID}.$$.tmp"
  rm -f "$FILTERED"
  if filter_file "$FILE_PATH" "$FILTERED" "$ID"; then
    if [ -L "$FILE_PATH" ]; then
      printf 'Warning: %s became a symlink; skipping re-filter write-back\n' "$FILE_PATH" >&2
    else
      cat "$FILTERED" > "$FILE_PATH"
    fi
    rm -f "$FILTERED"
  fi
  # Success: disarm guard. Backup already holds the real expanded content.
  trap - EXIT
  rm -f "$_guard"

  exit 0
fi
