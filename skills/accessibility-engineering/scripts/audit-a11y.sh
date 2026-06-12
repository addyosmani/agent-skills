#!/bin/bash
set -e

# accessibility-engineering: audit-a11y.sh
# Runs automated accessibility checks on a given URL or file.
# Outputs structured JSON with violations grouped by severity.
#
# Usage:
#   bash audit-a11y.sh url <url> [--json]
#   bash audit-a11y.sh file <path> [--json]
#
# Requires: npx (axe-core, pa11y available via npx)

SCRIPT_NAME="audit-a11y"
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

MODE="${1:-}"
TARGET="${2:-}"
FORMAT="${3:-text}"

if [ -z "$MODE" ] || [ -z "$TARGET" ]; then
  echo "Usage: bash audit-a11y.sh url <url> [--json]" >&2
  echo "       bash audit-a11y.sh file <path> [--json]" >&2
  exit 1
fi

case "$MODE" in
  url)
    echo "Running axe-core audit on $TARGET..." >&2
    npx @axe-core/cli "$TARGET" --save "$TEMP_DIR/axe-report.json" 2>/dev/null || true

    echo "Running pa11y audit on $TARGET..." >&2
    npx pa11y "$TARGET" --reporter json 2>/dev/null > "$TEMP_DIR/pa11y-report.json" || true
    ;;
  file)
    echo "Running pa11y on file $TARGET..." >&2
    npx pa11y --html-file "$TARGET" --reporter json 2>/dev/null > "$TEMP_DIR/pa11y-report.json" || true
    echo "File-based axe analysis limited; prefer URL mode for full coverage." >&2
    ;;
  *)
    echo "Unknown mode: $MODE. Use 'url' or 'file'." >&2
    exit 1
    ;;
esac

# Merge results into structured JSON output
RESULT_FILE="$TEMP_DIR/result.json"

cat > "$RESULT_FILE" << 'RESULT_EOF'
{
  "tool": "audit-a11y",
  "summary": {
    "violations": 0,
    "critical": 0,
    "serious": 0,
    "moderate": 0,
    "minor": 0
  },
  "violations": [],
  "recommendations": []
}
RESULT_EOF

# Parse axe results
if [ -f "$TEMP_DIR/axe-report.json" ]; then
  node -e "
    const fs = require('fs');
    const result = JSON.parse(fs.readFileSync('$TEMP_DIR/result.json', 'utf8'));
    try {
      const axe = JSON.parse(fs.readFileSync('$TEMP_DIR/axe-report.json', 'utf8'));
      if (axe.results && axe.results.violations) {
        result.summary.violations += axe.results.violations.length;
        for (const v of axe.results.violations) {
          const sev = v.impact || 'minor';
          if (result.summary[sev] !== undefined) result.summary[sev]++;
          result.violations.push({
            source: 'axe-core',
            id: v.id,
            impact: sev,
            description: v.description,
            help: v.help,
            helpUrl: v.helpUrl,
            tags: v.tags || [],
            nodes: (v.nodes || []).map(n => ({
              html: n.html,
              target: n.target,
              failureSummary: n.failureSummary
            }))
          });
        }
      }
    } catch (e) {
      // axe report may be empty or malformed
    }
    fs.writeFileSync('$TEMP_DIR/result.json', JSON.stringify(result, null, 2));
  "
fi

# Parse pa11y results
if [ -f "$TEMP_DIR/pa11y-report.json" ]; then
  node -e "
    const fs = require('fs');
    const result = JSON.parse(fs.readFileSync('$TEMP_DIR/result.json', 'utf8'));
    try {
      const pa11y = JSON.parse(fs.readFileSync('$TEMP_DIR/pa11y-report.json', 'utf8'));
      const issues = Array.isArray(pa11y) ? pa11y : (pa11y.issues || []);
      result.summary.violations += issues.length;
      for (const issue of issues) {
        const sev = (issue.typeCode === 1 ? 'critical' : issue.typeCode === 2 ? 'serious' : issue.typeCode === 3 ? 'moderate' : 'minor');
        if (result.summary[sev] !== undefined) result.summary[sev]++;
        result.violations.push({
          source: 'pa11y',
          code: issue.code,
          impact: sev,
          message: issue.message,
          selector: issue.selector,
          context: issue.context,
          type: issue.type
        });
      }
    } catch (e) {
      // pa11y report may be empty or malformed
    }
    fs.writeFileSync('$TEMP_DIR/result.json', JSON.stringify(result, null, 2));
  "
fi

if [ "$FORMAT" = "--json" ]; then
  cat "$RESULT_FILE"
else
  node -e "
    const r = JSON.parse(require('fs').readFileSync('$RESULT_FILE', 'utf8'));
    console.log('Accessibility Audit Results');
    console.log('===========================');
    console.log('Total violations: ' + r.summary.violations);
    console.log('  Critical: ' + r.summary.critical);
    console.log('  Serious:  ' + r.summary.serious);
    console.log('  Moderate: ' + r.summary.moderate);
    console.log('  Minor:    ' + r.summary.minor);
    console.log('');
    for (const v of r.violations) {
      console.log('[' + v.impact.toUpperCase() + '] ' + (v.help || v.message || v.id));
      if (v.nodes && v.nodes[0]) console.log('  → ' + v.nodes[0].target);
      if (v.selector) console.log('  → ' + v.selector);
      console.log('');
    }
  "
fi
