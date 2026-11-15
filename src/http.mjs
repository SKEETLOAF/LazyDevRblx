import http from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { InputError } from './state.mjs';
import { handleRpc } from './mcp.mjs';
import { VIEWPORT_MAX_BYTES, VIEWPORT_MAX_WIDTH, VIEWPORT_MAX_HEIGHT } from './viewport.mjs';
import { MEDIA_MAX_BYTES } from './reference-media.mjs';

const BODY_LIMIT = 350 * 1024;

function send(response, status, body) {
  const json = JSON.stringify(body);
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  response.end(json);
}

async function readReferenceUpload(request) {
  const mediaType = request.headers['content-type']?.toLowerCase();
  if(!['image/png','image/jpeg','image/webp','image/gif'].includes(mediaType)){
    throw new InputError('PNG, JPEG, WebP or GIF Content-Type required',415);
  }
  const encodedLabel=request.headers['x-reference-label'];
  if(typeof encodedLabel!=='string'||encodedLabel.length>180||
     !/^[A-Za-z0-9_-]+$/.test(encodedLabel)){
    throw new InputError('Invalid encoded reference label');
  }
  const label=Buffer.from(encodedLabel,'base64url').toString('utf8');
  if(Buffer.from(label,'utf8').toString('base64url')!==encodedLabel){
    throw new InputError('Invalid reference label UTF-8');
  }
  let size=0;const chunks=[];
  for await(const chunk of request){
    size+=chunk.length;
    if(size>MEDIA_MAX_BYTES) throw new InputError('Reference file exceeds 8 MiB limit',413);
    chunks.push(chunk);
  }
  return {bytes:Buffer.concat(chunks),options:{label,mediaType}};
}

async function readViewportPixels(request) {
  if (request.headers['content-type']?.toLowerCase() !== 'application/octet-stream') {
    throw new InputError('application/octet-stream required', 415);
  }
  const timestampText=request.headers['x-viewport-captured-at'];
  if(!/^[1-9][0-9]{8,11}$/.test(timestampText ?? '')) {
    throw new InputError('Missing or invalid capture timestamp');
  }
  const capturedTimestamp=Number(timestampText);
  const now=Math.floor(Date.now()/1000);
  if(!Number.isSafeInteger(capturedTimestamp) ||
     capturedTimestamp < now-24*60*60 || capturedTimestamp > now+60) {
    throw new InputError('Capture timestamp is outside allowed window');
  }
  const widthText=request.headers['x-viewport-width'];
  const heightText=request.headers['x-viewport-height'];
  if (!/^[1-9][0-9]{0,3}$/.test(widthText ?? '') ||
      !/^[1-9][0-9]{0,3}$/.test(heightText ?? '')) {
    throw new InputError('Invalid screenshot dimensions');
  }
  const width=Number(widthText),height=Number(heightText);
  if(width>VIEWPORT_MAX_WIDTH || height>VIEWPORT_MAX_HEIGHT ||
     width*height>VIEWPORT_MAX_BYTES/4) {
    throw new InputError('Screenshot dimensions too large',413);
  }
  const expected=width*height*4;
  const chunks=[];
  let total=0;
  for await(const chunk of request) {
    total+=chunk.length;
    if(total>expected || total>VIEWPORT_MAX_BYTES) {
      throw new InputError('Viewport body too large',413);
    }
    chunks.push(chunk);
  }
  const pixels=Buffer.concat(chunks);
  if(pixels.length!==expected) throw new InputError('Viewport RGBA byte length mismatch');
  return {width,height,pixels,capturedTimestamp};
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
        return send(res, 200, { name: 'lazy-devkit', status: 'ready', version: '0.9.0' });
      }
      if (req.method === 'POST' && url.pathname === '/v1/references/import') {
        const {bytes,options}=await readReferenceUpload(req);
        return send(res,201,state.ingestReference(bytes,options));
      }
      if (req.method === 'POST' && url.pathname === '/v1/studio/specialist/sine') {
        return send(res, 201, state.inspectSine(await readJson(req)));
      }
      if (req.method === 'POST' && url.pathname === '/v1/studio/viewport') {
        return send(res, 201, state.inspectViewport(await readViewportPixels(req)));
      }
      if (req.method === 'POST' && url.pathname === '/v1/studio/inspect') {
        return send(res, 201, state.inspect(await readJson(req)));
      }
      if (req.method === 'POST' && url.pathname === '/v1/studio/playtest-report') {
        return send(res, 201, state.inspectPlaytest(await readJson(req)));
      }
      if (req.method === 'POST' && url.pathname === '/v1/studio/diagnostics') {
        return send(res, 201, state.inspectDiagnostics(await readJson(req)));
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
