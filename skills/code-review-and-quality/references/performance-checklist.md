# Performance Review Checklist

Run this alongside the Performance axis of the five-axis review whenever a
change touches hot paths, data fetching, UI rendering, or anything a user
will wait on. Quantify findings when you can — "this adds ~50ms per list item"
beats "this could be slow."

## Data fetching & queries

- [ ] No N+1 query patterns (per-item queries in loops)
- [ ] List endpoints paginated; no unbounded fetches
- [ ] Queries use appropriate indexes; no table scans in hot paths
- [ ] No fetching fields/records the caller never uses
- [ ] Caching applied where the same data is requested repeatedly, with a
      sensible invalidation story

## Async & blocking

- [ ] No synchronous/blocking operations inside async paths
- [ ] No busy-wait loops or unbounded retries without backoff
- [ ] Long-running work doesn't hold locks, connection pools, or thread pools
- [ ] Timeouts on all external calls (HTTP, DB, filesystem)

## Hot paths & allocation

- [ ] No large allocations or copies inside loops (e.g. per-iteration
      cloning, string concatenation in a loop)
- [ ] No accidental O(n²): nested loops over the same collection, repeated
      linear scans where a map/set/index suffices
- [ ] No re-computation of values that could be hoisted or memoized
- [ ] Database calls inside render loops or per-row handlers

## UI

- [ ] No unnecessary re-renders (unstable props, missing memoization where it
      pays off)
- [ ] No synchronous heavy work on the main/UI thread
- [ ] Large lists virtualized; images lazy-loaded where appropriate

## Deployables

- [ ] No significant bundle/binary size regressions from the change
- [ ] Startup-time work (eager initialization, heavy imports) not added to
      request paths
- [ ] Background jobs have concurrency limits; no unbounded queue growth

## Verification

- [ ] Performance claims backed by a profile or benchmark, not intuition
- [ ] Baseline vs after comparison where the change is performance-sensitive
- [ ] Regressions are **Required** findings; don't defer a measurable slowdown
      without a filed bug and owner
