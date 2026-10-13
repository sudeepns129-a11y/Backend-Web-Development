const prisma = require('../db/prisma');

function asInteger(value) {
  const numericValue = Number(value);
  return Number.isInteger(numericValue) ? numericValue : null;
}

function translateDatabaseError(error, fallbackMessage) {
  if (error && error.statusCode) return error;

  const normalized = new Error(fallbackMessage || 'Database operation failed');
  normalized.statusCode = 500;

  if (error && error.code === 'P2025') {
    normalized.message = 'Record not found';
    normalized.statusCode = 404;
    return normalized;
  }

  if (error && error.code === 'P2002') {
    normalized.message = 'Duplicate record';
    normalized.statusCode = 409;
    return normalized;
  }

  if (error && error.code === 'P2003') {
    normalized.message = 'Invalid related record';
    normalized.statusCode = 422;
    return normalized;
  }

  if (error && error.message) {
    normalized.message = error.message;
  }

  return normalized;
}

async function findAll() {
  return prisma.post.findMany({ orderBy: { id: 'asc' } });
}

async function findById(id) {
  const numericId = asInteger(id);
  if (numericId === null) return null;

  return prisma.post.findUnique({ where: { id: numericId } });
}

async function create(fields) {
  if (!fields || typeof fields !== 'object') {
    const error = new Error('Create payload is required');
    error.statusCode = 422;
    throw error;
  }

  const title = typeof fields.title === 'string' ? fields.title.trim() : '';
  const body = typeof fields.body === 'string' ? fields.body : '';
  const authorId = asInteger(fields.authorId);

  if (!title || authorId === null) {
    const error = new Error('Title and authorId are required');
    error.statusCode = 422;
    throw error;
  }

  try {
    return await prisma.post.create({
      data: {
        title,
        body,
        authorId,
      },
    });
  } catch (error) {
    throw translateDatabaseError(error, 'Unable to create post');
  }
}

async function update(id, patch) {
  const numericId = asInteger(id);
  if (numericId === null) return null;

  const data = {};
  if (patch && patch.title !== undefined) {
    const title = typeof patch.title === 'string' ? patch.title.trim() : '';
    if (!title) {
      const error = new Error('Title is required');
      error.statusCode = 422;
      throw error;
    }
    data.title = title;
  }

  if (patch && patch.body !== undefined) {
    data.body = typeof patch.body === 'string' ? patch.body : '';
  }

  if (patch && patch.authorId !== undefined) {
    const authorId = asInteger(patch.authorId);
    if (authorId === null) {
      const error = new Error('Invalid authorId');
      error.statusCode = 422;
      throw error;
    }
    data.authorId = authorId;
  }

  try {
    return await prisma.post.update({
      where: { id: numericId },
      data,
    });
  } catch (error) {
    if (error && error.code === 'P2025') return null;
    throw translateDatabaseError(error, 'Unable to update post');
  }
}

async function remove(id) {
  const numericId = asInteger(id);
  if (numericId === null) return false;

  try {
    await prisma.post.delete({ where: { id: numericId } });
    return true;
  } catch (error) {
    if (error && error.code === 'P2025') return false;
    throw translateDatabaseError(error, 'Unable to delete post');
  }
}

module.exports = { findAll, findById, create, update, remove };
