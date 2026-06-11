#!/usr/bin/env bash
# Generates a JSON index of skills for the skill-router.
# Run from the repository root.

SKILLS_DIR="skills"
INDEX_FILE="skills/skill-router/scripts/skill-index.json"

echo "{" > "$INDEX_FILE"
echo "  \"skills\": [" >> "$INDEX_FILE"

first=true
for dir in "$SKILLS_DIR"/*/; do
    if [ -f "$dir/SKILL.md" ]; then
        skill_name=$(basename "$dir")
        description=$(grep -A1 '^description:' "$dir/SKILL.md" | tail -n1 | sed 's/^description: //' | sed 's/"/\\"/g')
        
        if [ "$first" = true ]; then
            first=false
        else
            echo "," >> "$INDEX_FILE"
        fi
        
        echo -n "    {\"name\": \"$skill_name\", \"description\": \"$description\"}" >> "$INDEX_FILE"
    fi
done

echo "" >> "$INDEX_FILE"
echo "  ]" >> "$INDEX_FILE"
echo "}" >> "$INDEX_FILE"

echo "✅ Skill index generated at $INDEX_FILE"
