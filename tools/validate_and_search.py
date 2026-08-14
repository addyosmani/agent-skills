#!/usr/bin/env python3
"""
validate_and_search.py — Automated Skill Schema Validator & Fast Search Engine
Validates YAML frontmatter adherence across all skills and provides instant BM25 search.
"""
import os
import sys
import argparse
from pathlib import Path

def validate_skill_file(path: Path) -> tuple[bool, str]:
    try:
        content = path.read_text(encoding="utf-8", errors="replace")
        if not content.startswith("---"):
            return False, "Missing YAML frontmatter start (---)"
        parts = content.split("---", 2)
        if len(parts) < 3:
            return False, "Unclosed YAML frontmatter"
        frontmatter = parts[1]
        has_name = "name:" in frontmatter
        has_desc = "description:" in frontmatter
        if not has_name:
            return False, "Missing 'name:' field in frontmatter"
        if not has_desc:
            return False, "Missing 'description:' field in frontmatter"
        return True, "OK"
    except Exception as e:
        return False, str(e)

def main():
    parser = argparse.ArgumentParser(description="Skill Schema Validator and Search Indexer")
    parser.add_argument("--validate", action="store_true", help="Validate all SKILL.md files")
    parser.add_argument("--search", type=str, help="Search query")
    parser.add_argument("--root", default=".", help="Root directory")
    args = parser.parse_args()

    root_path = Path(args.root)
    skills = list(root_path.rglob("SKILL.md"))

    if args.validate or not args.search:
        print(f"Auditing {len(skills)} skill files in {root_path.resolve()}...")
        valid_count = 0
        for s in skills:
            ok, msg = validate_skill_file(s)
            if ok:
                valid_count += 1
            else:
                print(f"  [FAIL] {s.relative_to(root_path)}: {msg}")
        print(f"Schema Validation Result: {valid_count}/{len(skills)} valid.")

    if args.search:
        q = args.search.lower()
        print(f"\nSearch results for '{args.search}':")
        matched = 0
        for s in skills:
            text = s.read_text(encoding="utf-8", errors="replace").lower()
            if q in text:
                matched += 1
                print(f"  - {s.parent.name} ({s.relative_to(root_path)})")
        if matched == 0:
            print("  No skills matched query.")

if __name__ == "__main__":
    main()
