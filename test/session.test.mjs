import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { publishSession, readSession, clearSession } from '../src/session.mjs';

test('desktop handoff file is per-user and guarded against accidental cleanup', t => {
  const directory = mkdtempSync(join(tmpdir(), 'lazy-devkit-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const file = join(directory, 'session.json');
  const token = 'a'.repeat(64);
  assert.equal(publishSession({ token, port: 43187, pid: 999 }, file), file);
  const record = readSession(file);
  assert.equal(record.port, 43187);
  assert.equal(record.pid, 999);
  assert.equal(record.token, token);
  if (process.platform !== 'win32') assert.equal(statSync(file).mode & 0o077, 0);
  assert.equal(clearSession('b'.repeat(64), file), false);
  assert.equal(readSession(file).token, token);
  assert.equal(clearSession(token, file), true);
  assert.equal(clearSession(token, file), false);
  assert.throws(() => readSession(file), { code: 'ENOENT' });
});

test('desktop handoff rejects invalid tokens and corrupted metadata', t => {
  const directory = mkdtempSync(join(tmpdir(), 'lazy-devkit-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const file = join(directory, 'session.json');
  assert.throws(() => publishSession({ token: 'fake', port: 43187 }, file), /Invalid/);
  assert.throws(() => publishSession({ token: 'a'.repeat(64), port: 80 }, file), /Invalid/);
  assert.throws(() => readSession(file), { code: 'ENOENT' });
});
