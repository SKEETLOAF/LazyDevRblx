import { DevKitState } from './state.mjs';
import { createStudioServer } from './http.mjs';
import { attachStdio } from './mcp.mjs';

const rawPort = process.env.LAZYDEV_PORT ?? '43187';
const port = Number(rawPort);
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  process.stderr.write('LAZYDEV_PORT must be between 1024 and 65535\n');
  process.exit(1);
}
const state = new DevKitState();
const { server, token } = createStudioServer(state);
server.on('error', error => {
  process.stderr.write(`LAZY DevKit failed to bind: ${error.code || error.message}\n`);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => {
  // stdout is reserved for the MCP newline-delimited JSON-RPC transport.
  process.stderr.write(`LAZY DevKit Studio bridge: http://127.0.0.1:${port}\n`);
  process.stderr.write(`Studio session token (paste into plugin, do not publish): ${token}\n`);
});
attachStdio(state);
