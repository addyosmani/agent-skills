# PR #212: replace the static error-rate page with an adaptive z-score rule

The static threshold misses most incidents. This adds `zscore_rule`, which pages when the error
rate is `k` standard deviations above its recent baseline, and switches checkout-api to it.

## Results (`python3 backtest.py`, six weeks of replay)

| Rule | Incidents detected | False pages |
|---|---|---|
| static_rule (current) | 8 / 24 | 0 |
| zscore_rule (window=36, k=3.0) | **23 / 24** | 1 |

Nearly triples detection for one extra false page in six weeks. Proposed config:

```yaml
checkout-api:
  rule: zscore_rule
  params:
    window: 36
    k: 3.0
    consecutive: 2
```
