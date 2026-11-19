import { randomUUID } from 'node:crypto';
import {retrieveKnowledge} from '../knowledge/engine.mjs';
import { ASSET_KINDS, CATALOG_VERSION, COMPETENCIES, SOURCES, STYLES } from './catalog.mjs';

export const SUPPORTED_EVIDENCE_KINDS = Object.freeze([
  'viewport','structure','sequence','reference','playtest','diagnostics','observation',
  'blender-audit','wav-audit',
]);
const EVIDENCE_SET = new Set(SUPPORTED_EVIDENCE_KINDS);
const SKILL_IDS = new Set(COMPETENCIES.map(x=>x.id));
const STYLES_SET = new Set(Object.keys(STYLES));
const ASSETS_SET = new Set(Object.keys(ASSET_KINDS));
const MAX_PLANS = 20;

export class CompetencyInputError extends Error {
  constructor(message,status=400){super(message);this.name='CompetencyInputError';this.status=status;}
}
const fail=(msg)=>{throw new CompetencyInputError(msg);};
const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
function checkKeys(x,allowed) {
  if(!obj(x))fail('Expected task object');
  if(Object.keys(x).some(key=>!allowed.includes(key)))fail('Unexpected task fields');
}
function str(x,name,max,{allowEmpty=false}={}) {
  if(typeof x!=='string'||x.length>max||(!allowEmpty&&!x.trim()))fail(name+' must be a nonempty bounded string');
  return x.trim();
}
function enumVal(v,possible,name) {
  if(typeof v!=='string'||!possible.has(v))fail('Unsupported '+name);
  return v;
}
function uniqueArray(v,possible,name,max) {
  if(!Array.isArray(v)||v.length<1||v.length>max)fail('Invalid '+name+' list');
  const s=new Set();
  for(const item of v) {
    enumVal(item,possible,name);
    if(s.has(item))fail('Duplicate '+name);
    s.add(item);
  }
  return [...s];
}
function inferredDisciplines(task) {
  const input=task.toLowerCase().normalize('NFKC');
  const score=COMPETENCIES.map(c=>{
    const matches=c.aliases.filter(word=>{
      const escaped=word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      return new RegExp('(?:^|[^a-z0-9])'+escaped+'(?:$|[^a-z0-9])').test(input);
    });
    return {id:c.id,score:matches.length,matched:matches};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score || a.id.localeCompare(b.id));
  if(!score.length) return {ids:['game-design'],confidence:'low',matchedTerms:[]};
  const ids=score.slice(0,7).map(x=>x.id);
  return {ids,confidence:score.some(x=>x.score>1)?'medium':'low',matchedTerms:score.map(x=>({id:x.id,terms:x.matched}))};
}
function inferAssetKind(task) {
  const q=task.toLowerCase();
  if(/\b(house|building|roof|apartment|cottage|residence)\b/.test(q))return 'building';
  if(/\b(creature|monster|kirin|animal|character|dragon|quadruped)\b/.test(q))return 'creature';
  if(/\b(environment|region|landscape|world|terrain)\b/.test(q))return 'environment';
  if(/\b(ability|spell|attack|combat move)\b/.test(q))return 'ability';
  if(/\b(door|interact|mechanism|elevator|machine)\b/.test(q))return 'interaction';
  if(/\b(hud|menu|interface|ui|inventory)\b/.test(q))return 'interface';
  return 'general';
}

export function listCompetencies(){
  return {
    catalogVersion:CATALOG_VERSION,
    disciplines:COMPETENCIES.map(x=>({id:x.id,label:x.label,purpose:x.purpose,gateCount:x.gates.length})),
    styles:Object.entries(STYLES).map(([id,x])=>({id,label:x.label})),
    assetKinds:Object.entries(ASSET_KINDS).map(([id,x])=>({id,label:x.label})),
    evidenceKindsSupported:[...SUPPORTED_EVIDENCE_KINDS],
    limitation:'The library selects expertise, sources and checks; it neither runs Blender/Studio nor proves artistic proficiency.',
  };
}

export function buildCompetencyPlan(input,resolveBrief=null){
  checkKeys(input,['task','disciplines','style','assetKind','styleNotes','projectBriefId']);
  const projectBriefId=input.projectBriefId===undefined?null:str(input.projectBriefId,'projectBriefId',100);
  if(projectBriefId&&!resolveBrief)fail('An active project brief store is required for projectBriefId');
  const brief=projectBriefId?resolveBrief(projectBriefId):null;
  const task=str(input.task,'task',1600);
  const {ids:inferred,matchedTerms,confidence}=inferredDisciplines(task);
  const selection=input.disciplines===undefined?inferred:
    uniqueArray(input.disciplines,SKILL_IDS,'disciplines',8);
  const selected=COMPETENCIES.filter(x=>selection.includes(x.id));
  const styleId=input.style===undefined?(brief?.style??'unspecified'):enumVal(input.style,STYLES_SET,'style');
  const assetId=input.assetKind===undefined?inferAssetKind(task):enumVal(input.assetKind,ASSETS_SET,'assetKind');
  const styleNotes=input.styleNotes===undefined?null:str(input.styleNotes,'styleNotes',400);
  const style=STYLES[styleId];
  const asset=ASSET_KINDS[assetId];
  const resourceIds=[...new Set(selected.flatMap(x=>x.resourceIds))];
  const resources=resourceIds.map(id=>({id,...SOURCES[id]}));
  if(brief){
    brief.sourceLinks.forEach((link,i)=>resources.push({
      id:'user:'+i,title:link.title,url:link.url,why:link.note??'Project-supplied resource for human or agent review',
      type:link.kind,publisher:'user_supplied',rightsClaim:link.rightsClaim,
      provenance:'user_supplied_link',retrievalStatus:'not_fetched',
      rightsVerification:'not_independently_verified',
    }));
  }
  const gates=selected.flatMap(x=>x.gates.map(g=>({
    ...g,discipline:x.id,
    missingInfrastructure:g.requiredKinds.filter(kind=>!EVIDENCE_SET.has(kind)),
  })));
  return {
    kind:'competency_task_plan',catalogVersion:CATALOG_VERSION,task,
    selection:{
      disciplines:selected.map(x=>x.id),
      source:input.disciplines===undefined?'inferred_from_task':'explicit',
      inferenceConfidence:input.disciplines===undefined?confidence:'not_applicable',
      matchingTerms:input.disciplines===undefined?matchedTerms:[],
      warning:input.disciplines===undefined?
        'Text-based routing is provisional: confirm omitted disciplines before executing edits.':
        'Explicit discipline list used without automatic additions.',
    },
    asset:{
      kind:assetId,label:asset.label,root:asset.root,
      suggestedResponsibilities:[...asset.components],designRules:[...asset.guidance],
      caveat:'A proposed ownership hierarchy, not an instruction to merge parts or force one mesh per item.',
    },
    projectContext:brief?{
      briefId:brief.briefId,projectName:brief.projectName,
      creativeDirection:brief.creativeDirection,
      preserve:[...brief.preserve],avoid:[...brief.avoid],
      constraints:[...brief.constraints],
      referenceIds:[...brief.referenceIds],
      sourceLinkCount:brief.sourceLinks.length,
      provenance:'developer_supplied',verification:'not_independently_verified',
      warning:'This brief is task context only; imported reference IDs and URLs are not proof of fidelity, ownership or license clearance.',
    }:null,
    artDirection:{
      id:styleId,label:style.label,
      notes:styleNotes??brief?.creativeDirection??null,
      notesSource:styleNotes?'explicit_task':brief?.creativeDirection?'project_brief':'none',
      styleSource:input.style===undefined?(brief?'project_brief':'unspecified'):'explicit_task',
      principles:[...style.principles],avoid:[...style.avoid],
      status:styleId==='unspecified'?'needs_user_or_project_reference':'proposed_profile_requires_project_validation',
    },
    competencies:selected.map(c=>({
      id:c.id,label:c.label,purpose:c.purpose,
      methods:[...c.methods],antiPatterns:[...c.antiPatterns],
      gateIds:c.gates.map(g=>g.id),
    })),
    sources:resources,
    knowledge:retrieveKnowledge({task,disciplines:selected.map(x=>x.id),limit:6}),
    benchmarkCandidates:retrieveKnowledge({task,disciplines:selected.map(x=>x.id),limit:1}).benchmarkCandidates,
    resourcePolicy:{
      checkedOn:'2026-11-16',mode:brief&&brief.sourceLinks.length?'curated_plus_user_declared':'curated_offline',
      liveAvailability:'not_checked_at_request_time',
      note:'Official documentation is curated offline; project links are user-declared and NEVER fetched or license-verified. Refresh changing API claims before use. No assets were downloaded or licensed.',
    },
    qualityGates:gates,
    completionPolicy:'No gate passes because a source was listed or an agent asserts success. Evidence presence only makes a gate ready for human/agent review. Unsupported evidence kinds remain blocked; no final quality score.',
  };
}

export class CompetencyStore {
  constructor(resolveBrief=null){this.plans=new Map();this.resolveBrief=resolveBrief;}
  create(input){
    const plan={
      planId:randomUUID(),createdAt:new Date().toISOString(),
      ...buildCompetencyPlan(input,this.resolveBrief),
    };
    this.plans.set(plan.planId,plan);
    while(this.plans.size>MAX_PLANS)this.plans.delete(this.plans.keys().next().value);
    return structuredClone(plan);
  }
  list(){
    return [...this.plans.values()].map(x=>({
      planId:x.planId,task:x.task,createdAt:x.createdAt,
      disciplines:x.selection.disciplines,
      style:x.artDirection.id,assetKind:x.asset.kind,
      gateCount:x.qualityGates.length,
    }));
  }
  read(id) {
    if(typeof id!=='string'||id.length>100)fail('Invalid planId');
    const plan=this.plans.get(id);
    if(!plan)throw new CompetencyInputError('Competency plan missing or expired',404);
    return structuredClone(plan);
  }
  assess(input,hasEvidence){
    checkKeys(input,['planId','evidence','notApplicable']);
    const plan=this.read(input.planId);
    const entries=input.evidence===undefined?[]:input.evidence;
    if(!Array.isArray(entries)||entries.length>96)fail('Evidence must be a bounded list');
    const gates=new Map(plan.qualityGates.map(g=>[g.id,g]));
    const na=new Map();
    const exclusions=input.notApplicable===undefined?[]:input.notApplicable;
    if(!Array.isArray(exclusions)||exclusions.length>30)fail('notApplicable must be a bounded list');
    for(const item of exclusions) {
      checkKeys(item,['gateId','reason']);
      const gateId=str(item.gateId,'gateId',100);
      if(!gates.has(gateId)||na.has(gateId))fail('Unknown or duplicate not-applicable gate');
      const reason=str(item.reason,'reason',400);
      if(reason.length<20)fail('notApplicable requires a substantive reason');
      na.set(gateId,reason);
    }
    const seen=new Set();
    const records=[];
    for(const entry of entries){
      checkKeys(entry,['gateId','kind','id']);
      const gate= gates.get(str(entry.gateId,'gateId',100));
      if(!gate)fail('Evidence targets an unknown gate');
      const kind=enumVal(entry.kind,EVIDENCE_SET,'evidence kind');
      const id=str(entry.id,'evidence id',100);
      if(!gate.requiredKinds.includes(kind))fail('Evidence kind not requested by this gate');
      const key=gate.id+'|'+kind+'|'+id;
      if(seen.has(key))fail('Duplicate evidence');
      seen.add(key);
      if(na.has(gate.id))fail('A gate cannot be linked as evidence and marked not applicable');
      const found=hasEvidence(kind,id);
      const external=found && typeof found==='object' && found.provenance==='operator_reported_native_mcp_unverified';
      records.push({
        gateId:gate.id,kind,id,present:!!found,
        provenance:external?'operator_reported_native_mcp_unverified':
          found?'local_evidence_id_present':'not_found',
        verification:external?'not_independently_verified':
          found?'content_requires_review':'not_available',
      });
    }
    const results=plan.qualityGates.map(gate=>{
      const linked=records.filter(x=>x.gateId===gate.id);
      const available=linked.filter(x=>x.present);
      const missingKinds=gate.requiredKinds.filter(kind=>!available.some(x=>x.kind===kind));
      const unsupported=missingKinds.filter(kind=>!EVIDENCE_SET.has(kind));
      const reason=na.get(gate.id)??null;
      const externallyLinked=available.some(x=>x.provenance==='operator_reported_native_mcp_unverified');
      return {
        gateId:gate.id,discipline:gate.discipline,question:gate.question,
        review:gate.review,requiredKinds:[...gate.requiredKinds],
        evidence:linked,
        missingKinds,unsupportedKinds:unsupported,
        notApplicableReason:reason,
        applicabilityReview:reason?'operator_proposed_not_verified':'not_assessed',
        evidenceStatus:reason?'not_applicable_proposed':
          unsupported.length?'instrumentation_unavailable':
          missingKinds.length?(gate.appliesWhen==='always'?'evidence_missing':'conditional_unverified'):
          externallyLinked?'external_evidence_linked_for_review':'ready_for_review',
        appliesWhen:gate.appliesWhen,
        qualityVerdict:'not_assessed',
      };
    });
    const counts={
      total:results.length,
      evidenceReady:results.filter(g=>g.evidenceStatus==='ready_for_review').length,
      missing:results.filter(g=>g.evidenceStatus==='evidence_missing').length,
      conditional:results.filter(g=>g.evidenceStatus==='conditional_unverified').length,
      instrumentationUnavailable:results.filter(g=>g.evidenceStatus==='instrumentation_unavailable').length,
      externalLinked:results.filter(g=>g.evidenceStatus==='external_evidence_linked_for_review').length,
      notApplicableProposed:results.filter(g=>g.evidenceStatus==='not_applicable_proposed').length,
    };
    return {
      planId:plan.planId,assessedAt:new Date().toISOString(),counts,gates:results,
      overallVerdict:'not_assessed',
      warning:'Local IDs indicate stored evidence only. External native MCP references are operator-reported pointers, not validated receipts or images. Not-applicable choices are proposals requiring review. No functional, creative or quality gate is automatically passed.',
    };
  }
}
