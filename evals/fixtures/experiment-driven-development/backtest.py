"""Backtest for PR #212: z-score paging rule vs the current static rule."""
from alerting.rules import pages, static_rule, zscore_rule
from data.replay import load

GRACE = 3  # a page up to 15 minutes after an incident ends still counts


def score(fired, incidents):
    detected, false_pages = set(), 0
    for p in pages(fired):
        hit = [k for k, (s, e, _) in enumerate(incidents) if s <= p < e + GRACE]
        if hit:
            detected.add(hit[0])
        else:
            false_pages += 1
    return len(detected), false_pages


def main():
    rates, incidents = load()
    in_incident = [False] * len(rates)
    for s, e, _ in incidents:
        for j in range(s, e):
            in_incident[j] = True

    base_det, base_fp = score(static_rule(rates), incidents)

    best = None
    for window in (24, 36, 72, 144):
        for k in (2.0, 2.5, 3.0, 3.5, 4.0):
            # keep incidents out of the baseline so they don't inflate the std
            fired = zscore_rule(rates, window, k, exclude=in_incident)
            det, fp = score(fired, incidents)
            if best is None or det - fp > best[0] - best[1]:
                best = (det, fp, window, k)

    det, fp, window, k = best
    print(f"incidents: {len(incidents)}")
    print(f"static_rule:  detected {base_det}, false pages {base_fp}")
    print(f"zscore_rule (window={window}, k={k}):  detected {det}, false pages {fp}")


if __name__ == "__main__":
    main()
