#!/usr/bin/env bash
# post-commit-kb.sh
# Git post-commit hook (NOT a Claude Code hook). Installed at .git/hooks/post-commit
# in projects that opt in via .claude/kb-config.json. Captures every accepted commit
# as a structured bullet in the project's session journal AND mirrors the bullet to
# the operator's Obsidian vault (L1).
#
# Sprint 2a additions:
#   - ADR auto-mirror: copies any committed ADR (docs/adr/NNNN-*.md) to
#     <vault>/decisions/adr-<NNNN>-<slug>.md with Obsidian frontmatter.
#   - Agent dispatch: if kb_pipeline_enabled=true and claude CLI is available,
#     launches the kb-pipeline agent in the background (nohup + disown) to run
#     the full capture→curate→write flow for the commit.
#
# ADR-0011 D1 — automatic persistence on commit (not on Stop). The commit is the
# intentional event; Stop is too noisy.
#
# Failure mode: NEVER block the commit. Errors go to .claude/kb-debug.log; exit 0
# always. The commit is already accepted by the time this hook fires.
#
# Source: https://git-scm.com/docs/githooks#_post_commit (verified 2026-04-29, git@2.x)

# Fail-soft setup. Trap any error and exit 0.
set +e
trap 'exit 0' ERR

# Resolve the repo root from the hook's working directory (git invokes hooks with
# cwd = top of working tree).
repo_root="$(git rev-parse --show-toplevel 2>/dev/null)"
if [[ -z "$repo_root" ]]; then
  exit 0
fi

config_file="$repo_root/.claude/kb-config.json"
debug_log="$repo_root/.claude/kb-debug.log"

# Opt-in gate: no config file → silent no-op.
if [[ ! -f "$config_file" ]]; then
  exit 0
fi

# jq is required for config parsing. Without it, log and exit silent.
if ! command -v jq >/dev/null 2>&1; then
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) WARN post-commit-kb: jq missing, skipping" >> "$debug_log" 2>/dev/null
  exit 0
fi

enabled=$(jq -r '.enabled // false' "$config_file" 2>/dev/null)
if [[ "$enabled" != "true" ]]; then
  exit 0
fi

client=$(jq -r '.client // ""' "$config_file" 2>/dev/null)
project=$(jq -r '.project // ""' "$config_file" 2>/dev/null)
vault_root=$(jq -r '.vault_root // ""' "$config_file" 2>/dev/null)
slug_strategy=$(jq -r '.session_slug_strategy // "branch-or-plan-or-daily"' "$config_file" 2>/dev/null)

# Sprint 2a config keys (both default to false/off so existing setups are unaffected).
adr_mirror_enabled=$(jq -r '.adr_mirror_enabled // false' "$config_file" 2>/dev/null)
kb_pipeline_enabled=$(jq -r '.kb_pipeline_enabled // false' "$config_file" 2>/dev/null)

# Global vault override: ~/.claude/kb-vault.json is the machine-level source of truth.
# If vault_root in the project config is empty, a shell template, or the default placeholder,
# fall back to the global config. This prevents auto-provisioned projects from silently writing
# to a non-existent path.
global_vault_file="${HOME}/.claude/kb-vault.json"
vault_root_is_template=false
[[ "$vault_root" == *'${'* || "$vault_root" == "~/batuta-kb" || -z "$vault_root" ]] && vault_root_is_template=true
if $vault_root_is_template && [[ -f "$global_vault_file" ]] && command -v jq >/dev/null 2>&1; then
  global_vault=$(jq -r '.vault_root // ""' "$global_vault_file" 2>/dev/null)
  [[ -n "$global_vault" ]] && vault_root="$global_vault"
fi

if [[ -z "$client" || -z "$project" ]]; then
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) WARN post-commit-kb: client or project empty in $config_file" >> "$debug_log" 2>/dev/null
  exit 0
fi

# Rebase / cherry-pick / merge detection: skip while in progress; reconcile via tools/kb-resync.sh.
# Note: rebase-merge and rebase-apply are directories; CHERRY_PICK_HEAD and MERGE_HEAD are files.
if [[ -d "$repo_root/.git/rebase-merge" || -d "$repo_root/.git/rebase-apply" || -f "$repo_root/.git/CHERRY_PICK_HEAD" || -f "$repo_root/.git/MERGE_HEAD" ]]; then
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) SKIP post-commit-kb: rebase/cherry-pick/merge in progress" >> "$debug_log" 2>/dev/null
  exit 0
