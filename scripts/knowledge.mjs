import {listKnowledge,retrieveKnowledge,listBenchmarks,planBenchmark} from '../src/knowledge/engine.mjs';
const args=process.argv.slice(2);
const usage='Usage: npm run knowledge -- list | query "task" [--disciplines animation,vfx] [--limit 5] | benchmarks | benchmark ID';
try{
 let output;
 if(args.length===1&&args[0]==='list')output=listKnowledge();
 else if(args.length===1&&args[0]==='benchmarks')output=listBenchmarks();
 else if(args.length===2&&args[0]==='benchmark')output=planBenchmark({benchmarkId:args[1]});
 else if(args[0]==='query'&&args[1]&&!args[1].startsWith('--')){
  const request={task:args[1]},seen=new Set();
  if((args.length-2)%2)throw Error(usage);
  for(let i=2;i<args.length;i+=2){
   if(!['--disciplines','--limit'].includes(args[i])||!args[i+1]||seen.has(args[i]))throw Error(usage);
   seen.add(args[i]);if(args[i]==='--disciplines')request.disciplines=args[i+1].split(',');
   else request.limit=Number(args[i+1]);
  }
  output=retrieveKnowledge(request);
 }else throw Error(usage);
 process.stdout.write(JSON.stringify(output,null,2)+'\n');
}catch(e){process.stderr.write(e.message+'\n');process.exitCode=1}
