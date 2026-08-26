// Token bucket limiter.

const CAPACITY = 60;           // burst size, in tokens
const REFILL_PER_SECOND = 1;   // sustained rate -> 60 requests / minute

function createLimiter(now = () => Date.now()) {
  const buckets = new Map();

  return function allow(clientId) {
    const t = now();
    const b = buckets.get(clientId) || { tokens: CAPACITY, updated: t };
    const refill = ((t - b.updated) / 1000) * REFILL_PER_SECOND;
    b.tokens = Math.min(CAPACITY, b.tokens + refill);
    b.updated = t;
    if (b.tokens < 1) {
      buckets.set(clientId, b);
      return false;
    }
    b.tokens -= 1;
    buckets.set(clientId, b);
    return true;
  };
}

module.exports = { createLimiter, CAPACITY, REFILL_PER_SECOND };
