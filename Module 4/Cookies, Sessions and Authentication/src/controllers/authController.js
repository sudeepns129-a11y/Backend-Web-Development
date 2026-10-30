const authService = require('../services/authService');
const { serializeUser } = require('../serializers/userSerializer');
const sessionStore = require('../session/sessionStore');
const { cookieName, getCookieConfig, getCookieClearConfig } = require('../config/cookieConfig');

async function register(req, res, next) {
  try {
    const user = await authService.register(req.body);
    return res.status(201).json({ data: serializeUser(user) });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const user = await authService.login(req.body);
    const sessionId = sessionStore.create(user.id);
    res.cookie(cookieName, sessionId, getCookieConfig());
    return res.status(200).json({ data: serializeUser(user) });
  } catch (error) {
    return next(error);
  }
}

function me(req, res) {
  return res.status(200).json({ data: serializeUser(req.user) });
}

function logout(req, res) {
  const sessionId = req.signedCookies && req.signedCookies[cookieName];
  if (sessionId) sessionStore.destroy(sessionId);
  res.clearCookie(cookieName, getCookieClearConfig());
  return res.status(204).send();
}

module.exports = { register, login, me, logout };
