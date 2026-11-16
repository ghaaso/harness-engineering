const fs=require('fs'),cp=require('child_process');
const L='C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const R='C:/Users/User/Documents/projects/EMS_workshop1';
const git=(a)=>cp.execFileSync('git',['-C',R,...a],{encoding:'utf8',maxBuffer:1<<28});
const tune=new Set(fs.readFileSync(L+'/eval/tune_tasks.jsonl','utf8').trim().split('\n').map(l=>JSON.parse(l).parent));
const held=new Set(fs.readFileSync('heldout_truth2.jsonl','utf8').trim().split('\n').map(l=>JSON.parse(l).parent));
const r={tune:[0,0,0],held:[0,0,0]};
for(const p of fs.readdirSync(L+'/export/graphs')){const k=tune.has(p)?'tune':held.has(p)?'held':null;if(!k)continue;
 const h=new Set(fs.readFileSync(`${L}/export/graphs/${p}/ancestors.txt`,'utf8').split('\n').map(s=>s.trim()).filter(Boolean));
 const nm=git(['rev-list','--no-merges',p]).split('\n').filter(Boolean);const np=git(['rev-list','--parents','-n1',p]).trim().split(' ').length-1;
 r[k][0]++; if(np===1&&!h.has(p))r[k][1]++; r[k][2]+=nm.filter(x=>!h.has(x)).length;}
const s='[parents, non-merge parents absent from own history, total non-merge git ancestors absent from history] '+JSON.stringify(r);fs.writeFileSync('anc4.out',s);console.log(s);
