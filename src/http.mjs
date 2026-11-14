import http from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { InputError } from './state.mjs';
import { handleRpc } from './mcp.mjs';

const BODY_LIMIT = 350 * 1024;

function send(response, status, body) {
  const json = JSON.stringify(body);
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  response.end(json);
}

async function readJson(request) {
  if (!request.headers['content-type']?.toLowerCase().startsWith('application/json')) {
    throw new InputError('application/json required', 415);
  }
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > BODY_LIMIT) throw new InputError('Request body too large', 413);
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new InputError('Malformed JSON'); }
}

export function createStudioServer(state, { token = randomBytes(32).toString('hex') } = {}) {
  const server = http.createServer(async (req, res) => {
    try {
      // Reject browser-origin requests, including DNS rebinding. Studio's HttpService sends no Origin.
      if (req.headers.origin) throw new InputError('Browser-origin requests are not accepted', 403);
      const host = req.headers.host ?? '';
      if (!/^127\.0\.0\.1(?::\d+)?$/.test(host)) throw new InputError('Local host only', 403);
      const supplied = req.headers.authorization?.replace(/^Bearer /, '') ?? '';
      const a = Buffer.from(supplied);
      const b = Buffer.from(token);
      if (a.length !== b.length || !timingSafeEqual(a, b)) throw new InputError('Authentication required', 401);
      const url = new URL(req.url ?? '/', 'http://127.0.0.1');
      if (req.method === 'POST' && url.pathname === '/v1/mcp') {
        // Only authenticated local relay clients can reach the shared MCP
        // handler. Studio's explicit approval remains the only edit path.
        return send(res, 200, { reply: handleRpc(state, await readJson(req)) });
      }
      if (req.method === 'GET' && url.pathname === '/v1/status') {
        return send(res, 200, { name: 'lazy-devkit', status: 'ready', version: '0.4.0' });
      }
      if (req.method === 'POST' && url.pathname === '/v1/studio/inspect') {
        return send(res, 201, state.inspect(await readJson(req)));
      }
      if (req.method === 'POST' && url.pathname === '/v1/studio/inspect-tree') {
        return send(res, 201, state.inspectStructure(await readJson(req)));
      }
      if (req.method === 'GET' && url.pathname === '/v1/studio/scene/pending') {
        return send(res, 200, { proposal: state.pendingScene(url.searchParams.get('structureId')) });
      }
      const sceneDecision = /^\/v1\/studio\/scene\/proposals\/([^/]+)\/decision$/.exec(url.pathname);
      if (req.method === 'POST' && sceneDecision) {
        return send(res, 200, state.finishSceneAction(sceneDecision[1], await readJson(req)));
      }
      if (req.method === 'GET' && url.pathname === '/v1/studio/pending') {
        return send(res, 200, { proposal: state.pendingFor(url.searchParams.get('instanceId')) });
      }
      const match = /^\/v1\/studio\/proposals\/([^/]+)\/decision$/.exec(url.pathname);
      if (req.method === 'POST' && match) {
        return send(res, 200, state.finishProposal(match[1], await readJson(req)));
      }
      return send(res, 404, { error: 'Not found' });
    } catch (error) {
      if (error instanceof InputError) return send(res, error.status, { error: error.message });
      // Never echo source code or secrets into errors.
      return send(res, 500, { error: 'Internal error' });
    }
  });
  return { server, token };
}
