#!/usr/bin/env bash

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
SOURCE_PARENT_DIR="$(cd "${SOURCE_DIR}/.." && pwd)"

TARGET_ROOT="${SOURCE_PARENT_DIR}"
SYNC_CONTENT="both"
OVERWRITE_EXISTING="false"
EXCLUDED_PATHS=("${SOURCE_DIR}")

TMP_DIR="$(mktemp -d)"

projects_scanned=0
projects_updated=0
projects_skipped=0
conflicts_skipped=0
skills_copied_or_updated=0
agents_copied_or_updated=0
errors_count=0
updated_project_paths=()

cleanup() {
  rm -rf "${TMP_DIR}"
}

die() {
  echo "Error: $1" >&2
  exit 1
}

load_config_file() {
  local config_file="$1"

  if [ -f "${config_file}" ]; then
    source "${config_file}"
  fi
}

load_config() {
  load_config_file "${SOURCE_DIR}/sync-copilot-assets.config"
  load_config_file "${SOURCE_DIR}/sync-copilot-assets.local.config"
}

validate_path_exists() {
  local path="$1"

  if [ ! -e "${path}" ]; then
    die "Required path does not exist: ${path}"
  fi
}

should_sync_skills() {
  [ "${SYNC_CONTENT}" = "skills" ] || [ "${SYNC_CONTENT}" = "both" ]
}

should_sync_agents() {
  [ "${SYNC_CONTENT}" = "agents" ] || [ "${SYNC_CONTENT}" = "both" ]
}

validate_sync_content() {
  case "${SYNC_CONTENT}" in
    skills | agents | both)
      return 0
      ;;
    *)
      die "SYNC_CONTENT must be skills, agents, or both"
      ;;
  esac
}

validate_paths() {
  validate_path_exists "${TARGET_ROOT}"
  validate_path_exists "${SOURCE_DIR}"

  if should_sync_skills; then
    validate_path_exists "${SOURCE_DIR}/skills"
  fi

  if should_sync_agents; then
    validate_path_exists "${SOURCE_DIR}/agents"
  fi
}

collect_projects() {
  local find_args=("${TARGET_ROOT}")
  local excluded_path=""

  for excluded_path in "${EXCLUDED_PATHS[@]}"; do
    if [ -z "${excluded_path}" ]; then
      continue
    fi

    find_args+=( \( -path "${excluded_path}" -o -path "${excluded_path}/*" \) -prune -o )
  done

  find "${find_args[@]}" \
    \( -type d -name ".git" -print -prune \) \
    -o \( -type f -name ".git" -print \) |
    while IFS= read -r git_path; do
      dirname "${git_path}"
    done |
    sort -u
}

collect_skill_sources() {
  if ! should_sync_skills; then
    return 0
  fi

  find "${SOURCE_DIR}/skills" -type f -name "SKILL.md" -print | sort
}

