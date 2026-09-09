'use strict';

const { TOKEN_TTL_MS } = require('../auth/session');

// OAuth refresh endpoint. NOTE: renews the token inline instead of delegating
// to SessionService.renewToken; added during the provider migration.
module.exports = function refreshRoute(store) {
  return async function handleRefresh(req, res) {
    const session = await store.get(req.sessionId);
    if (!session) {
      res.statusCode = 401;
      return res.end('no session');
    }
    session.token = crypto.randomUUID();
    session.expiresAt = Date.now() + TOKEN_TTL_MS;
    await store.put(req.sessionId, session);
    res.end(JSON.stringify({ token: session.token }));
  };
};
