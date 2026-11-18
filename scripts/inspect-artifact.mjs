import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {basename,extname,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {analyzeWav,WAV_MAX_BYTES} from '../src/artifacts/audio.mjs';
import {normalizeAudit} from '../src/artifacts/audits.mjs';
const args=process.argv.slice(2);
const usage='Usage: npm run artifact:inspect -- wav "sound.wav" [--out "report.json"] OR blender "model.blend" --out "new-report-folder" [--blender "blender.exe"] [--previews]';
function parse(){
  if(args.length<2||!['wav','blender'].includes(args[0]))throw Error(usage);
  const kind=args[0],file=args[1];
  if(typeof file!=='string'||file.startsWith('--'))throw Error(usage);
  const options={kind,file};
  const flags=new Set();
  for(let i=2;i<args.length;i++){
    const flag=args[i];
    if(!['--out','--blender','--previews'].includes(flag)||flags.has(flag))throw Error(usage);
    flags.add(flag);
    if(flag==='--previews')options.previews=true;
    else{
      if(!args[i+1]||args[i+1].startsWith('--'))throw Error(usage);
      options[flag==='--out'?'out':'blender']=args[++i];
    }
  }
  if(kind==='wav'&&(options.blender||options.previews))throw Error(usage);
  if(kind==='blender'&&!options.out)throw Error('Blender requires an explicit new output folder');
  if(extname(file).toLowerCase()!== (kind==='wav'?'.wav':'.blend'))throw Error('Unexpected file extension for '+kind);
  return options;
}
async function run(){
  const options=parse();
  const file=resolve(options.file);
  const info=await stat(file);
  if(!info.isFile())throw Error('Input must be a regular file');
  if(options.kind==='wav'){
    if(info.size<44||info.size>WAV_MAX_BYTES)throw Error('WAV must be between 44 bytes and 32 MiB');
    const bytes=await readFile(file);
    if(bytes.length!==info.size)throw Error('Input changed while reading');
    const {warnings,...facts}=analyzeWav(bytes);
    const report=normalizeAudit({
      schema:'lazydev.creative_audit.v1',kind:'wav',sourceLabel:basename(file),
      generatedAt:new Date().toISOString(),tool:'lazydev.wav-inspector.v1',facts,warnings,
    });
    // Normalization metadata describes an operator-submitted claim; omit it in the CLI report.
    const {provenance,verification,qualityVerdict,...plain}=report;
    const json=JSON.stringify(plain,null,2)+'\n';
    if(options.out){
      const dest=resolve(options.out);
      if(dest===file)throw Error('Cannot overwrite input');
      await writeFile(dest,json,{flag:'wx',encoding:'utf8'});
      process.stdout.write('Created '+dest+'\n');
    }else process.stdout.write(json);
    return;
  }
  if(info.size<16||info.size>1024*1024*1024)throw Error('.blend must be a regular file at most 1 GiB');
  const dest=resolve(options.out);
  if(dest===file||dest===dirname(file))throw Error('Specify a NEW output directory, not the source');
  await mkdir(dirname(dest),{recursive:true});
  await mkdir(dest,{recursive:false});
  const inspector=fileURLToPath(new URL('../adapters/blender/inspect_scene.py',import.meta.url));
  const blender=options.blender||'blender';
  const cmd=[
    '--background','--factory-startup','--disable-autoexec',file,
    '--python-exit-code','7','--python',inspector,'--',
    '--output',dest,...(options.previews?['--previews']:[]),
  ];
  const result=spawnSync(blender,cmd,{
    shell:false,encoding:'utf8',timeout:180000,maxBuffer:2*1024*1024,
    windowsHide:true,
  });
  if(result.error||result.status!==0){
    const reason=result.error?.code||'Blender exited unsuccessfully';
    throw Error('Blender scene inspection failed ('+reason+'). Check Blender installation and the selected scene. No .blend changes were saved.');
  }
  const data=await readFile(resolve(dest,'audit.json'),'utf8');
  const validated=normalizeAudit(JSON.parse(data));
  if(validated.kind!=='blender')throw Error('Blender returned the wrong audit kind');
  process.stdout.write('Created '+resolve(dest,'audit.json')+(options.previews?' and optional diagnostic previews':'')+'\n');
}
run().catch(error=>{process.stderr.write(String(error.message)+'\n');process.exitCode=1;});
