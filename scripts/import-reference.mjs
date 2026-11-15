import { importReferenceFile } from '../src/reference-cli.mjs';
try{
  const r=await importReferenceFile();
  process.stdout.write(JSON.stringify({referenceId:r.referenceId,label:r.label,format:r.format,
    width:r.width,height:r.height,frameCount:r.frameCount},null,2)+'\n');
}catch(error){
  process.stderr.write('LAZY reference import: '+error.message+'\n');
  process.exitCode=1;
}
