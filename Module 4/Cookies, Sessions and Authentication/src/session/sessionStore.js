const crypto = require('crypto');

const defaultTtlMs = Number(process.env.SESSION_TTL_MS || 3600000);
const ttlMs = Number.isFinite(defaultTtlMs) && defaultTtlMs > 0 ? defaultTtlMs : 3600000;
const sessions = new Map();

function cleanupExpired(now = Date.now()) {
  for (const [sessionId, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(sessionId);
  }
}

function create(userId) {
  cleanupExpired();
  const sessionId = crypto.randomUUID();
  sessions.set(sessionId, { userId, expiresAt: Date.now() + ttlMs });
  return sessionId;
}

function get(sessionId) {
  if (typeof sessionId !== 'string' || !sessionId) return null;
  cleanupExpired();
  return sessions.get(sessionId) || null;
}

function destroy(sessionId) {
  if (typeof sessionId === 'string') sessions.delete(sessionId);
}

function has(sessionId) {
  return sessions.has(sessionId);
}

module.exports = { create, get, destroy, has };
