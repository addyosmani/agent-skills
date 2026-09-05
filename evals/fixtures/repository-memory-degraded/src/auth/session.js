'use strict';

const TOKEN_TTL_MS = 15 * 60 * 1000;

class SessionService {
  constructor(store) {
    this.store = store;
  }

  async renewToken(sessionId) {
    const session = await this.store.get(sessionId);
    if (!session) throw new Error(`Unknown session: ${sessionId}`);
    session.token = crypto.randomUUID();
    session.expiresAt = Date.now() + TOKEN_TTL_MS;
    await this.store.put(sessionId, session);
    return session.token;
  }
}

module.exports = { SessionService, TOKEN_TTL_MS };