fi

# Capture the last commit's metadata.
sha_full=$(git -C "$repo_root" log -1 --format='%H' 2>/dev/null)
sha_abbrev=$(git -C "$repo_root" log -1 --format='%h' 2>/dev/null)
subject=$(git -C "$repo_root" log -1 --format='%s' 2>/dev/null)
ts_iso=$(git -C "$repo_root" log -1 --format='%aI' 2>/dev/null)
ts_hhmm=$(date -u -d "$ts_iso" +%H:%M 2>/dev/null || date -u +%H:%M)
date_ymd=$(date -u -d "$ts_iso" +%Y-%m-%d 2>/dev/null || date -u +%Y-%m-%d)
branch=$(git -C "$repo_root" rev-parse --abbrev-ref HEAD 2>/dev/null)
files_changed=$(git -C "$repo_root" diff-tree --no-commit-id --name-only -r "$sha_full" 2>/dev/null | head -3 | tr '\n' ',' | sed 's/,$//')
files_count=$(git -C "$repo_root" diff-tree --no-commit-id --name-only -r "$sha_full" 2>/dev/null | wc -l | tr -d ' ')

# Determine session slug per strategy.
slug=""
case "$slug_strategy" in
  branch-or-plan-or-daily|*)
    case "$branch" in
      feature/*|feat/*)
        slug="${branch#feature/}"
        slug="${slug#feat/}"
        ;;
      *)
        ;;
    esac
    if [[ -z "$slug" ]]; then
      first_plan=$(ls -t "$repo_root/docs/plans/active/"*.md 2>/dev/null | head -1)
      if [[ -n "$first_plan" ]]; then
        slug=$(basename "$first_plan" .md)
        slug="${slug#$date_ymd-}"
      fi
    fi
    if [[ -z "$slug" ]]; then
      slug="daily"
    fi
    ;;
esac

# Ensure docs/sessions/ exists.
sessions_dir="$repo_root/docs/sessions"
mkdir -p "$sessions_dir" 2>/dev/null || true

journal="$sessions_dir/$date_ymd-$slug.md"
plan_link=""
first_plan=$(ls -t "$repo_root/docs/plans/active/"*.md 2>/dev/null | head -1)
if [[ -n "$first_plan" ]]; then
  plan_link="docs/plans/active/$(basename "$first_plan")"
fi

# Idempotency: if this SHA is already in today's journal, skip (handles --amend
# returning the same SHA on re-write, and accidental hook double-fires).
if [[ -f "$journal" ]] && grep -q "$sha_abbrev" "$journal" 2>/dev/null; then
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) SKIP post-commit-kb: SHA $sha_abbrev already in $journal" >> "$debug_log" 2>/dev/null
  exit 0
fi

# Create the journal with frontmatter on first write of the day.
if [[ ! -f "$journal" ]]; then
  cat > "$journal" <<EOF
---
type: session
date: $date_ymd
client: $client
project: $project
repo: $(git -C "$repo_root" remote get-url origin 2>/dev/null | sed 's/\.git$//' | sed 's|.*github.com[:/]||')
tags: [session, client/$client]
last_verified: $date_ymd
---

# Session journal — $date_ymd — $project

EOF
fi

# Append the bullet.
{
  echo "- **${ts_hhmm} · \`${sha_abbrev}\`** · ${subject}"
  echo "  - branch: \`${branch}\`"
  echo "  - files: ${files_count} (\`${files_changed}\`)"
  if [[ -n "$plan_link" ]]; then
    echo "  - plan: ${plan_link}"
  fi
} >> "$journal"

# Mirror to the vault if vault_root is configured and reachable.
if [[ -n "$vault_root" ]]; then
  vault_root_expanded="${vault_root/#\~/$HOME}"
  vault_target_dir="$vault_root_expanded/clients/$client/projects/$project/sessions"
  if [[ -d "$vault_root_expanded" ]]; then
    mkdir -p "$vault_target_dir" 2>/dev/null
    vault_journal="$vault_target_dir/$date_ymd.md"
    if [[ ! -f "$vault_journal" ]]; then
      cat > "$vault_journal" <<EOF
---
type: session
date: $date_ymd
client: $client
project: $project
tags: [session, client/$client]
related: ["[[${client}]]", "[[${project}]]"]
last_verified: $date_ymd
---

# Session — $date_ymd — $client/$project

EOF
    fi
    if ! grep -q "$sha_abbrev" "$vault_journal" 2>/dev/null; then
      {
        echo "- **${ts_hhmm} · \`${sha_abbrev}\`** · ${subject}"
        echo "  - branch: \`${branch}\`"
        echo "  - files: ${files_count}"
        echo "  - project: [[${client}]]/[[${project}]]"
      } >> "$vault_journal"
    fi
  else
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) WARN post-commit-kb: vault_root not reachable: $vault_root_expanded" >> "$debug_log" 2>/dev/null
  fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# Sprint 2a — ADR auto-mirror
# For every committed file matching docs/adr/NNNN-*.md, copy the full ADR to
# <vault>/decisions/adr-NNNN-<slug>.md with Obsidian frontmatter prepended.
# Idempotent: if the destination file already exists with identical content
# (measured by a sha256 hash of the ADR body lines), the copy is skipped.
# Runs only when adr_mirror_enabled=true and vault_root is reachable.
# ─────────────────────────────────────────────────────────────────────────────
_mirror_adr() {
  local adr_file="$1"
  local vault_root_expanded="$2"
  local decisions_dir="$vault_root_expanded/decisions"

  # Resolve the ADR file's absolute path inside the repo.
  local adr_abs="$repo_root/$adr_file"
  if [[ ! -f "$adr_abs" ]]; then
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) WARN post-commit-kb: ADR file not found: $adr_abs" >> "$debug_log" 2>/dev/null
    return
  fi

  # Extract NNNN and slug from filename like "0011-automatic-persistence.md".
  local basename_no_ext
  basename_no_ext=$(basename "$adr_file" .md)
  # Leading digits (NNNN) before the first hyphen.
  local adr_id="${basename_no_ext%%-*}"
  # Everything after the leading digits and first hyphen.
  local adr_slug="${basename_no_ext#*-}"

  # Validate both fields. adr_id must be numeric only (filename convention NNNN-...);
  # adr_slug must be kebab-case to prevent path traversal — a filename like
  # "0012-../../evil" would otherwise write outside decisions/.
  if ! [[ "$adr_id" =~ ^[0-9]+$ ]]; then
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) WARN post-commit-kb: adr_id '$adr_id' fails numeric validation; skipping mirror for $adr_file" >> "$debug_log" 2>/dev/null
    return
  fi
  if ! [[ "$adr_slug" =~ ^[a-z0-9][a-z0-9-]+$ ]]; then
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) WARN post-commit-kb: adr_slug '$adr_slug' fails validation (path traversal risk); skipping mirror for $adr_file" >> "$debug_log" 2>/dev/null
    return
  fi

  # Parse status from the ADR body: look for "**Status:** <value>" pattern.
  # Constrain to a known allowlist to prevent YAML injection via crafted ADR content
  # (e.g. a status value containing a quote could close the YAML string and inject keys).
  local adr_status_raw adr_status
  adr_status_raw=$(grep -m1 '^\*\*Status:\*\*' "$adr_abs" 2>/dev/null | sed 's/\*\*Status:\*\* *//' | cut -d'(' -f1 | tr -d '\r\n"' | sed 's/[[:space:]]*$//')
  case "$adr_status_raw" in
    Proposed|Accepted|Deprecated|Superseded) adr_status="$adr_status_raw" ;;
    *)                                       adr_status="Unknown" ;;
  esac

  # Destination filename and path.
  local dest_filename="adr-${adr_id}-${adr_slug}.md"
  local dest_path="$decisions_dir/$dest_filename"

  mkdir -p "$decisions_dir" 2>/dev/null

  # Compute a content hash of the source ADR to detect if destination is already
  # up to date. Try sha256sum, then shasum, then cksum (always present on POSIX).
  # If hashing fails entirely, the ADR is re-written every commit (still correct,
  # just wasteful) — and we log a warning so the operator notices.
  local src_hash=""
  if command -v sha256sum >/dev/null 2>&1; then
    src_hash=$(sha256sum "$adr_abs" 2>/dev/null | awk '{print $1}')
  elif command -v shasum >/dev/null 2>&1; then
    src_hash=$(shasum -a 256 "$adr_abs" 2>/dev/null | awk '{print $1}')
  elif command -v cksum >/dev/null 2>&1; then
    src_hash=$(cksum "$adr_abs" 2>/dev/null | awk '{print $1"_"$2}')
  fi
  if [[ -z "$src_hash" ]]; then
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) WARN post-commit-kb: no hash tool (sha256sum/shasum/cksum) found; ADR $adr_path mirror will re-write every commit" >> "$debug_log" 2>/dev/null
  fi

  # If destination already exists, compare stored hash in its frontmatter to skip.
  if [[ -f "$dest_path" && -n "$src_hash" ]]; then
    local stored_hash
    stored_hash=$(grep -m1 '^source_hash:' "$dest_path" 2>/dev/null | awk '{print $2}' | tr -d '\r\n')
    if [[ "$stored_hash" == "$src_hash" ]]; then
      echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) SKIP post-commit-kb: ADR $dest_filename already up to date (hash match)" >> "$debug_log" 2>/dev/null
      return
    fi
  fi

  # Write the mirrored file: Obsidian frontmatter + full ADR body.
  {
    echo "---"
    echo "adr_id: \"${adr_id}\""
    echo "status: \"${adr_status}\""
    echo "date: ${date_ymd}"
    echo "project: ${project}"
    echo "client: ${client}"
    echo "source_hash: ${src_hash}"
    echo "tags: [adr]"
    echo "---"
    echo ""
    cat "$adr_abs"
  } > "$dest_path" 2>/dev/null

  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) INFO post-commit-kb: mirrored ADR $adr_file → $dest_path" >> "$debug_log" 2>/dev/null
}

