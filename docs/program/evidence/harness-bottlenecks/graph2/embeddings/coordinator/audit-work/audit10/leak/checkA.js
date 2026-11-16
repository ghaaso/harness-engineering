const fs=require('fs'),cp=require('child_process');
const L=process.argv[2], R=process.argv[3];
const git=(...a)=>cp.execFileSync('git',['-C',R,...a],{encoding:'utf8',maxBuffer:1<<28});
const plan=JSON.parse(fs.readFileSync(L+'/train/stageB/plan.json','utf8'));
const tune=fs.readFileSync(L+'/eval/tune_tasks.jsonl','utf8').trim().split('\n').map(JSON.parse);
const hoCk=new Set(plan.heldout.checkpoints);
for(const [n,s] of [['STAGEA_SHA','cd806c803c4ad8ec198790096d196460789951f0'],['LARGEST_TUNE','7b3a745281898d3d5808c5a15c4916d1d9dbb1b4']]){
  const rev=new Set(git('rev-list',s).trim().split('\n'));
  const anc=fs.readFileSync(L+'/export/graphs/'+s+'/ancestors.txt','utf8').trim().split(/\r?\n/);
  const commits=[...new Set(tune.map(t=>t.commit))];const late=[...new Set(tune.filter(t=>t.late50).map(t=>t.commit))];
  const inner=[...new Set(tune.filter(t=>!t.late50).map(t=>t.commit))];
  console.log(n,s.slice(0,8),'in tune ck',plan.checkpoints.includes(s),'is ho ck',hoCk.has(s),'is tune parent',tune.some(t=>t.parent===s),
   'late50 commits in revlist',late.filter(c=>rev.has(c)).length,'of',late.length,'inner in revlist',inner.filter(c=>rev.has(c)).length,'of',inner.length,
   'late50 in ancestors.txt',late.filter(c=>anc.includes(c)).length,'ho parents in revlist',[...hoCk].filter(c=>rev.has(c)).length,
   'anc listed not in rev',anc.filter(c=>!rev.has(c)).length);
}
