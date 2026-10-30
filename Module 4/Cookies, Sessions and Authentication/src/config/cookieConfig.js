const cookieName = 'sid';
const sessionTtlMs = Number(process.env.SESSION_TTL_MS || 3600000);

function getCookieConfig() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    signed: true,
    path: '/',
    maxAge: Number.isFinite(sessionTtlMs) && sessionTtlMs > 0 ? sessionTtlMs : 3600000,
  };
}

function getCookieClearConfig() {
  const config = getCookieConfig();
  const { maxAge, ...clearConfig } = config;
  return clearConfig;
}

module.exports = { cookieName, getCookieConfig, getCookieClearConfig };
