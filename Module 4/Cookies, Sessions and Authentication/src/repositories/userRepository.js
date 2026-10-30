const prisma = require('../db/prisma');

async function findByEmail(email) {
  return prisma.user.findUnique({ where: { email } });
}

async function findById(id) {
  return prisma.user.findUnique({ where: { id: Number(id) } });
}

async function createUser({ name, email, passwordHash }) {
  return prisma.user.create({ data: { name, email, passwordHash } });
}

module.exports = { findByEmail, findById, createUser };
