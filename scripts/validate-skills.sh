#!/bin/bash

# Skill validation script for agent-skills repository

set -e

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "Error: This script must be run from the repository root"
  exit 1
fi

# Validate that required directories exist
REQUIRED_DIRS=("skills" "tests")
for dir in "${REQUIRED_DIRS[@]}"; do
  if [ ! -d "$dir" ]; then
    echo "Error: Required directory '$dir' not found"
    exit 1
  fi
done

# Check that each skill has required files
if [ -d "skills" ]; then
  for skill_dir in skills/*; do
    if [ -d "$skill_dir" ]; then
      skill_name=$(basename "$skill_dir")
      
      # Check for index.js
      if [ ! -f "$skill_dir/index.js" ]; then
        echo "Error: Missing index.js in skill '$skill_name'"
        exit 1
      fi
      
      # Check for package.json
      if [ ! -f "$skill_dir/package.json" ]; then
        echo "Error: Missing package.json in skill '$skill_name'"
        exit 1
      fi
      
      # Check for README.md
      if [ ! -f "$skill_dir/README.md" ]; then
        echo "Error: Missing README.md in skill '$skill_name'"
        exit 1
      fi
    fi
  done
fi

# Run basic syntax check on JavaScript files
find . -name "*.js" -not -path "./node_modules/*" | while read js_file; do
  if ! node -c "$js_file" >/dev/null 2>&1; then
    echo "Error: Syntax error in $js_file"
    exit 1
  fi
done

# If we made it here, everything passed
echo "✓ All skills validated successfully"
exit 0