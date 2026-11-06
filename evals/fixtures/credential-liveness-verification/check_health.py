#!/usr/bin/env python3
"""Nightly integration health check.

Reports healthy when the credential file is present and was written recently.
This is the checker under test: it never makes an authenticated call.
"""
import datetime
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).parent
STALE_AFTER = datetime.timedelta(days=3)


def load():
    return json.loads((HERE / "integrations.json").read_text())


def main():
    now = datetime.datetime.now(datetime.timezone.utc)
    results = []
    for item in load()["integrations"]:
        token = item.get("token") or ""
        checked = item.get("checked_at") or ""
        try:
            checked_at = datetime.datetime.fromisoformat(checked.replace("Z", "+00:00"))
        except ValueError:
            checked_at = None

        if not token:
            state = "missing"
        elif checked_at is None or (now - checked_at) > STALE_AFTER:
            state = "stale-file"
        else:
            state = "healthy"
        results.append({"name": item["name"], "state": state})

    for row in results:
        print("%-20s %s" % (row["name"], row["state"]))

    bad = [r for r in results if r["state"] != "healthy"]
    if bad:
        print("\n%d integration(s) need attention" % len(bad))
        return 1
    print("\nall integrations healthy")
    return 0


if __name__ == "__main__":
    sys.exit(main())
