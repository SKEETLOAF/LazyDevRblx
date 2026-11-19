import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diagnose } from '../src/doctor.mjs';

const secret = 'a'.repeat(64);
const nativeInspector = () => ({
  supportedPlatform: true,
  launcherFound: true,
  hostConfigFound: true,
  connection: 'not_tested',
});
const sessionReader = () => ({ port: 43187, token: secret });
const tools = [
  'lazydev_list_structures', 'lazydev_list_observations',
  'lazydev_list_viewports', 'lazydev_read_viewport',
];

function bridge({ toolNames = tools, counts = {} } = {}) {
  const requests = [];
  async function transport(url, options) {
    assert.equal(url, 'http://127.0.0.1:43187/v1/mcp');
    assert.equal(options.headers.Authorization, 'Bearer ' + secret);
    assert.equal(options.method, 'POST');
    const request = JSON.parse(options.body);
    requests.push(request);
    let result;
    if (request.method === 'initialize') {
      result = { protocolVersion: '2025-06-18' };
    } else if (request.method === 'tools/list') {
      result = { tools: toolNames.map(name => ({ name })) };
    } else if (request.method === 'tools/call') {
      result = { content: [{
        type: 'text',
        text: JSON.stringify(Array.from({ length: counts[request.params.name] ?? 0 }, (_, n) => ({ id: n }))),
      }] };
    } else {
      throw new Error('Unexpected RPC method');
    }
    return {
      ok: true,
      json: async () => ({ reply: { jsonrpc: '2.0', id: request.id, result } }),
    };
  }
  return { requests, transport };
}

test('offline doctor is useful and never leaks session details', async () => {
  const report = await diagnose({
    sessionReader: () => { throw new Error('test secret /home/user'); },
    nativeInspector,
    nodeVersion: '22.0.0',
  });
  assert.equal(report.lazyBridge.state, 'no_usable_session');
  assert.equal(report.nativeStudio.connection, 'not_tested');
  assert.equal(report.endToEndWorkflowVerified, false);
  assert.match(report.nextSteps.join(' '), /npm start/);
  assert.ok(!JSON.stringify(report).includes('test secret'));
});

test('live daemon is not mistaken for a live Studio or native MCP connection', async () => {
  const mock = bridge({
    counts: { lazydev_list_structures: 1, lazydev_list_viewports: 2 },
  });
  const report = await diagnose({ sessionReader, nativeInspector, transport: mock.transport });
  assert.equal(report.lazyBridge.state, 'connected');
  assert.equal(report.lazyBridge.toolCount, 4);
  assert.deepEqual(report.lazyBridge.missingTools, []);
  assert.deepEqual(report.sharedEvidence, {
    state: 'snapshots_present', scripts: 0, structures: 1, viewports: 2,
  });
  assert.equal(report.liveStudioVerified, false);
  assert.equal(report.endToEndWorkflowVerified, false);
  assert.equal(report.nativeStudio.connection, 'not_tested');
  assert.ok(mock.requests.some(request => request.method === 'tools/call'));
  assert.ok(!JSON.stringify(report).includes(secret));
});

test('missing MCP tools are surfaced without claiming success', async () => {
  const mock = bridge({ toolNames: tools.filter(name => name !== 'lazydev_read_viewport') });
  const report = await diagnose({ sessionReader, nativeInspector, transport: mock.transport });
  assert.equal(report.lazyBridge.state, 'connected');
  assert.deepEqual(report.lazyBridge.missingTools, ['lazydev_read_viewport']);
  assert.equal(report.sharedEvidence.state, 'none_shared');
  assert.match(report.nextSteps.join(' '), /restart its daemon/);
});

test('wrong token, stale session, or malformed RPC never reveals credentials', async () => {
  const report = await diagnose({
    sessionReader,
    nativeInspector,
    transport: async () => ({ ok: false, status: 401 }),
  });
  assert.equal(report.lazyBridge.state, 'unreachable_or_invalid');
  assert.equal(report.sharedEvidence.state, 'not_checked');
  assert.ok(!JSON.stringify(report).includes(secret));
});

test('a connection with unexpected evidence payloads is marked unavailable', async () => {
  const mock = bridge();
  const transport = async (url, options) => {
    const r = await mock.transport(url, options);
    const request = JSON.parse(options.body);
    if (request.method === 'tools/call' && request.params.name === 'lazydev_list_viewports') {
      return { ok: true, json: async () => ({
        reply: { jsonrpc: '2.0', id: request.id, result: { content: [{ type: 'text', text: '{oops' }] } },
      }) };
    }
    return r;
  };
  const report = await diagnose({ sessionReader, nativeInspector, transport });
  assert.equal(report.lazyBridge.state, 'connected');
  assert.equal(report.sharedEvidence.state, 'unavailable');
  assert.equal(report.sharedEvidence.viewports, null);
});

test('outdated Node versions are explicitly flagged', async () => {
  const report = await diagnose({
    sessionReader: () => { throw Error('missing'); },
    nativeInspector,
    nodeVersion: '18.19.0',
  });
  assert.equal(report.node.supported, false);
  assert.match(report.nextSteps.join(' '), /Node.js 20/);
});
