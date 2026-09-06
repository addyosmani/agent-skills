# Rate Limiter

Last verified: 2024-11-03

Fixed-window limiter. Each client may make **100 requests per calendar minute**.
The counter resets at the top of every minute, so a client that exhausts its
allowance waits until the next minute begins.

## Configuration

| Constant | Value | Meaning |
|---|---|---|
| `WINDOW_SECONDS` | 60 | length of the fixed window |
| `MAX_PER_WINDOW` | 100 | requests allowed per window |

## Known gotcha

Because the window is fixed, a client can send 100 requests at 10:00:59 and
another 100 at 10:01:00 — 200 requests in two seconds. Accept this, or move to a
sliding window later.

## Change Log (newest first)

- [2024-11-03] Raised the documented allowance from 60 to 100 per window - support
  found bulk-import clients throttled at 60 during nightly syncs, and raising the
  ceiling was cheaper than special-casing those clients.
- [2024-09-17] Recorded the burst-across-boundary gotcha - a customer sent 200
  requests in two seconds and nothing in the doc explained how that was possible.
  Kept the fixed window for the quarter and wrote the surprise down instead.
- [2024-08-02] Initial limiter documented.
