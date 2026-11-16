const fs=require('fs');
const r=require('C:/Users/User/Documents/projects/EMS_workshop1/docs/program/evidence/harness-bottlenecks/graph2/embeddings/result.json');
const word=x=>(x.lo>0&&x.diff>=0.02)?'adds':(x.lo>=-0.02&&x.hi<=0.02)?'matches':(x.hi<0?'cannot tell (lower)':'cannot tell');
const out={};
for(const set of ['late50','late50_pilot_shared']){const v=r.tune_full.vs_RRF[set];if(!v){out[set]='absent';continue;}
 for(const sc of Object.keys(v))for(const arm of Object.keys(v[sc])){if(/builder/.test(arm))continue;const x=v[sc][arm]['P@10'];out[set+'|'+sc+'|'+arm]=word(x)+' '+x.diff.toFixed(4)+' ['+x.lo.toFixed(4)+','+x.hi.toFixed(4)+']';}}
// compare with my recompute of comparators on shared commits
const comp=JSON.parse(fs.readFileSync('comp-result.json','utf8'));
const tasks=fs.readFileSync('C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings/eval/tune_tasks.jsonl','utf8').split('\n').filter(Boolean).map(JSON.parse);
console.log(JSON.stringify(out,null,1));
console.log('vs_RRF sets',Object.keys(r.tune_full.vs_RRF));
