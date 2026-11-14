import { readSession } from '../src/session.mjs';

try {
  const { token, port } = readSession(process.env.LAZYDEV_SESSION_FILE);
  // Verify that the saved session is actually the listener on that port.
  // Do not display a potentially stale token.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  let response;
  try {
    response = await fetch(`http://127.0.0.1:${port}/v1/status`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
  } finally { clearTimeout(timeout); }
  if (!response.ok) throw new Error('Saved token does not match the active bridge');
  process.stdout.write('LAZY DevKit local session token (keep private):\n' + token + '\n');
} catch (error) {
  process.stderr.write(`No active saved LAZY DevKit session: ${error.message}\n`);
  process.exitCode = 1;
}
