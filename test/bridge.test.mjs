import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DevKitState, InputError, sourceHash, SOURCE_LIMIT } from '../src/state.mjs';
import { createStudioServer } from '../src/http.mjs';
import { handleRpc } from '../src/mcp.mjs';

const base = { instanceId: 'studio-1', path: 'ServerScriptService.A', className: 'Script', source: 'print("before")' };

function rpc(state, name, args = {}) {
  const response = handleRpc(state, { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } });
  assert.equal(response.result.isError, false, JSON.stringify(response));
  return JSON.parse(response.result.content[0].text);
}

test('manual observation and MCP tools create non-mutating proposal', () => {
  const state = new DevKitState();
  const snapshot = state.inspect(base);
  assert.equal(snapshot.sha256, sourceHash(base.source));
  assert.equal(rpc(state, 'lazydev_list_observations').length, 1);
  assert.equal(rpc(state, 'lazydev_read_observation', { snapshotId: snapshot.snapshotId }).source, base.source);
  const proposal = rpc(state, 'lazydev_propose_script_edit', { snapshotId: snapshot.snapshotId,
    expectedSha256: snapshot.sha256, newSource: 'print("after")', rationale: 'Clarify message' });
  assert.equal(proposal.status, 'pending');
  assert.equal(state.readObservation(snapshot.snapshotId).source, base.source);
  assert.equal(state.pendingFor(base.instanceId).newSource, 'print("after")');
  const result = state.finishProposal(proposal.id, { snapshotId: snapshot.snapshotId, outcome: 'applied' });
  assert.equal(result.status, 'studio_reported_applied');
  assert.equal(state.pendingFor(base.instanceId), null);
  assert.equal(rpc(state, 'lazydev_get_proposal_status', { proposalId: proposal.id }).status, 'studio_reported_applied');
});

test('stale snapshot, duplicate proposals, and mismatched SHA are rejected', () => {
  const state = new DevKitState();
  const a = state.inspect(base);
  assert.throws(() => state.propose({ snapshotId: a.snapshotId, expectedSha256: '0'.repeat(64), newSource: 'x', rationale: 'r' }), InputError);
  const args = { snapshotId: a.snapshotId, expectedSha256: a.sha256, newSource: 'x', rationale: 'r' };
  const p = state.propose(args);
  assert.throws(() => state.propose(args), InputError);
  const b = state.inspect({ ...base, source: 'another' });
  assert.equal(state.proposalStatus(p.id).status, 'superseded');
  assert.throws(() => state.finishProposal(p.id, { snapshotId: a.snapshotId, outcome: 'applied' }), InputError);
  assert.throws(() => state.propose(args), InputError);
  assert.notEqual(a.sha256, b.sha256);
});

test('validation rejects unsupported script classes and oversized payloads', () => {
  const state = new DevKitState();
  assert.throws(() => state.inspect({ ...base, className: 'Part' }), InputError);
  assert.throws(() => state.inspect({ ...base, source: 'x'.repeat(SOURCE_LIMIT + 1) }), InputError);
  assert.throws(() => state.inspect({ ...base, instanceId: '' }), InputError);
  assert.equal(handleRpc(state, { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25' } }).result.serverInfo.name, 'lazy-devkit');
  assert.ok(handleRpc(state, { jsonrpc: '2.0', id: 2, method: 'tools/list' }).result.tools.length > 2);
});

test('HTTP bridge requires token, rejects Origin, and guards proposal decisions', async t => {
  const state = new DevKitState();
  const { server, token } = createStudioServer(state, { token: 'testing-secret-bridge' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const port = server.address().port;
  const url = `http://127.0.0.1:${port}`;
  const request = (path, { method = 'GET', body, headers = {} } = {}) => fetch(url + path, {
    method, headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  assert.equal((await fetch(url + '/v1/status')).status, 401);
  assert.equal((await request('/v1/status', { headers: { Origin: 'http://evil.example' } })).status, 403);
  assert.equal((await request('/v1/status')).status, 200);
  const inspected = await request('/v1/studio/inspect', { method: 'POST', body: base });
  assert.equal(inspected.status, 201);
  const snapshot = await inspected.json();
  assert.equal((await request('/v1/studio/pending?instanceId=studio-1')).status, 200);
  const p = state.propose({ snapshotId: snapshot.snapshotId, expectedSha256: snapshot.sha256, newSource: 'updated', rationale: 'test' });
  assert.equal((await (await request('/v1/studio/pending?instanceId=studio-1')).json()).proposal.id, p.id);
  assert.equal((await request(`/v1/studio/proposals/${p.id}/decision`, { method: 'POST', body: { snapshotId: 'wrong', outcome: 'applied' } })).status, 409);
  assert.equal((await request(`/v1/studio/proposals/${p.id}/decision`, { method: 'POST', body: { snapshotId: snapshot.snapshotId, outcome: 'rejected' } })).status, 200);
  assert.equal(state.proposalStatus(p.id).status, 'rejected');
});

test('stdio parser accepts newline-delimited MCP and reserves stdout for JSON-RPC', async () => {
  const { PassThrough } = await import('node:stream');
  const { attachStdio } = await import('../src/mcp.mjs');
  const input = new PassThrough();
  const output = new PassThrough();
  let raw = '';
  output.setEncoding('utf8');
  output.on('data', chunk => { raw += chunk; });
  const rl = attachStdio(new DevKitState(), input, output);
  input.write(JSON.stringify({jsonrpc:'2.0',id:7,method:'initialize',params:{protocolVersion:'2025-11-25'}}) + '\n');
  input.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'}) + '\n');
  input.write(JSON.stringify({jsonrpc:'2.0',id:8,method:'tools/list'}) + '\n');
  await new Promise(resolve => setImmediate(resolve));
  rl.close();
  const lines = raw.trim().split('\n').map(line => JSON.parse(line));
  assert.deepEqual(lines.map(line => line.id), [7,8]);
  assert.equal(lines[0].result.protocolVersion, '2025-11-25');
  assert.ok(lines[1].result.tools.length >= 30);
  assert.ok(lines[1].result.tools.some(tool => tool.name === 'lazydev_query_knowledge'));
  assert.ok(lines[1].result.tools.some(tool => tool.name === 'lazydev_plan_benchmark'));
});
