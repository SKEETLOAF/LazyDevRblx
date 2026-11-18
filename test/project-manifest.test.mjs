import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ProjectBriefStore, BriefInputError } from '../src/competency/briefs.mjs';
import { makeProjectManifest, parseProjectManifest, PROJECT_MANIFEST_SCHEMA } from '../src/competency/manifest.mjs';
import { runProjectManifest } from '../scripts/project-manifest.mjs';
import { DevKitState } from '../src/state.mjs';
import { handleRpc } from '../src/mcp.mjs';

const brief = () => ({
  projectName: 'Original project',
  creativeDirection: 'Clear shapes and distinct effects',
  style: 'stylized',
  preserve: ['Existing gameplay controls'],
  avoid: ['Copying reference assets'],
  constraints: ['Readable on mobile'],
  sourceLinks: [{
    title: 'Primary technique reference', kind: 'tutorial',
    url: 'https://example.com/how-it-works',
    rightsClaim: 'reference_only',
  }],
});

test('manifest is versioned, bounded and drops ephemeral session IDs and generated provenance', () => {
  const store = new ProjectBriefStore(id => id === 'present-now');
  const live = store.create({ ...brief(), referenceIds: ['present-now'] });
  const manifest = makeProjectManifest(live);
  assert.equal(manifest.schema, PROJECT_MANIFEST_SCHEMA);
  assert.equal(manifest.omittedSessionReferenceCount, 1);
  assert.equal(Object.hasOwn(manifest.brief, 'referenceIds'), false);
  assert.equal(Object.hasOwn(manifest.brief, 'briefId'), false);
  assert.equal(Object.hasOwn(manifest.brief.sourceLinks[0], 'retrievalStatus'), false);
  assert.equal(Object.hasOwn(manifest.brief.sourceLinks[0], 'rightsVerification'), false);
  assert.deepEqual(parseProjectManifest(JSON.parse(JSON.stringify(manifest))).brief, manifest.brief);
  assert.deepEqual(manifest.brief.preserve, brief().preserve);
});

test('cannot smuggle rights verification, source metadata, runtime references or unknown versions', () => {
  const base = makeProjectManifest(brief());
  const bad = [
    { ...base, schema: 'lazydev.project.v999' },
    { ...base, authorizingAgentTools: true },
    { ...base, omittedSessionReferenceCount: -1 },
    { ...base, omittedSessionReferenceCount: 100 },
    { ...base, brief: { ...base.brief, referenceIds: ['expired-session-id'] } },
    { ...base, brief: { ...base.brief, licenseVerified: true } },
    { ...base, brief: { ...base.brief, sourceLinks: [{ ...base.brief.sourceLinks[0], rightsVerification: 'verified' }] } },
    { ...base, brief: { ...base.brief, sourceLinks: [{ ...base.brief.sourceLinks[0], url: 'file:///private' }] } },
    { ...base, brief: { ...base.brief, preserve: ['Same', 'same'] } },
  ];
  for (const value of bad) assert.throws(() => parseProjectManifest(value), BriefInputError);
});

test('explicit CLI round-trip survives daemon restart without granting extra rights', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'lazy-project-'));
  try {
    const filename = join(folder, '.lazydev', 'project.json');
    const first = new DevKitState();
    const created = first.createProjectBrief(brief());
    const rpcFirst = async message => handleRpc(first, message);
    const result = await runProjectManifest(['export', created.briefId, filename], { transport: rpcFirst });
    assert.equal(result.action, 'export');
    const saved = JSON.parse(await readFile(filename, 'utf8'));
    assert.equal(saved.brief.projectName, brief().projectName);
    assert.equal(saved.omittedSessionReferenceCount, 0);
    assert.equal(JSON.stringify(saved).includes('session token'), false);
    await assert.rejects(() => runProjectManifest(['export', created.briefId, filename], { transport: rpcFirst }), { code: 'EEXIST' });

    const restarted = new DevKitState();
    assert.equal(restarted.listProjectBriefs().length, 0);
    const rpcRestarted = async message => handleRpc(restarted, message);
    const imported = await runProjectManifest(['import', filename], { transport: rpcRestarted });
    assert.equal(imported.action, 'import');
    assert.deepEqual(restarted.readProjectBrief(imported.briefId).preserve, brief().preserve);
    const plan = restarted.createCompetencyPlan({ task: 'Create new user interface', projectBriefId: imported.briefId });
    assert.equal(plan.projectContext.projectName, brief().projectName);
    assert.equal(plan.projectContext.verification, 'not_independently_verified');

    const badFilename = join(folder, 'bad.json');
    await writeFile(badFilename, JSON.stringify({ ...saved, schema: 'incorrect' }));
    await assert.rejects(() => runProjectManifest(['import', badFilename], { transport: rpcRestarted }), BriefInputError);
    const link = join(folder, 'shortcut.json');
    await symlink(filename, link);
    await assert.rejects(() => runProjectManifest(['import', link], { transport: rpcRestarted }), /regular project manifest/);
    assert.equal(restarted.listProjectBriefs().length, 1);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});

test('CLI rejects ambiguous command shapes before interacting with the bridge', async () => {
  const noCall = async () => { throw new Error('Should not be called'); };
  for (const args of [[], ['import'], ['export'], ['export', 'id'], ['import', '--all'], ['reset', 'everything']]) {
    await assert.rejects(() => runProjectManifest(args, { transport: noCall }), /Usage:/);
  }
});
