import { DevKitState } from './state.mjs';
import { createStudioServer } from './http.mjs';
import { attachStdio } from './mcp.mjs';
import { defaultSessionPath, publishSession, clearSession } from './session.mjs';

const rawPort = process.env.LAZYDEV_PORT ?? '43187';
const port = Number(rawPort);
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  process.stderr.write('LAZYDEV_PORT must be between 1024 and 65535\n');
  process.exit(1);
}
const state = new DevKitState();
const { server, token } = createStudioServer(state);
const sessionPath = process.env.LAZYDEV_SESSION_FILE || defaultSessionPath;

server.on('error', error => {
  process.stderr.write(`LAZY DevKit failed to bind: ${error.code || error.message}\n`);
  process.exit(1);
});

process.once('exit', () => {
  try { clearSession(token, sessionPath); }
  catch (error) { process.stderr.write(`Session cleanup error: ${error.message}\n`); }
});

server.listen(port, '127.0.0.1', () => {
  // stdout is reserved for MCP's newline-delimited JSON-RPC transport.
  process.stderr.write(`LAZY DevKit Studio bridge: http://127.0.0.1:${port}\n`);
  try {
    publishSession({ token, port }, sessionPath);
    process.stderr.write('Session saved in local user profile. Run npm run session to reveal it.\n');
  } catch (error) {
    // The bridge remains usable through the existing manual token workflow.
    process.stderr.write(`Could not save session handoff: ${error.message}\n`);
  }
  process.stderr.write(`Studio session token (keep private): ${token}\n`);
});
// The daemon owns all observations. A separate stdio client can connect to it
// from ChatGPT, Claude or Codex without attempting to bind the Studio port.
if (process.env.LAZYDEV_DAEMON !== '1') attachStdio(state);
