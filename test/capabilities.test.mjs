import {test} from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import {
  CAPABILITIES,getCapabilityMatrix,validateCapabilityCatalog,
} from '../src/capabilities/registry.mjs';
import {
  normalizeVerificationRecord,VerificationInputError,
} from '../src/capabilities/verification.mjs';

const testCommit='27cd75439cbba2751fb58351d137be99b2905457';
const sample={
  capabilityId:'studio.viewport.capture',result:'inconclusive',
  testedCommit:testCommit,studioBuild:'example-build',os:'Windows 11',
  host:'Codex',hostVersion:'example-version',
  observedAt:'2026-11-16T18:30:00Z',
  evidencePaths:['docs/verification/evidence/example-screenshot.png'],
  notes:'Permission dialog returned; image delivery unknown',
};
test('registry contains native-first vs LAZY specialist vs unsupported specialist paths',()=>{
  assert.equal(validateCapabilityCatalog().valid,true);
  assert.ok(CAPABILITIES.length>=20);
  const map=new Map(CAPABILITIES.map(c=>[c.id,c]));
  assert.equal(map.get('studio.script.edit').route,'native_first');
  assert.equal(map.get('studio.viewport.sequence').route,'lazy_specialist');
  assert.equal(map.get('competency.evidence').route,'lazy_specialist');
  assert.equal(map.get('native.generate.asset').implemented,false);
  assert.equal(map.get('external.eclipse.editor').route,'unavailable');
  assert.equal(map.get('external.moon.editor').implemented,false);
});
test('existing coverage is never silently upgraded to verified live Studio',()=>{
  const matrix=getCapabilityMatrix();
  assert.equal(matrix.registryVersion,'2026-11-17.1');
  assert.ok(matrix.capabilities.some(x => x.id === 'knowledge.query'));
  assert.ok(matrix.capabilities.some(x => x.id === 'benchmark.plan'));
  assert.ok(matrix.capabilities.length>20);
  for(const c of matrix.capabilities){
    assert.equal(c.checks.versionBoundStudioVerified,false);
    assert.equal(c.checks.versionBoundHostVerified,false);
    assert.equal(c.checks.ciPass,'not_checked_by_registry');
    assert.equal(c.checks.documented,true);
    if(c.userReport){
      assert.equal(c.userReport.classification,'user_reported_live');
      assert.equal(c.userReport.studioBuild,null);
    }
    if(c.provider==='native'&&!c.implemented)assert.equal(c.checks.hasAutomatedTestPointers,false);
  }
  assert.match(matrix.warning,/not a live Studio/i);
});
test('every declared automated-test pointer resolves to an existing repo file',()=>{
  const unique=new Set(CAPABILITIES.flatMap(c=>c.tests));
  assert.ok(unique.size>=8);
  for(const path of unique){
    assert.ok(existsSync(fileURLToPath(new URL('../'+path,import.meta.url))),path);
  }
});
test('a user-run verification report is schema-validated but never autoverified',()=>{
  const value=normalizeVerificationRecord(sample);
  assert.equal(value.assertion,'user_supplied_unreviewed');
  assert.equal(value.reviewStatus,'pending_human_review');
  assert.equal(value.versionBoundStudioVerified,false);
  assert.deepEqual(value.evidencePaths,sample.evidencePaths);
  assert.match(value.warning,/reviewer/i);
});
test('malformed, permission-claim and path-escape reports are rejected',()=>{
  const bad=[
    null,[],{...sample,unknownKey:true},
    {...sample,capabilityId:'danger.shell'},
    {...sample,result:'verified'},
    {...sample,testedCommit:'main'},
    {...sample,studioBuild:''},
    {...sample,observedAt:'2026-11-35T18:30:00Z'},
    {...sample,evidencePaths:[]},
    {...sample,evidencePaths:['../../secrets.txt']},
    {...sample,evidencePaths:['docs/verification/evidence/../../secrets.txt']},
    {...sample,evidencePaths:['https://example.com/log']},
    {...sample,evidencePaths:['docs/verification/evidence/x.png','docs/verification/evidence/x.png']},
    {...sample,evidencePaths:'not an array'},
    {...sample,notes:'a'.repeat(501)},
    {...sample,versionBoundStudioVerified:true},
  ];
  for(const value of bad)assert.throws(()=>normalizeVerificationRecord(value),VerificationInputError);
});
test('capability CLI emits deterministic and honest machine-readable status',()=>{
  const script=fileURLToPath(new URL('../scripts/check-capabilities.mjs',import.meta.url));
  const matrix=JSON.parse(execFileSync(process.execPath,[script,'--json'],{encoding:'utf8'}));
  assert.equal(matrix.capabilities.length,CAPABILITIES.length);
  assert.equal(matrix.capabilities.find(c=>c.id==='native.execute.luau').implemented,false);
  const check=JSON.parse(execFileSync(process.execPath,[script,'--validate'],{encoding:'utf8'}));
  assert.equal(check.valid,true);
  const summary=execFileSync(process.execPath,[script,'--summary'],{encoding:'utf8'});
  assert.match(summary,/not a live Studio probe/);
  assert.match(summary,/studio.script.edit/);
});