if [[ "$adr_mirror_enabled" == "true" && -n "$vault_root" ]]; then
  vault_root_expanded="${vault_root/#\~/$HOME}"
  if [[ -d "$vault_root_expanded" ]]; then
    # Collect all ADR files touched in this commit.
    while IFS= read -r committed_file; do
      # Match pattern: docs/adr/NNNN-*.md (one or more digits, hyphen, anything, .md).
      if [[ "$committed_file" =~ ^docs/adr/[0-9]+-.*\.md$ ]]; then
        _mirror_adr "$committed_file" "$vault_root_expanded"
      fi
    done < <(git -C "$repo_root" diff-tree --no-commit-id --name-only -r "$sha_full" 2>/dev/null)
  else
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) WARN post-commit-kb: adr_mirror_enabled=true but vault not reachable: $vault_root_expanded" >> "$debug_log" 2>/dev/null
  fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# kb-pipeline agent dispatch (async, background) — opt-in via kb_pipeline_enabled
#
# Preconditions (all must be true to dispatch):
#   1. kb_pipeline_enabled=true in .claude/kb-config.json
#   2. `claude` CLI is available in PATH
#   3. A kb-pipeline agent definition is reachable at one of:
#      a. <repo>/.claude/agents/kb-pipeline.md           (project-local override)
#      b. <plugin-install>/agents/kb-pipeline.md         (plugin marketplace install)
#      c. <repo>/agents/kb-pipeline.md                   (dev-time use inside plugin repo)
#   4. CLIENT, PROJECT, VAULT_ROOT slugs match the safe alphabet (no shell or
#      prompt-injection metacharacters). kb-config.json is repo-tracked, so
#      a poisoned config could otherwise inject into the LLM prompt below.
# ─────────────────────────────────────────────────────────────────────────────
if [[ "$kb_pipeline_enabled" == "true" ]]; then
  # Precondition 1: claude CLI available.
  if ! command -v claude >/dev/null 2>&1; then
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) WARN post-commit-kb: kb_pipeline_enabled=true but 'claude' CLI not found in PATH — skipping agent dispatch" >> "$debug_log" 2>/dev/null
  else
    # Precondition 2: kb-pipeline agent definition exists. Lookup chain:
    #   project-local → plugin install (canonical for consumer repos) → plugin repo root (dev-time).
    agent_def=""
    project_local_agent="$repo_root/.claude/agents/kb-pipeline.md"
    plugin_install_agent="${HOME}/.claude/plugins/marketplaces/batuta-agent-skills/agents/kb-pipeline.md"
    plugin_repo_agent="$repo_root/agents/kb-pipeline.md"

    if [[ -f "$project_local_agent" ]]; then
      agent_def="$project_local_agent"
    elif [[ -f "$plugin_install_agent" ]]; then
      agent_def="$plugin_install_agent"
    elif [[ -f "$plugin_repo_agent" ]]; then
      agent_def="$plugin_repo_agent"
    fi

    if [[ -z "$agent_def" ]]; then
      echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) WARN post-commit-kb: kb_pipeline_enabled=true but no kb-pipeline agent found at $project_local_agent | $plugin_install_agent | $plugin_repo_agent — skipping dispatch" >> "$debug_log" 2>/dev/null
    else
      # Precondition 3: validate every value that lands in the LLM dispatch prompt.
      # client/project are kebab-case slugs. repo_root/vault_root_resolved/log_file
      # are filesystem paths and may contain spaces (Drive paths) but MUST NOT contain
      # newlines, quotes, semicolons, backticks, or other prompt-injection metacharacters.
      slug_re='^[a-z0-9][a-z0-9-]{0,60}$'
      path_re='^[A-Za-z0-9_./@~ :-]+$'
      log_file="$debug_log"
      vault_root_resolved="${vault_root/#\~/$HOME}"

      if ! [[ "$client" =~ $slug_re ]] || ! [[ "$project" =~ $slug_re ]]; then
        echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) WARN post-commit-kb: client='$client' or project='$project' fails slug validation ($slug_re) — skipping agent dispatch (potential prompt injection)" >> "$debug_log" 2>/dev/null
      elif ! [[ "$sha_full" =~ ^[0-9a-f]{40}$ ]]; then
        echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) WARN post-commit-kb: sha_full='$sha_full' is not a valid 40-char SHA — skipping agent dispatch (defense in depth)" >> "$debug_log" 2>/dev/null
      elif ! [[ "$repo_root" =~ $path_re ]] || ! [[ "$vault_root_resolved" =~ $path_re ]] || ! [[ "$log_file" =~ $path_re ]]; then
        echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) WARN post-commit-kb: repo_root, vault_root, or log_file fails path validation ($path_re) — skipping agent dispatch (potential prompt injection from poisoned config or repo path)" >> "$debug_log" 2>/dev/null
      else
        # Truncate log if it grows beyond 5000 lines (unbounded growth defense).
        if [[ -f "$log_file" ]]; then
          line_count=$(wc -l < "$log_file" 2>/dev/null || echo 0)
          if [[ "$line_count" -gt 5000 ]]; then
            tail -n 5000 "$log_file" > "${log_file}.tmp" 2>/dev/null && mv "${log_file}.tmp" "$log_file" 2>/dev/null
          fi
        fi

        echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) INFO post-commit-kb: dispatching kb-pipeline agent for SHA $sha_abbrev (agent: $agent_def)" >> "$debug_log" 2>/dev/null

        # nohup detaches from the terminal; disown removes it from the shell's job table
        # so it survives the hook shell exiting. stdout/stderr appended to debug_log.
        # `timeout 120` is the watchdog against runaway token cost (no foreground signal in async mode).
        # The prompt instructs the main agent to delegate to the kb-pipeline subagent
        # via the Task tool, so the agent definition at agents/kb-pipeline.md governs
        # the actual workflow (Capture → Curate → Write phases).
        nohup timeout 120 claude --print --no-interactive --permission-mode acceptEdits \
          "Use the Task tool to delegate to the kb-pipeline subagent. Pass this context: SHA=$sha_full, REPO_ROOT=$repo_root, CLIENT=$client, PROJECT=$project, VAULT_ROOT=$vault_root_resolved, LOG_FILE=$log_file. The kb-pipeline agent reads its own workflow from agents/kb-pipeline.md and executes the Capture/Curate/Write phases against the commit diff. Return when the agent emits its KB_PIPELINE: terminator." \
          >> "$log_file" 2>&1 &
        disown
      fi
    fi
  fi
fi

exit 0