collect_agent_sources() {
  local agent_source=""

  if ! should_sync_agents; then
    return 0
  fi

  for agent_source in "${SOURCE_DIR}/agents"/*.md; do
    if [ -f "${agent_source}" ]; then
      printf "%s\n" "${agent_source}"
    fi
  done | sort
}

is_previous_source_content() {
  local source_relative_path="$1"
  local destination_file="$2"
  local commits_file=""
  local commit=""
  local history_file=""

  if ! git -C "${SOURCE_DIR}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    return 1
  fi

  commits_file="$(mktemp "${TMP_DIR}/commits.XXXXXX")"

  if ! git -C "${SOURCE_DIR}" log --format="%H" -- "${source_relative_path}" > "${commits_file}" 2>/dev/null; then
    return 1
  fi

  while IFS= read -r commit; do
    history_file="$(mktemp "${TMP_DIR}/history.XXXXXX")"

    if ! git -C "${SOURCE_DIR}" show "${commit}:${source_relative_path}" > "${history_file}" 2>/dev/null; then
      continue
    fi

    if cmp -s "${destination_file}" "${history_file}"; then
      return 0
    fi
  done < "${commits_file}"

  return 1
}

copy_sync_file() {
  local source_file="$1"
  local destination_file="$2"
  local source_relative_path="$3"
  local destination_dir=""

  destination_dir="$(dirname "${destination_file}")"

  if [ -d "${destination_file}" ]; then
    echo "Error: destination is a directory: ${destination_file}" >&2
    return 3
  fi

  if ! mkdir -p "${destination_dir}"; then
    echo "Error: cannot create directory: ${destination_dir}" >&2
    return 3
  fi

  if [ ! -e "${destination_file}" ]; then
    if cp -p "${source_file}" "${destination_file}"; then
      return 1
    fi

    echo "Error: cannot copy ${source_file} to ${destination_file}" >&2
    return 3
  fi

  if cmp -s "${source_file}" "${destination_file}"; then
    return 0
  fi

  if [ "${OVERWRITE_EXISTING}" = "true" ]; then
    if cp -p "${source_file}" "${destination_file}"; then
      return 1
    fi

    echo "Error: cannot overwrite ${destination_file}" >&2
    return 3
  fi

  if is_previous_source_content "${source_relative_path}" "${destination_file}"; then
    if cp -p "${source_file}" "${destination_file}"; then
      return 1
    fi

    echo "Error: cannot update ${destination_file}" >&2
    return 3
  fi

  echo "Conflict skipped: ${destination_file}"
  return 2
}

process_source_file() {
  local project_path="$1"
  local source_file="$2"
  local source_relative_path=""
  local destination_file=""
  local status=0

  source_relative_path="${source_file#${SOURCE_DIR}/}"
  destination_file="${project_path}/.github/${source_relative_path}"

  copy_sync_file "${source_file}" "${destination_file}" "${source_relative_path}"
  status=$?

  if [ "${status}" -eq 1 ]; then
    case "${source_relative_path}" in
      skills/*)
        skills_copied_or_updated=$((skills_copied_or_updated + 1))
        ;;
      agents/*)
        agents_copied_or_updated=$((agents_copied_or_updated + 1))
        ;;
    esac
  fi

  if [ "${status}" -eq 2 ]; then
    conflicts_skipped=$((conflicts_skipped + 1))
  fi

  if [ "${status}" -eq 3 ]; then
    errors_count=$((errors_count + 1))
  fi

  return "${status}"
}

process_project() {
  local project_path="$1"
  local source_file=""
  local status=0
  local project_changed=0
  local project_had_error=0

  while IFS= read -r source_file; do
    process_source_file "${project_path}" "${source_file}"
    status=$?

    if [ "${status}" -eq 1 ]; then
      project_changed=1
    fi

    if [ "${status}" -eq 3 ]; then
      project_had_error=1
    fi
  done < "${TMP_DIR}/source-files"

  if [ "${project_changed}" -eq 1 ]; then
    projects_updated=$((projects_updated + 1))
    updated_project_paths+=("${project_path}")
    return 0
  fi

  if [ "${project_had_error}" -eq 1 ]; then
    return 0
  fi

  projects_skipped=$((projects_skipped + 1))
}

print_summary() {
  local path=""

  echo
  echo "Summary"
  echo "target root:              ${TARGET_ROOT}"
  echo "sync content:             ${SYNC_CONTENT}"
  echo "overwrite existing:       ${OVERWRITE_EXISTING}"
  echo "projects scanned:         ${projects_scanned}"
  echo "projects updated:         ${projects_updated}"
  echo "projects skipped:         ${projects_skipped}"
  echo "conflicts skipped:        ${conflicts_skipped}"
  echo "skills copied or updated: ${skills_copied_or_updated}"
  echo "agents copied or updated: ${agents_copied_or_updated}"
  echo "errors:                   ${errors_count}"

  if [ "${#updated_project_paths[@]}" -gt 0 ]; then
    echo
    echo "updated projects:"
    for path in "${updated_project_paths[@]}"; do
      echo "  ${path}"
    done
  fi
}

main() {
  local project_path=""

  if [ "$#" -ne 0 ]; then
    die "Usage: $0"
  fi

  load_config
  validate_sync_content
  validate_paths

  : > "${TMP_DIR}/source-files"

  collect_skill_sources >> "${TMP_DIR}/source-files"
  collect_agent_sources >> "${TMP_DIR}/source-files"

  if [ ! -s "${TMP_DIR}/source-files" ]; then
    die "No source files found for SYNC_CONTENT=${SYNC_CONTENT}"
  fi

  collect_projects > "${TMP_DIR}/projects"

  while IFS= read -r project_path; do
    projects_scanned=$((projects_scanned + 1))
    process_project "${project_path}"
  done < "${TMP_DIR}/projects"

  print_summary

  if [ "${errors_count}" -gt 0 ]; then
    exit 1
  fi
}

trap cleanup EXIT

main "$@"
