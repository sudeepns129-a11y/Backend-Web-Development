const authService = require('../services/authService');
const { serializeUser } = require('../serializers/userSerializer');

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
    return res.status(200).json({ data: serializeUser(user) });
  } catch (error) {
    return next(error);
  }
}

module.exports = { register, login };
