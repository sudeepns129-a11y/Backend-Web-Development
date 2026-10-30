const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');

process.env.DATABASE_URL = 'file:./test.db';
process.env.COOKIE_SECRET = 'test-cookie-secret-at-least-32-characters';
process.env.BCRYPT_COST = '4';

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/db/prisma');
const userRepository = require('../src/repositories/userRepository');

async function resetDatabase() {
  await prisma.user.deleteMany();
}

test('registration stores a bcrypt hash and returns only public fields', async () => {
  await resetDatabase();
  const response = await request(app).post('/auth/register').send({ name: 'Sam', email: '  Sam@Example.COM ', password: 'correct horse battery staple' });
  assert.equal(response.status, 201);
  assert.deepEqual(Object.keys(response.body.data).sort(), ['email', 'id', 'name']);
  assert.equal(response.body.data.name, 'Sam');
  assert.equal(response.body.data.email, 'sam@example.com');
  assert.equal('password' in response.body.data, false);
  assert.equal('passwordHash' in response.body.data, false);

  const stored = await userRepository.findByEmail('sam@example.com');
  assert.equal(stored.passwordHash.includes('correct horse battery staple'), false);
  assert.equal(await bcrypt.compare('correct horse battery staple', stored.passwordHash), true);
});

test('normalized duplicate registration returns 409', async () => {
  await resetDatabase();
  await request(app).post('/auth/register').send({ name: 'Sam', email: 'sam@example.com', password: 'first-password' });
  const response = await request(app).post('/auth/register').send({ name: 'Other', email: ' SAM@EXAMPLE.COM ', password: 'second-password' });
  assert.equal(response.status, 409);
  assert.equal(response.body.error.code, 'EMAIL_EXISTS');
});

test('valid login and invalid credentials behave securely', async () => {
  await resetDatabase();
  await request(app).post('/auth/register').send({ name: 'Sam', email: 'sam@example.com', password: 'correct horse battery staple' });

  const valid = await request(app).post('/auth/login').send({ email: ' SAM@EXAMPLE.COM ', password: 'correct horse battery staple' });
  assert.equal(valid.status, 200);
  assert.deepEqual(Object.keys(valid.body.data).sort(), ['email', 'id', 'name']);

  const wrong = await request(app).post('/auth/login').send({ email: 'sam@example.com', password: 'wrong-password' });
  const unknown = await request(app).post('/auth/login').send({ email: 'unknown@example.com', password: 'wrong-password' });
  assert.equal(wrong.status, 401);
  assert.equal(unknown.status, 401);
  assert.deepEqual(wrong.body, unknown.body);
  assert.deepEqual(wrong.body, { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
});

test('missing and malformed inputs return 400', async () => {
  for (const body of [{}, { name: '', email: 'sam@example.com', password: 'password' }, { name: 'Sam', email: 'not-an-email', password: 'password' }, null]) {
    const response = await request(app).post('/auth/register').send(body);
    assert.equal(response.status, 400);
  }
  const login = await request(app).post('/auth/login').send({ email: 'sam@example.com' });
  assert.equal(login.status, 400);
});

test('unexpected repository errors return a controlled 500 response', async () => {
  const original = userRepository.findByEmail;
  userRepository.findByEmail = async () => { throw new Error('database password and secret leak'); };
  try {
    const response = await request(app).post('/auth/login').send({ email: 'sam@example.com', password: 'password' });
    assert.equal(response.status, 500);
    assert.deepEqual(response.body, { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
    assert.equal(JSON.stringify(response.body).includes('database password'), false);
  } finally {
    userRepository.findByEmail = original;
  }
});

test('session lifecycle supports login, me, tampering, logout, and replay protection', async () => {
  await resetDatabase();
  await request(app).post('/auth/register').send({ name: 'Sam', email: 'sam@example.com', password: 'correct horse battery staple' });
  const agent = request.agent(app);

  const login = await agent.post('/auth/login').send({ email: 'sam@example.com', password: 'correct horse battery staple' });
  assert.equal(login.status, 200);
  const setCookie = login.headers['set-cookie'];
  assert.ok(setCookie);
  assert.ok(setCookie.some(cookie => cookie.startsWith('sid=')));
  assert.ok(setCookie.some(cookie => cookie.includes('HttpOnly')));
  assert.ok(setCookie.some(cookie => /SameSite=Lax/i.test(cookie)));
  const oldCookie = setCookie.find(cookie => cookie.startsWith('sid=')).split(';')[0];
  const signedValue = decodeURIComponent(oldCookie.slice('sid='.length));
  const cookieSignature = require('cookie-signature');
  const sessionId = cookieSignature.unsign(signedValue.startsWith('s:') ? signedValue.slice(2) : signedValue, process.env.COOKIE_SECRET);
  assert.ok(sessionId);
  const sessionStore = require('../src/session/sessionStore');
  assert.ok(sessionStore.get(sessionId));
  assert.equal(sessionStore.get(sessionId).userId, login.body.data.id);

  const me = await agent.get('/auth/me');
  assert.equal(me.status, 200);
  assert.deepEqual(me.body.data, { id: me.body.data.id, name: 'Sam', email: 'sam@example.com' });

  const missing = await request(app).get('/auth/me');
  assert.equal(missing.status, 401);
  assert.deepEqual(missing.body, { error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } });

  const tampered = await request(app).get('/auth/me').set('Cookie', 'sid=invalid-signature');
  assert.equal(tampered.status, 401);
  assert.deepEqual(tampered.body, missing.body);

  const unknown = await request(app).get('/auth/me').set('Cookie', 'sid=s%3Aunknown.invalidsignature');
  assert.equal(unknown.status, 401);

  const logout = await agent.post('/auth/logout');
  assert.equal(logout.status, 204);
  assert.equal(logout.text, '');
  const cleared = logout.headers['set-cookie'];
  assert.ok(cleared && cleared.some(cookie => /^sid=/i.test(cookie)));
  assert.ok(cleared && cleared.some(cookie => /Expires=/i.test(cookie)));

  const replay = await request(app).get('/auth/me').set('Cookie', oldCookie);
  assert.equal(replay.status, 401);
  const repeated = await agent.post('/auth/logout');
  assert.equal(repeated.status, 204);
});

test('cookie configuration is secure in production and local in development', () => {
  const { getCookieConfig } = require('../src/config/cookieConfig');
  process.env.COOKIE_SECURE = 'true';
  assert.equal(getCookieConfig().secure, true);
  process.env.COOKIE_SECURE = 'false';
  assert.equal(getCookieConfig().secure, false);
});

test('expired session records are rejected and removed', () => {
  const sessionStore = require('../src/session/sessionStore');
  const originalNow = Date.now;
  Date.now = () => 1000000;
  try {
    const sessionId = sessionStore.create(123);
    assert.ok(sessionStore.get(sessionId));
    Date.now = () => 5000000;
    assert.equal(sessionStore.get(sessionId), null);
  } finally {
    Date.now = originalNow;
  }
});

test.after(async () => {
  await prisma.$disconnect();
});
