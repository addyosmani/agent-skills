#!/bin/bash
# create-workflow.sh — create the organisation's workflow states in a Linear team.
#
# Usage: skills/linear/scripts/create-workflow.sh <TEAM-KEY>      (or LINEAR_TEAM=<key>)
# Needs: LINEAR_API_KEY (a Linear personal API key), python3, network access.
#
# Idempotent: reads the team's existing states, creates only the missing ones from
# workflow.json next to this script's folder, enables triage on the team, and prints
# the resulting states as JSON on stdout. Status goes to stderr. Never deletes or
# renames a state the team already has.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
WORKFLOW="$HERE/../workflow.json"
TEAM_KEY="${1:-${LINEAR_TEAM:-}}"
[ -n "$TEAM_KEY" ] || { echo "usage: create-workflow.sh <TEAM-KEY>  (or set LINEAR_TEAM)" >&2; exit 2; }
[ -n "${LINEAR_API_KEY:-}" ] || { echo "set LINEAR_API_KEY to a Linear personal API key" >&2; exit 2; }
[ -f "$WORKFLOW" ] || { echo "missing $WORKFLOW" >&2; exit 2; }
TMP="$(mktemp -t linear-workflow.XXXXXX)"
trap 'rm -f "$TMP"' EXIT

echo "creating the workflow in Linear team $TEAM_KEY" >&2
WORKFLOW="$WORKFLOW" TEAM_KEY="$TEAM_KEY" python3 - "$TMP" <<'PY'
import json, os, sys, urllib.request

API = "https://api.linear.app/graphql"
KEY = os.environ["LINEAR_API_KEY"]
TEAM_KEY = os.environ["TEAM_KEY"]
COLORS = {"triage": "#95a2b3", "backlog": "#bec2c8", "unstarted": "#e2e2e2", "started": "#f2c94c", "completed": "#5e6ad2", "canceled": "#95a2b3"}

def gql(query, variables=None):
    body = json.dumps({"query": query, "variables": variables or {}}).encode()
    req = urllib.request.Request(API, data=body, headers={"Content-Type": "application/json", "Authorization": KEY})
    with urllib.request.urlopen(req, timeout=30) as r:
        out = json.load(r)
    if out.get("errors"):
        sys.stderr.write("Linear error: %s\n" % json.dumps(out["errors"]))
        sys.exit(1)
    return out["data"]

with open(os.environ["WORKFLOW"]) as f:
    wanted = json.load(f)["states"]

teams = gql("query($key:String!){ teams(filter:{key:{eq:$key}}){ nodes{ id key name triageEnabled states{ nodes{ id name type position } } } } }", {"key": TEAM_KEY})["teams"]["nodes"]
if not teams:
    sys.stderr.write("no Linear team with key %s\n" % TEAM_KEY); sys.exit(1)
team = teams[0]
existing = {s["name"]: s for s in team["states"]["nodes"]}
sys.stderr.write("team %s (%s): %d existing states\n" % (team["name"], team["key"], len(existing)))

if not team["triageEnabled"]:
    gql("mutation($id:String!){ teamUpdate(id:$id, input:{triageEnabled:true}){ success } }", {"id": team["id"]})
    sys.stderr.write("triage enabled\n")

created = []
for position, st in enumerate(wanted):
    if st["name"] in existing:
        have = existing[st["name"]]
        if have["type"] != st["type"]:
            sys.stderr.write("WARNING: state %r exists with type %s, wanted %s; left as is\n" % (st["name"], have["type"], st["type"]))
        continue
    data = gql("mutation($input:WorkflowStateCreateInput!){ workflowStateCreate(input:$input){ success workflowState{ id name type position } } }",
               {"input": {"teamId": team["id"], "name": st["name"], "type": st["type"], "description": st["description"], "color": COLORS[st["type"]], "position": float(position)}})
    created.append(data["workflowStateCreate"]["workflowState"])
    sys.stderr.write("created %s (%s)\n" % (st["name"], st["type"]))

final = gql("query($id:String!){ team(id:$id){ states{ nodes{ id name type position } } } }", {"id": team["id"]})["team"]["states"]["nodes"]
final.sort(key=lambda s: (s["position"], s["name"]))
with open(sys.argv[1], "w") as f:
    json.dump({"team": {"id": team["id"], "key": team["key"], "name": team["name"]}, "created": [c["name"] for c in created], "states": final}, f, indent=2)
sys.stderr.write("done: %d created, %d states in the team\n" % (len(created), len(final)))
PY
cat "$TMP"
