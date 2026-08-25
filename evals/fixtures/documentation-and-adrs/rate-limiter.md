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

- [2024-11-03] Initial limiter documented.
