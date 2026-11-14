import { randomBytes } from 'node:crypto';
import { chmodSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { dirname, join } from 'node:path';

export const defaultSessionPath = join(homedir(), '.lazy-devkit', 'session.json');

// A per-user handoff for desktop MCP hosts that hide the bridge's stderr.
// This is not intended for multi-user or shared/untrusted Windows sessions.
export function publishSession({ token, port, pid = process.pid }, filename = defaultSessionPath) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token) ||
      !Number.isInteger(port) || port < 1024 || port > 65535 ||
      !Number.isInteger(pid) || pid <= 0) {
    throw new Error('Invalid session metadata');
  }

  mkdirSync(dirname(filename), { recursive: true, mode: 0o700 });
  const tmp = filename + '.' + pid + '.' + randomBytes(6).toString('hex') + '.tmp';
  try {
    writeFileSync(tmp, JSON.stringify({
      token, port, pid, createdAt: new Date().toISOString(),
    }) + '\n', { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    renameSync(tmp, filename);
    // POSIX file permissions. Windows needs OS account/ACL protection.
    if (platform() !== 'win32') chmodSync(filename, 0o600);
  } finally {
    rmSync(tmp, { force: true });
  }
  return filename;
}

export function readSession(filename = defaultSessionPath) {
  const file = JSON.parse(readFileSync(filename, 'utf8'));
  if (!file || !/^[a-f0-9]{64}$/.test(file.token) ||
      !Number.isInteger(file.port) || file.port < 1024 || file.port > 65535 ||
      !Number.isInteger(file.pid) || file.pid < 1) {
    throw new Error('Invalid saved session');
  }
  if (platform() !== 'win32' && (statSync(filename).mode & 0o077) !== 0) {
    throw new Error('Session file permissions are too broad');
  }
  return file;
}

export function clearSession(token, filename = defaultSessionPath) {
  try {
    // Do not remove another process's newly published session.
    if (readSession(filename).token !== token) return false;
    rmSync(filename, { force: true });
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}
