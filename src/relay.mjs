import readline from 'node:readline';
import { defaultSessionPath, readSession } from './session.mjs';

const LIMIT = 500_000;
const unavailable = 'LAZY DevKit bridge is unavailable. Start npm start on this PC, then restart the MCP client.';

export async function forwardRpc(message, { sessionFile = defaultSessionPath, transport = fetch } = {}) {
  // Never place tokens in stdout, tool results, or client configuration files.
  const { token, port } = readSession(sessionFile);
  const response = await transport(`http://127.0.0.1:${port}/v1/mcp`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error('Bridge did not accept MCP request');
  const payload = await response.json();
  if (!payload || !Object.hasOwn(payload, 'reply')) throw new Error('Invalid bridge reply');
  return payload.reply;
}

// Each local AI client gets a tiny stdio relay, but the daemon keeps the ONE
// authoritative Studio snapshot/proposal state. Requests are serialized on the
// same connection, preserving order and stable JSON-RPC request ids.
export function attachStdioRelay(input = process.stdin, output = process.stdout, options = {}) {
  const reader = readline.createInterface({ input, crlfDelay: Infinity });
  let queue = Promise.resolve();
  function emit(payload) { output.write(JSON.stringify(payload) + '\n'); }
  reader.on('line', line => {
    queue = queue.then(async () => {
      if (Buffer.byteLength(line, 'utf8') > LIMIT) {
        emit({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'MCP request too large' } });
        return;
      }
      let message;
      try { message = JSON.parse(line); }
      catch {
        emit({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
        return;
      }
      if (message === null || typeof message !== 'object' || Array.isArray(message)) {
        emit({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid request' } });
        return;
      }
      // Initialization notifications have no request id and no response.
      if (!Object.hasOwn(message, 'id')) return;
      try {
        const reply = await forwardRpc(message, options);
        if (reply !== null && reply !== undefined) emit(reply);
      } catch {
        emit({ jsonrpc: '2.0', id: message.id ?? null,
          error: { code: -32000, message: unavailable } });
      }
    }).catch(() => { /* Never allow a queued error to poison later requests. */ });
  });
  return { reader, drain: () => queue };
}
