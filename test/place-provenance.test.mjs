import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DevKitState } from '../src/state.mjs';

const id1 = '11111111-1111-4111-8111-111111111111';
const id2 = '22222222-2222-4222-8222-222222222222';
const observation = (placeContext) => ({
  rootPath: 'Workspace.Baseplate', truncated: false,
  ...(placeContext === undefined ? {} : { placeContext }),
  nodes: [{
    id: 0, parentId: null, depth: 0,
    path: 'Workspace.Baseplate', name: 'Baseplate', className: 'Part',
    properties: { Anchored: true },
  }],
});
const context = (studioSessionId, placeId = 0) => ({
  placeId, universeId: 0, placeName: 'Untitled Experience',
  studioSessionId, captureMode: 'edit',
});

test('new hierarchy snapshots expose source place, capture mode, and uncertainty', () => {
  const state = new DevKitState();
  const record = state.inspectStructure(observation(context(id1)));
  assert.equal(record.placeContext.placeId, 0);
  assert.equal(record.placeContext.captureMode, 'edit');
  assert.equal(record.identityScope, 'plugin_session_only_unsaved_place');
  assert.equal(record.provenanceStatus, 'studio_plugin_reported_not_independently_verified');
  assert.deepEqual(state.readStructure(record.structureId).placeContext, context(id1));
  assert.deepEqual(state.listStructures()[0].placeContext, context(id1));
});

test('separate Studio sessions can reuse the same hierarchy path without false superseding', () => {
  const state = new DevKitState();
  const old = state.inspectStructure(observation(context(id1)));
  const anotherPlace = state.inspectStructure(observation(context(id2)));
  assert.equal(state.structures.isLatest(old.structureId), true);
  assert.equal(state.structures.isLatest(anotherPlace.structureId), true);
  const again = state.inspectStructure(observation(context(id2)));
  assert.equal(state.structures.isLatest(old.structureId), true);
  assert.equal(state.structures.isLatest(anotherPlace.structureId), false);
  assert.equal(state.structures.isLatest(again.structureId), true);
});

test('published place identity is preserved but is not a connection or freshness guarantee', () => {
  const state = new DevKitState();
  const c = context(id1, 12345);
  c.universeId = 67890;
  c.captureMode = 'running';
  const meta = state.inspectStructure(observation(c));
  assert.equal(meta.identityScope, 'published_place_and_plugin_session');
  assert.equal(meta.placeContext.universeId, 67890);
  assert.equal(meta.placeContext.captureMode, 'running');
  assert.match(meta.provenanceStatus, /not_independently_verified/);
});

test('old plugin reports remain readable, visibly marked unidentified', () => {
  const state = new DevKitState();
  const old = state.inspectStructure(observation());
  assert.equal(old.placeContext, null);
  assert.equal(old.identityScope, 'unknown');
  assert.equal(old.provenanceStatus, 'legacy_unidentified');
  assert.equal(state.readStructure(old.structureId).nodeCount, 1);
});

test('malformed, unbounded, or unexpected reported identities fail closed', () => {
  const state = new DevKitState();
  const invalid = [
    { ...context(id1), placeId: -1 },
    { ...context(id1), placeId: 1.2 },
    { ...context(id1), placeName: 'X'.repeat(161) },
    { ...context(id1), studioSessionId: 'not-a-guid' },
    { ...context(id1), captureMode: 'published' },
    { ...context(id1), extra: 'should not be accepted' },
    [],
  ];
  for (const value of invalid) {
    assert.throws(() => state.inspectStructure(observation(value)), /placeContext/);
  }
});

test('Studio plugin stamps the capture at the source', () => {
  const file = readFileSync(new URL('../studio/LAZYDevKit.plugin.lua', import.meta.url), 'utf8');
  assert.match(file, /studioSessionId = HttpService:GenerateGUID\(false\)/);
  assert.match(file, /placeId = game\.PlaceId/);
  assert.match(file, /universeId = game\.GameId/);
  assert.match(file, /captureMode = RunService:IsRunning\(\)/);
});
