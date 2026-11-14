import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DevKitState, InputError } from '../src/state.mjs';
import { createStudioServer } from '../src/http.mjs';
import { handleRpc } from '../src/mcp.mjs';
import { NODE_LIMIT, normalizeStructure } from '../src/structure.mjs';

const structure = {
  rootPath: 'Workspace',
  truncated: false,
  nodes: [
    { id: 0, parentId: null, depth: 0, name: 'Workspace',
      className: 'Workspace', path: 'Workspace', properties: {} },
    { id: 1, parentId: 0, depth: 1, name: 'Floor',
      className: 'Part', path: 'Workspace.Floor',
      properties: { Anchored: true, CanCollide: true, Size: [20, 1, 20],
        Position: [0, -1, 0], Color: [0.2, 0.3, 0.4], Material: 'Plastic' } },
  ],
};

function tool(state, name, args={}) {
  const rpc = handleRpc(state, { jsonrpc: '2.0', id: 2, method: 'tools/call',
    params: { name, arguments: args } });
  assert.equal(rpc.result?.isError, false, JSON.stringify(rpc));
  return JSON.parse(rpc.result.content[0].text);
}

test('bounded hierarchy is read-only and does not contain script source', () => {
  const state = new DevKitState();
  const meta = state.inspectStructure(structure);
  assert.equal(meta.nodeCount, 2);
  assert.equal(meta.truncated, false);
  assert.equal(tool(state, 'lazydev_list_structures')[0].structureId, meta.structureId);
  const retrieved = tool(state, 'lazydev_read_structure', {structureId:meta.structureId});
  assert.deepEqual(retrieved.nodes[1].properties.Size, [20,1,20]);
  assert.equal('source' in retrieved.nodes[1], false);
  assert.equal(state.listObservations().length, 0, 'Hierarchy inspection must not also share source');
});

test('hierarchy rejects malformed relations, unsafe properties and excessive size', () => {
  const state = new DevKitState();
  assert.throws(() => state.inspectStructure({...structure, nodes: [
    structure.nodes[0], {...structure.nodes[1], parentId: 99 }
  ]}), InputError);
  assert.throws(() => normalizeStructure({...structure, nodes: [
    {...structure.nodes[0], properties: { Source: 'secret' } }
  ]}), /property/);
  assert.throws(() => state.inspectStructure({...structure, nodes: [
    {...structure.nodes[0], source: 'print(1)' }
  ]}), InputError);
  assert.throws(() => state.inspectStructure({...structure, nodes: Array.from(
    { length: NODE_LIMIT + 1 }, (_, id) =>
      ({...structure.nodes[0], id, parentId: id === 0 ? null : 0, depth: id === 0 ? 0 : 1})
  )}), InputError);
  assert.throws(() => state.inspectStructure({...structure, nodes: [
    {...structure.nodes[0], properties:{ Size:[NaN,2,3] }}
  ]}), InputError);
});

test('scoped edits target exactly one source span and still require Studio approval', () => {
  const state = new DevKitState();
  const snapshot = state.inspect({ instanceId: 'script-1', path: 'ReplicatedStorage.Helper',
    className: 'ModuleScript', source: 'local scale = 2\nreturn scale * 3' });
  const edited = tool(state, 'lazydev_propose_scoped_edit', {
    snapshotId: snapshot.snapshotId, expectedSha256: snapshot.sha256,
    beforeText: 'local scale = 2', afterText: 'local scale = 4', rationale: 'Adjust scale'
  });
  assert.equal(edited.kind, 'scoped');
  assert.equal(edited.status, 'pending');
  assert.equal(state.pendingFor('script-1').newSource, 'local scale = 4\nreturn scale * 3');
  assert.equal(state.readObservation(snapshot.snapshotId).source, 'local scale = 2\nreturn scale * 3');
  assert.equal(state.finishProposal(edited.id, {snapshotId: snapshot.snapshotId, outcome:'rejected'}).status, 'rejected');
});

test('scoped edit rejects ambiguous, absent, stale and hash-mismatched spans', () => {
  const state = new DevKitState();
  const snapshot = state.inspect({ instanceId: 'script-2', path: 'ServerScriptService.A',
    className: 'Script', source: 'print("hello")\nprint("hello")' });
  const arg = { snapshotId: snapshot.snapshotId, expectedSha256: snapshot.sha256,
    rationale: 'Check', beforeText:'print("hello")', afterText:'print("goodbye")' };
  assert.throws(() => state.proposeScopedEdit(arg), /more than once/);
  assert.throws(() => state.proposeScopedEdit({...arg,beforeText:'nothing'}), /not present/);
  assert.throws(() => state.proposeScopedEdit({...arg,expectedSha256:'0'.repeat(64)}), /hash mismatch/);
  const fresh = state.inspect({ instanceId:'script-2', path:'ServerScriptService.A',
    className:'Script', source: 'print("updated")' });
  assert.throws(() => state.proposeScopedEdit(arg), /Stale/);
  assert.notEqual(fresh.snapshotId,snapshot.snapshotId);
});

test('HTTP accepts explicit structure inspection only with valid token', async t => {
  const state = new DevKitState();
  const { server, token } = createStudioServer(state, {token: 'phase2-local-test-token'});
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = 'http://127.0.0.1:' + server.address().port + '/v1/studio/inspect-tree';
  const call = (headers) => fetch(url, { method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(structure) });
  assert.equal((await call({})).status, 401);
  assert.equal((await call({Authorization: 'Bearer ' + token,Origin:'https://example.com'})).status, 403);
  const response = await call({ Authorization: 'Bearer '+token });
  assert.equal(response.status,201);
  assert.equal((await response.json()).nodeCount,2);
  assert.equal(state.listStructures().length,1);
});
