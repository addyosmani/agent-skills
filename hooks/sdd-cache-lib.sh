#!/bin/bash
# sdd-cache-lib.sh — Shared functions for sdd-cache hooks and tests

# Cache key is sha256(URL), truncated to 128 bits (32 hex chars).
hash_key() {
  if command -v shasum >/dev/null 2>&1; then
    printf '%s' "$1" | shasum -a 256 | cut -c1-32
  else
    printf '%s' "$1" | sha256sum | cut -c1-32
  fi
}

# Extracts the final response's headers (last paragraph) to avoid picking
# up validators from intermediate 301/302 hops.
get_final_headers() {
  local head_out="$1"
  printf '%s' "$head_out" | awk '
    BEGIN { RS = ""; last = "" }
    { last = $0 }
    END { print last }
  '
}

extract_header() {
  local final_headers="$1"
  local name="$2"
  printf '%s' "$final_headers" | awk -v h="$name" '
    BEGIN { FS = ":" }
    tolower($1) == tolower(h) {
      sub(/^[^:]*:[ \t]*/, "")
      sub(/[ \t]+$/, "")
      print
      exit
    }
  '
}
