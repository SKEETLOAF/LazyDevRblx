import {SOURCES,PACKS,VERSION as KNOWLEDGE_VERSION,REVIEWED} from './catalog.mjs';
import {BENCHMARKS,VERSION as BENCHMARK_VERSION} from './benchmarks.mjs';
const PACK_BY_ID=new Map(PACKS.map(p=>[p.id,p]));
const BENCH_BY_ID=new Map(BENCHMARKS.map(b=>[b.id,b]));
const tokenize=s=>new Set(s.toLowerCase().normalize('NFKC').match(/[a-z0-9-]{3,}/g)??[]);
export class KnowledgeInputError extends Error {constructor(message){super(message);this.name='KnowledgeInputError';this.status=400}}
const fail=s=>{throw new KnowledgeInputError(s)};
function input(value,allowed){
 if(!value||Array.isArray(value)||typeof value!=='object'||Object.keys(value).some(k=>!allowed.includes(k)))fail('Invalid or unexpected fields');
}
const words={animation:['animation','animate','rig','walk','keyframe','pose','motion','attack'],vfx:['vfx','effect','particle','beam','flash','explosion','impact'],modeling:['mesh','model','character','creature','topology','modeling'],building:['build','building','terrain','environment','level','map'],sfx:['sfx','sound','audio','music','mix'],ui:['ui','hud','interface','menu','inventory','button'],scripting:['script','luau','code','remote','server','network'], 'game-design':['game','gameplay','onboarding','tutorial','mechanic','balance']};
export function validateKnowledge(){
 const ids=new Set();
 for(const source of SOURCES){
  if(ids.has(source.id)||!/^https:\/\//.test(source.url)||source.rights.assets!=='not_authorized'||!['A','A/B','B','C','D'].includes(source.tier))throw Error('Bad source '+source.id);
  ids.add(source.id);if(source.fields.some(f=>!PACK_BY_ID.has(f)))throw Error('Bad field '+source.id);
 }
 for(const p of PACKS)if(!p.objective.length||!p.human.length||!p.methods.length)throw Error('Incomplete pack '+p.id);
 for(const b of BENCHMARKS)if(b.disciplines.some(d=>!PACK_BY_ID.has(d))||b.status!=='not_run')throw Error('Bad benchmark '+b.id);
 return {valid:true,sourceCount:SOURCES.length,packCount:PACKS.length,benchmarkCount:BENCHMARKS.length};
}
export function listKnowledge(){validateKnowledge();return {version:KNOWLEDGE_VERSION,reviewed:REVIEWED,packs:PACKS.map(({id})=>({id,sourceCount:SOURCES.filter(s=>s.fields.includes(id)).length})),sourceCount:SOURCES.length,warning:'Historic, locally curated metadata; not a live source check or automatic license.'}}
export function retrieveKnowledge(value){
 input(value,['task','disciplines','limit']);
 if(typeof value.task!=='string'||!value.task.trim()||value.task.length>1600)fail('Invalid task');
 const task=value.task.trim(),q=tokenize(task);
 let selected;
 if(value.disciplines===undefined)selected=Object.keys(words).filter(k=>words[k].some(w=>q.has(w)));
 else{
  if(!Array.isArray(value.disciplines)||!value.disciplines.length||value.disciplines.length>8||new Set(value.disciplines).size!==value.disciplines.length||value.disciplines.some(d=>!PACK_BY_ID.has(d)))fail('Invalid disciplines');
  selected=[...value.disciplines];
 }
 const limit=value.limit===undefined?6:value.limit;
 if(!Number.isInteger(limit)||limit<1||limit>10)fail('Invalid limit');
 const scored=SOURCES.filter(s=>s.fields.some(f=>selected.includes(f))).map(s=>{
  const overlap=s.fields.filter(f=>selected.includes(f)).length;
  const sourceWords=tokenize(s.title+' '+s.techniques.join(' '));
  const specificity=[...q].filter(w=>sourceWords.has(w)).length;
  const tier=s.tier==='A'?3:s.tier==='A/B'?2:s.tier==='B'?1:0;
  return {source:s,score:overlap*10+Math.min(4,specificity)+tier};
 }).sort((a,b)=>b.score-a.score||a.source.id.localeCompare(b.source.id)).slice(0,limit);
 return {kind:'knowledge_retrieval',version:KNOWLEDGE_VERSION,task,selection:{disciplines:selected,mode:value.disciplines?'explicit':'heuristic',warning:value.disciplines?null:'Keyword inference is provisional'},packs:PACKS.filter(p=>selected.includes(p.id)).map(p=>structuredClone(p)),sources:scored.map(x=>structuredClone(x.source)),benchmarkCandidates:BENCHMARKS.filter(b=>b.disciplines.some(d=>selected.includes(d))).map(b=>b.id),status:'reference_only',rights:'No assets/code may be reused based on this catalog; review exact licenses separately.',warning:'No source fetched, Studio capability invoked, quality tested or expert review performed.'};
}
export function listBenchmarks(){return {version:BENCHMARK_VERSION,benchmarks:BENCHMARKS.map(({id,title,disciplines})=>({id,title,disciplines})),status:'definitions_only'};}
export function planBenchmark(value){
 input(value,['benchmarkId']);
 if(typeof value.benchmarkId!=='string'||!BENCH_BY_ID.has(value.benchmarkId))fail('Unknown benchmark');
 return {kind:'benchmark_protocol',version:BENCHMARK_VERSION,benchmark:structuredClone(BENCH_BY_ID.get(value.benchmarkId)),baseline:'Same requirements without the research knowledge pack',informed:'Same requirements using explicit curated source methods',controls:['Same device/place and acceptance criteria','Log actual source IDs and code/asset revisions','Report raw objective metrics separate from attributed human observations','Preserve confounders and missing instruments; let informed iteration perform worse'],requiredEvidence:['Baseline/informed artifact IDs and commits','Exact Studio/tool versions','Timestamped instrument output if measured','Human reviewer identity and observations if evaluated'],verdict:'not_assessed',liveStatus:'not_run',warning:'This defines an experiment; it does not run or score it.'};
}
