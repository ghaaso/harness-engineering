const fs=require('fs');
const L='C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const D='C:/Users/User/Documents/projects/EMS_workshop1/docs/program/evidence/harness-bottlenecks/graph2/embeddings';
const t=JSON.parse(fs.readFileSync(L+'/train/report/tune.json','utf8'));
console.log('tune keys',Object.keys(t));
const v=t.verdicts; console.log('verdict keys',Object.keys(v));
const l=v.late50; for(const a of Object.keys(l)){console.log(a, JSON.stringify(l[a]).slice(0,1500));}
const rs=fs.readFileSync(D+'/result.json','utf8'); const r=JSON.parse(rs);
console.log('result keys',Object.keys(r));
console.log('verdicts E2',JSON.stringify(r.verdicts&&r.verdicts.E2));
console.log('alone_unrestricted in result.json:',rs.includes('alone_unrestricted'));
const idx=[];let i=-1;while((i=rs.indexOf('alone',i+1))>=0&&idx.length<5)idx.push(rs.slice(i-80,i+120));console.log(idx.join('\n---\n'));
