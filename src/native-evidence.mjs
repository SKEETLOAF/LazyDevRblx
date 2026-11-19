import { randomUUID } from 'node:crypto';

// Pointers to externally acquired evidence, NOT the evidence bytes or an
// independently verifiable native MCP receipt. No filesystem reads occur.
const SOURCES = Object.freeze({
  viewport: 'screen_capture',
  structure: 'search_game_tree',
  playtest: 'start_stop_play',
  diagnostics: 'get_console_output',
  observation: 'script_read',
});
const MODES = new Set(['edit', 'play', 'run', 'unknown']);
const MAX = 30;
const own = (x,k) => Object.hasOwn(x,k);
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
export class NativeEvidenceInputError extends Error {
  constructor(message){ super(message); this.name='NativeEvidenceInputError'; this.status=400; }
}
function fail(message) { throw new NativeEvidenceInputError(message); }
function value(x, key, max=160) {
  if(typeof x !== 'string' || !x.trim() || x.length > max) fail('Invalid '+key);
  return x.trim();
}
export class NativeEvidenceStore {
  constructor() { this.records = new Map(); }
  record(input) {
    if(!object(input) || Object.keys(input).some(k=>![
      'kind','provider','sourceTool','sourceReference','capturedAt',
      'placeId','universeId','placeName','sessionLabel','captureMode',
      'summary','operatorConsent'
    ].includes(k))) fail('Unexpected native evidence fields');
    if(input.operatorConsent !== true) fail('Explicit operator approval of this metadata is required');
    const kind=value(input.kind,'kind',30);
    if(!own(SOURCES,kind) || input.provider!=='Roblox_Studio' ||
       input.sourceTool!==SOURCES[kind]) fail('Unsupported native evidence kind or source tool');
    const sourceReference=value(input.sourceReference,'sourceReference',160);
    if(!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,159}$/.test(sourceReference) ||
       sourceReference.includes('..')) fail('Use an opaque, non-secret source ID; never paste file paths or URLs');
    const placeName=value(input.placeName,'placeName',160);
    const sessionLabel=value(input.sessionLabel,'sessionLabel',60);
    if(!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,59}$/.test(sessionLabel)) fail('Invalid sessionLabel');
    for(const k of ['placeId','universeId']) {
      if(!Number.isSafeInteger(input[k]) || input[k]<0) fail('Invalid '+k);
    }
    if(!MODES.has(input.captureMode)) fail('Invalid captureMode');
    const summary=value(input.summary,'summary',500);
    const capturedAt=value(input.capturedAt,'capturedAt',36);
    const timestamp=Date.parse(capturedAt);
    if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(capturedAt) ||
       !Number.isFinite(timestamp) ||
       timestamp>Date.now()+5*60_000 ||
       timestamp<Date.now()-30*86400_000) fail('Invalid, future, or expired capture timestamp');
    const record={
      evidenceId:randomUUID(), kind, provider:'Roblox_Studio',
      sourceTool:input.sourceTool, sourceReference, capturedAt,
      placeContext:{
        placeId:input.placeId, universeId:input.universeId, placeName,
        sessionLabel, captureMode:input.captureMode,
      },
      summary, recordedAt:new Date().toISOString(),
      provenance:'operator_reported_native_mcp_unverified',
      verification:'not_independently_verified',
      contentStored:false,
      warning:'Only an operator-supplied native MCP evidence pointer was stored; no file, screenshot, output or tool receipt was retrieved. The host must inspect real source material.',
    };
    this.records.set(record.evidenceId,record);
    while(this.records.size>MAX)this.records.delete(this.records.keys().next().value);
    return structuredClone(record);
  }
  list() { return [...this.records.values()].map(({evidenceId,kind,sourceTool,placeContext,capturedAt,verification})=>
    ({evidenceId,kind,sourceTool,placeContext,capturedAt,verification})); }
  read(id) {
    if(typeof id!=='string'||id.length>100)fail('Invalid evidenceId');
    const record=this.records.get(id);
    if(!record)fail('Native evidence pointer missing or expired');
    return structuredClone(record);
  }
  lookup(kind,id) {
    const r=this.records.get(id);
    return r?.kind===kind?r:null;
  }
}
