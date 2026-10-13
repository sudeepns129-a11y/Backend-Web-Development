const test = require('node:test');
const assert = require('node:assert/strict');

const prisma = require('../src/db/prisma');
const postRepository = require('../src/repositories/postRepository');

const originalFindAll = prisma.post.findMany;
const originalFindUnique = prisma.post.findUnique;
const originalCreate = prisma.post.create;
const originalUpdate = prisma.post.update;
const originalDelete = prisma.post.delete;

const samplePost = { id: 1, title: 'A title', body: 'A body', authorId: 1 };

test('findAll returns the repository array contract', async () => {
  prisma.post.findMany = async () => [{ ...samplePost }];

  const posts = await postRepository.findAll();
  assert.deepEqual(posts, [{ ...samplePost }]);

  prisma.post.findMany = originalFindAll;
});

test('findById returns a record or null', async () => {
  prisma.post.findUnique = async ({ where }) => (where.id === samplePost.id ? { ...samplePost } : null);

  assert.deepEqual(await postRepository.findById(samplePost.id), { ...samplePost });
  assert.equal(await postRepository.findById(999), null);

  prisma.post.findUnique = originalFindUnique;
});

test('create persists valid data', async () => {
  prisma.post.create = async ({ data }) => ({ id: 2, ...data });

  const created = await postRepository.create({ title: 'New post', body: 'Body', authorId: 1 });
  assert.deepEqual(created, { id: 2, title: 'New post', body: 'Body', authorId: 1 });

  prisma.post.create = originalCreate;
});

test('update returns the patched record or null', async () => {
  prisma.post.update = async ({ where, data }) => {
    if (where.id === 999) {
      const error = new Error('Not found');
      error.code = 'P2025';
      throw error;
    }

    return { ...samplePost, ...data, id: where.id };
  };

  const updated = await postRepository.update(samplePost.id, { title: 'Updated title' });
  assert.equal(updated.title, 'Updated title');
  assert.equal(await postRepository.update(999, { title: 'Nope' }), null);

  prisma.post.update = originalUpdate;
});

test('remove returns true when deleted and false when absent', async () => {
  prisma.post.delete = async () => ({ ...samplePost });

  assert.equal(await postRepository.remove(samplePost.id), true);

  prisma.post.delete = async () => {
    const error = new Error('Not found');
    error.code = 'P2025';
    throw error;
  };

  assert.equal(await postRepository.remove(999), false);

  prisma.post.delete = originalDelete;
});
