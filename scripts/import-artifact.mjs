import {readFile,stat} from 'node:fs/promises';
import {readSession} from '../src/session.mjs';
import {normalizeAudit} from '../src/artifacts/audits.mjs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
export async function importAuditFile(args=process.argv.slice(2),{readSessionFn=readSession,post=fetch}={}){
  if(args.length!==1||!args[0]||args[0].startsWith('--'))throw Error('Usage: npm run artifact:import -- "audit.json"');
  const f=args[0],info=await stat(f);
  if(!info.isFile()||info.size<50||info.size>300*1024)throw Error('Expected an audit.json under 300 KiB');
  const bytes=await readFile(f);
  if(bytes.length!==info.size)throw Error('Audit changed during reading');
  const source=JSON.parse(bytes.toString('utf8'));
  const audit=normalizeAudit(source);
  const {schema,kind,sourceLabel,generatedAt,tool,facts,warnings}=audit;
  // Explicit, metadata-only submission. Raw Blender/audio files and images remain local.
  const payload={schema,kind,sourceLabel,generatedAt,tool,facts,warnings};
  const {port,token}=readSessionFn();
  const response=await post('http://127.0.0.1:'+port+'/v1/artifacts/import',{
    method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify(payload),signal:AbortSignal.timeout(15000),
  });
  const data=await response.json();
  if(!response.ok)throw Error('Audit import rejected: '+String(data.error||'bridge error'));
  return data;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  importAuditFile().then(x=>process.stdout.write(JSON.stringify(x,null,2)+'\n'))
    .catch(e=>{process.stderr.write(e.message+'\n');process.exitCode=1;});
}
