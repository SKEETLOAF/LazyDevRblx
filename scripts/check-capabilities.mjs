import { getCapabilityMatrix, validateCapabilityCatalog } from '../src/capabilities/registry.mjs';
const flag=process.argv[2]??'--summary';
if(process.argv.length>3||!['--summary','--json','--validate'].includes(flag)){
  process.stderr.write('Usage: npm run capabilities -- [--summary|--json|--validate]\n');
  process.exitCode=1;
}else if(flag==='--validate'){
  process.stdout.write(JSON.stringify(validateCapabilityCatalog(),null,2)+'\n');
}else{
  const matrix=getCapabilityMatrix();
  if(flag==='--json')process.stdout.write(JSON.stringify(matrix,null,2)+'\n');
  else {
    process.stdout.write('LAZY capability matrix '+matrix.registryVersion+'\n');
    process.stdout.write('Source-declared status, not a live Studio probe:\n\n');
    for(const c of matrix.capabilities){
      const status=c.userReport?'user-reported, unversioned':c.implemented?'implemented, Node tests listed':'not implemented in LAZY';
      process.stdout.write(c.id.padEnd(32)+' '+c.route.padEnd(20)+' '+status+'\n');
    }
    process.stdout.write('\n'+matrix.warning+'\n');
  }
}
