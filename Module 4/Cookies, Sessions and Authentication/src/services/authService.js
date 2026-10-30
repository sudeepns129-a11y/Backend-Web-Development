const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');

class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const DUMMY_PASSWORD_HASH = '$2b$12$oqTrpiO9II7BkLscQjyeAOrXNQyzLRnidCokjpgR4JBA75bHIDvfq';

function validateRegisterInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError(400, 'INVALID_INPUT', 'Name, email, and password are required');
  }
  if (typeof body.name !== 'string' || !body.name.trim()) throw new AppError(400, 'INVALID_INPUT', 'Name, email, and password are required');
  if (typeof body.email !== 'string' || !body.email.trim()) throw new AppError(400, 'INVALID_INPUT', 'Name, email, and password are required');
  if (typeof body.password !== 'string' || !body.password.trim()) throw new AppError(400, 'INVALID_INPUT', 'Name, email, and password are required');
}

function validateLoginInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError(400, 'INVALID_INPUT', 'Email and password are required');
  }
  if (typeof body.email !== 'string' || !body.email.trim()) throw new AppError(400, 'INVALID_INPUT', 'Email and password are required');
  if (typeof body.password !== 'string' || !body.password.trim()) throw new AppError(400, 'INVALID_INPUT', 'Email and password are required');
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function invalidCredentialsError() {
  return new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
}

async function register(body) {
  validateRegisterInput(body);
  const name = body.name.trim();
  const email = normalizeEmail(body.email);
  if (!isValidEmail(email)) throw new AppError(400, 'INVALID_INPUT', 'Invalid email format');

  const existing = await userRepository.findByEmail(email);
  if (existing) throw new AppError(409, 'EMAIL_EXISTS', 'Email already registered');

  const cost = Number(process.env.BCRYPT_COST || 12);
  const passwordHash = await bcrypt.hash(body.password, Number.isInteger(cost) && cost >= 4 && cost <= 31 ? cost : 12);
  try {
    return await userRepository.createUser({ name, email, passwordHash });
  } catch (error) {
    if (error && error.code === 'P2002') throw new AppError(409, 'EMAIL_EXISTS', 'Email already registered');
    throw error;
  }
}

async function login(body) {
  validateLoginInput(body);
  const email = normalizeEmail(body.email);
  if (!isValidEmail(email)) throw new AppError(400, 'INVALID_INPUT', 'Invalid email format');

  const user = await userRepository.findByEmail(email);
  const passwordHash = user ? user.passwordHash : DUMMY_PASSWORD_HASH;
  const validPassword = await bcrypt.compare(body.password, passwordHash);
  if (!user || !validPassword) throw invalidCredentialsError();
  return user;
}

module.exports = { AppError, register, login, normalizeEmail, isValidEmail };
