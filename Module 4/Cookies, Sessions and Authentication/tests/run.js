const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const projectDir = path.resolve(__dirname, '..');
const testDb = path.join(projectDir, 'prisma', 'test.db');
fs.rmSync(testDb, { force: true });

const prismaCli = require.resolve('prisma/build/index.js', { paths: [projectDir] });
const push = spawnSync(process.execPath, [prismaCli, 'db', 'push'], {
  cwd: projectDir,
  env: { ...process.env, DATABASE_URL: 'file:./test.db' },
  stdio: 'inherit',
});
if (push.error) console.error(push.error);
if (push.status !== 0) process.exit(push.status || 1);

const test = spawnSync(process.execPath, ['--test', '--test-concurrency=1', 'tests/auth.test.js'], {
  cwd: projectDir,
  env: { ...process.env, DATABASE_URL: 'file:./test.db' },
  stdio: 'inherit',
});
fs.rmSync(testDb, { force: true });
process.exit(test.status === null ? 1 : test.status);
