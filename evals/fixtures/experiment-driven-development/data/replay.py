"""Replay of checkout-api's 5-minute error rate and its postmortem incidents.

Production metrics cannot leave the cluster, so offline backtests use this
seeded replay, fitted to the last six weeks of traffic.
"""
import math
import random

BUCKET_MIN = 5
PER_DAY = 24 * 60 // BUCKET_MIN


def load(days=42, seed=7):
    """Return (rates, incidents); incidents are (start, end, kind) bucket indices."""
    rng = random.Random(seed)
    n = days * PER_DAY
    rates = []
    for i in range(n):
        h = (i % PER_DAY) * BUCKET_MIN / 60
        day = 7 <= h <= 21
        base = 0.010 + 0.012 * math.sin(math.pi * (h - 7) / 14) if day else 0.010
        rates.append(base * math.exp(rng.gauss(0, 0.18 if day else 0.30)))
    incidents = []
    kinds = ["sharp"] * 8 + ["step"] * 8 + ["ramp"] * 8
    rng.shuffle(kinds)
    starts = sorted(rng.sample(range(PER_DAY, n - PER_DAY, PER_DAY // 3), len(kinds)))
    for s, kind in zip(starts, kinds):
        if kind == "sharp":
            dur, peak, rise = rng.randint(3, 10), rng.uniform(0.07, 0.15), 1
        elif kind == "step":
            dur, peak, rise = rng.randint(6, 18), rng.uniform(0.034, 0.045), 1
        else:
            rise = rng.randint(24, 36)
            dur, peak = rise + rng.randint(6, 12), rng.uniform(0.034, 0.048)
        for j in range(dur):
            level = peak * min(1.0, (j + 1) / rise)
            rates[s + j] = max(rates[s + j], level * math.exp(rng.gauss(0, 0.06)))
        incidents.append((s, s + dur, kind))
    return rates, incidents
