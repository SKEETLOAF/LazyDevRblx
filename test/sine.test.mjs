import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DevKitState, InputError } from '../src/state.mjs';
import { SineStore, SineInputError, normalizeSineInspection } from '../src/sine.mjs';
import { createStudioServer } from '../src/http.mjs';
import { handleRpc } from '../src/mcp.mjs';

const sample = () => ({
  kind:'sine_runtime',
  runtimeClass:'ModuleScript',
  selection:{
    present:true,path:'Workspace.FX.Burst',className:'Attachment',
    tags:['SineVFXEffect'],tagsTruncated:false,propertiesFolder:true,
  },
});
const tool = (state,name,args={}) => {
  const result=handleRpc(state,{jsonrpc:'2.0',id:7,method:'tools/call',
    params:{name,arguments:args}});
  assert.equal(result.result?.isError,false,JSON.stringify(result));
  return JSON.parse(result.result.content[0].text);
};

test('Sine runtime inspection is read-only evidence, not proof of plugin/editor integration', () => {
  const state=new DevKitState();
  const metadata=state.inspectSine(sample());
  assert.equal(metadata.runtimeStatus,'module_present');
  assert.equal(metadata.runtimePath,'ReplicatedStorage.SineVFX');
  assert.equal(metadata.editorApiStatus,'not_inspected');
  assert.equal(metadata.selectedPath,'Workspace.FX.Burst');
  assert.equal(metadata.tagCount,1);
  const record=tool(state,'lazydev_read_sine_inspection',{sineId:metadata.sineId});
  assert.deepEqual(record.selection.tags,['SineVFXEffect']);
  assert.equal(record.selection.propertiesFolder,true);
  assert.match(record.guidance.runtimeUsage,/LocalScript/);
  assert.match(record.guidance.authoring,/not a documented editor automation API/);
  assert.equal(state.listObservations().length,0);
  assert.equal(state.listStructures().length,0);
  assert.equal(tool(state,'lazydev_list_sine_inspections').length,1);
});

test('no selection, missing planted module and wrong class are distinguished', () => {
  const state=new DevKitState();
  const none=sample();
  none.runtimeClass='none';
  none.selection={present:false,path:'',className:'',tags:[],tagsTruncated:false,propertiesFolder:false};
  const missing=state.inspectSine(none);
  assert.equal(missing.runtimeStatus,'missing');
  assert.equal(missing.selectedPath,null);
  const unexpected=state.inspectSine({...none,runtimeClass:'Folder'});
  assert.equal(unexpected.runtimeStatus,'wrong_class');
  assert.equal(state.readSine(unexpected.sineId).runtimeClass,'Folder');
  assert.equal(state.listSine().length,2);
});

test('Sine evidence rejects arbitrary source, invalid tags and fake empty selection', () => {
  const state=new DevKitState();
  const value=sample();
  const bad=[
    {...value,source:'return secrets'},
    {...value,selection:{...value.selection,Source:'print(1)'}},
    {...value,selection:{...value.selection,tags:['one','one']}},
    {...value,selection:{...value.selection,tags:Array.from({length:17},(_,i)=>'Tag'+i)}},
    {...value,selection:{...value.selection,tags:['x'.repeat(81)]}},
    {...value,selection:{...value.selection,tags:[123]}},
    {...value,selection:{...value.selection,path:'x'.repeat(700)}},
    {...value,selection:{...value.selection,propertiesFolder:'yes'}},
    {...value,selection:{...value.selection,present:false}},
    {...value,runtimeClass:''},
    {...value,kind:'sine_editor'},
  ];
  for(const input of bad) assert.throws(()=>state.inspectSine(input),InputError);
  assert.equal(state.listSine().length,0);
  assert.throws(()=>normalizeSineInspection({...value,selection:{...value.selection,tagsTruncated:1}}),SineInputError);
});

test('Sine reports are copied, bounded, and expire in daemon memory', () => {
  const store=new SineStore();
  const input=sample();
  const first=store.inspect(input);
  input.selection.tags[0]='modified after inspection';
  assert.equal(store.read(first.sineId).selection.tags[0],'SineVFXEffect');
  for(let i=0;i<25;i++) store.inspect(sample());
  assert.equal(store.list().length,20);
  assert.throws(()=>store.read(first.sineId),/expired/);
});

test('Sine HTTP route is token protected, opt-in, and MCP clients read same evidence', async t => {
  const state=new DevKitState();
  const {server,token}=createStudioServer(state,{token:'sine-integration-test-key'});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const url='http://127.0.0.1:'+server.address().port+'/v1/studio/specialist/sine';
  const post=(headers={},value=sample())=>fetch(url,{method:'POST',headers:{
    'Content-Type':'application/json',...headers,
  },body:JSON.stringify(value)});
  assert.equal((await post()).status,401);
  assert.equal((await post({Origin:'https://example.org',Authorization:'Bearer '+token})).status,403);
  assert.equal((await post({Authorization:'Bearer '+token},{...sample(),source:'bad'})).status,400);
  assert.equal(state.listSine().length,0);
  const accepted=await post({Authorization:'Bearer '+token});
  assert.equal(accepted.status,201);
  const meta=await accepted.json();
  assert.equal(meta.runtimeStatus,'module_present');
  assert.equal(tool(state,'lazydev_list_sine_inspections')[0].sineId,meta.sineId);
  const report=tool(state,'lazydev_read_sine_inspection',{sineId:meta.sineId});
  assert.equal(report.selection.className,'Attachment');
  assert.equal(report.guidance.runtimeUsage.includes('VFX.emit(target)'),true);
});
