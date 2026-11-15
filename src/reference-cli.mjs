import { readFile, stat } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import { readSession } from './session.mjs';
import { MEDIA_MAX_BYTES } from './reference-media.mjs';

const TYPES={'.png':'image/png','.gif':'image/gif','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'};
export async function importReferenceFile(args=process.argv.slice(2),{readSessionFn=readSession,post=fetch}={}) {
  const [file,...flags]=args;
  if(!file || flags.length>2 || (flags.length>0 && (flags[0]!=='--label'||flags.length!==2))) {
    throw new Error('Usage: npm run reference:import -- "file.png|gif|jpg|webp" [--label "Description"]');
  }
  const kind=TYPES[extname(file).toLowerCase()];
  if(!kind)throw new Error('Reference file extension must be PNG, GIF, JPEG or WebP');
  const label=flags.length?flags[1]:basename(file);
  if(typeof label!=='string'||!label.trim()||Buffer.byteLength(label,'utf8')>100||/[\u0000-\u001f\u007f]/u.test(label)){
    throw new Error('Label must be 1-100 UTF-8 bytes and contain no control characters');
  }
  const info=await stat(file);
  if(!info.isFile() || info.size<10||info.size>MEDIA_MAX_BYTES)throw new Error('Only explicit regular media files up to 8 MiB are allowed');
  const bytes=await readFile(file);
  if(bytes.length!==info.size)throw new Error('Reference file changed during reading');
  const {token,port}=readSessionFn();
  const response=await post(`http://127.0.0.1:${port}/v1/references/import`,{
    method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':kind,
      'X-Reference-Label':Buffer.from(label,'utf8').toString('base64url')},
    body:bytes,signal:AbortSignal.timeout(15000),
  });
  const result=await response.json();
  if(!response.ok)throw new Error('Reference import failed: '+String(result.error||'Bridge error'));
  return result;
}
