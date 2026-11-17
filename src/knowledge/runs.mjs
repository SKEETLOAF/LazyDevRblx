import {randomUUID} from 'node:crypto';
import {BENCHMARKS} from './benchmarks.mjs';
const IDS=new Set(BENCHMARKS.map(b=>b.id));
const KINDS=new Set(['viewport','sequence','playtest','structure','diagnostics','observation','reference']);
const VARIANTS=new Set(['baseline','informed']);
const MAX=20;
export class BenchmarkEvidenceError extends Error {constructor(message){super(message);this.name='BenchmarkEvidenceError';this.status=400}}
const fail=x=>{throw new BenchmarkEvidenceError(x)};
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
function keys(x,allowed){if(!object(x)||Object.keys(x).some(k=>!allowed.includes(k)))fail('Invalid or unexpected fields')}
function text(x,name,max){if(typeof x!=='string'||!x.trim()||x.length>max)fail('Invalid '+name);return x.trim()}
export class BenchmarkEvidenceStore {
 constructor(present){if(typeof present!=='function')throw Error('Evidence lookup required');this.present=present;this.items=new Map();}
 record(input){
  keys(input,['benchmarkId','variant','projectCommit','studioBuild','device','operatorLabel','evidence','metrics','notes']);
  const benchmarkId=text(input.benchmarkId,'benchmarkId',60);
  if(!IDS.has(benchmarkId))fail('Unknown benchmarkId');
  const variant=text(input.variant,'variant',20);
  if(!VARIANTS.has(variant))fail('Unsupported variant');
  const projectCommit=text(input.projectCommit,'projectCommit',40);
  if(!/^[0-9a-f]{7,40}$/.test(projectCommit))fail('Expected abbreviated or full git commit SHA');
  const studioBuild=text(input.studioBuild,'studioBuild',100);
  const device=text(input.device,'device',100);
  const operatorLabel=text(input.operatorLabel,'operatorLabel',100);
  if(!Array.isArray(input.evidence)||!input.evidence.length||input.evidence.length>12)fail('At least one local evidence reference required');
  const seen=new Set();
  const evidence=input.evidence.map(entry=>{
   keys(entry,['kind','id','note']);
   const kind=text(entry.kind,'kind',30),id=text(entry.id,'id',100);
   if(!KINDS.has(kind)||seen.has(kind+'|'+id))fail('Invalid or duplicate evidence');
   seen.add(kind+'|'+id);
   if(!this.present(kind,id))fail('Evidence ID is missing or expired in local session');
   return {kind,id,note:entry.note===undefined?null:text(entry.note,'evidence note',240),status:'present_in_session_not_validated'};
  });
  const metrics=input.metrics===undefined?[]:input.metrics;
  if(!Array.isArray(metrics)||metrics.length>12)fail('Invalid metric count');
  const metricIds=new Set();
  const normalized=metrics.map(m=>{
   keys(m,['name','value','unit','method']);
   const name=text(m.name,'metric name',60),unit=text(m.unit,'metric unit',30),method=text(m.method,'measurement method',160);
   if(!/^[a-z][a-z0-9_-]*$/.test(name)||metricIds.has(name))fail('Metric names must be unique identifiers');
   metricIds.add(name);
   if(typeof m.value!=='number'||!Number.isFinite(m.value)||Math.abs(m.value)>1e9)fail('Metric value must be finite');
   return {name,value:m.value,unit,method,source:'operator_reported_not_validated'};
  });
  const notes=input.notes===undefined?null:text(input.notes,'notes',1000);
  const result={runId:randomUUID(),recordedAt:new Date().toISOString(),benchmarkId,variant,projectCommit,studioBuild,device,operatorLabel,evidence,metrics:normalized,notes,status:'recorded_unverified',qualityVerdict:'not_assessed',
    warning:'Local evidence ID presence and operator-reported numbers do not prove runtime quality. No benchmark pass is implied.'};
  this.items.set(result.runId,result);
  while(this.items.size>MAX)this.items.delete(this.items.keys().next().value);
  return structuredClone(result);
 }
 list(){return [...this.items.values()].map(r=>({runId:r.runId,benchmarkId:r.benchmarkId,variant:r.variant,recordedAt:r.recordedAt,status:r.status}));}
 read(id){const r=this.items.get(text(id,'runId',100));if(!r)fail('Run ID missing or expired');return structuredClone(r)}
 compare(input){
  keys(input,['baselineRunId','informedRunId']);
  const a=this.read(input.baselineRunId),b=this.read(input.informedRunId);
  if(a.variant!=='baseline'||b.variant!=='informed'||a.benchmarkId!==b.benchmarkId||a.runId===b.runId)fail('Require distinct baseline and informed runs of the same benchmark');
  const match=a.metrics.flatMap(m=>{
   const other=b.metrics.find(x=>x.name===m.name&&x.unit===m.unit&&x.method===m.method);
   return other?[{name:m.name,unit:m.unit,method:m.method,baseline:m.value,informed:other.value,difference:other.value-m.value,verified:false}]:[];
  });
  const differences=[];
  for(const key of ['device','studioBuild'])if(a[key]!==b[key])differences.push(key+' differs; direct comparison may be confounded');
  return {benchmarkId:a.benchmarkId,baselineRunId:a.runId,informedRunId:b.runId,
    reportedMeasurements:match,unmatchedMetricCount:a.metrics.length+b.metrics.length-2*match.length,
    confounders:differences,qualityVerdict:'not_assessed',verification:'operator_reported_not_independently_verified',
    warning:'Delta is arithmetic on unverified reported values, NOT a quality score or a proven improvement. Review raw evidence and control conditions.'};
 }
}
