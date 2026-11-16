import { buildCompetencyPlan, listCompetencies } from '../src/competency/engine.mjs';

const argv=process.argv.slice(2);
const usage='Usage: npm run competency:plan -- "task" [--style stylized] [--asset-kind building] [--disciplines building,modeling] [--style-notes "reference direction"]';
try {
  if(argv.length===1&&argv[0]==='--list'){
    process.stdout.write(JSON.stringify(listCompetencies(),null,2)+'\n');
  } else {
    if(argv.length<1||argv[0].startsWith('--'))throw Error(usage);
    const input={task:argv[0]};
    const names={'--style':'style','--asset-kind':'assetKind','--disciplines':'disciplines','--style-notes':'styleNotes'};
    const used=new Set();
    for(let i=1;i<argv.length;i+=2){
      const name=argv[i];
      if(!(name in names)||used.has(name)||!argv[i+1])throw Error(usage);
      used.add(name);
      input[names[name]]=name==='--disciplines'?argv[i+1].split(','):argv[i+1];
    }
    process.stdout.write(JSON.stringify(buildCompetencyPlan(input),null,2)+'\n');
  }
} catch(error) {
  process.stderr.write(error.message+'\n');
  process.exitCode=1;
}
