# checkout-api alerting

Paging rules for checkout-api's 5-minute error rate.

- `alerting/rules.py`: the paging rules. `static_rule` is the one in production.
- `deploy/alerting.yaml`: the configuration production loads. It overrides code defaults.
- `data/replay.py`: a seeded six-week replay of the error rate, with every incident from the
  postmortem log labeled. Use it for offline backtests: `python3 -c "from data.replay import load"`.

The on-call rotation's two complaints are missed slow incidents and pages at night that turn out
to be nothing. A rule change should improve one without making the other worse.
