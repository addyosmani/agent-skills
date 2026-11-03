"""Paging rules for checkout-api. Each rule maps a series of 5-minute error
rates to a per-bucket boolean: True while the rule is firing."""


def static_rule(rates, threshold=0.05, consecutive=2):
    """Fire after `consecutive` buckets above a fixed error-rate threshold."""
    fired, run = [], 0
    for r in rates:
        run = run + 1 if r > threshold else 0
        fired.append(run >= consecutive)
    return fired


def zscore_rule(rates, window=36, k=3.0, consecutive=2, exclude=None):
    """Fire after `consecutive` buckets more than `k` standard deviations above
    the mean of the previous `window` buckets. Buckets flagged in `exclude`
    are left out of the baseline."""
    fired, run = [], 0
    for i, r in enumerate(rates):
        hist = [rates[j] for j in range(max(0, i - window), i) if not (exclude and exclude[j])]
        if len(hist) < 6:
            fired.append(False)
            continue
        mean = sum(hist) / len(hist)
        sd = (sum((x - mean) ** 2 for x in hist) / len(hist)) ** 0.5 or 1e-9
        run = run + 1 if (r - mean) / sd > k else 0
        fired.append(run >= consecutive)
    return fired


def pages(fired):
    """Bucket indices where a page is sent (the rule starts firing)."""
    return [i for i, f in enumerate(fired) if f and (i == 0 or not fired[i - 1])]
