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

test.after(async () => {
  await prisma.$disconnect();
});
