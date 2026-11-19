import fs from 'node:fs';
const names=['T1 ','T2 ','T3 ','T4 ','T5 ','T5b ','T5c ','T5e ','T5f ','T5d ','T6 ','T7 ','T8 ','T9 ','T10 ','T11 ','T12 ','T13 ','T14 ','step 5 judge','--keep-failed','step 6 ','fixtures:','T15 ','T15b ','T16 ','T17 ','T18 ','T19 ','needs-app 11','needs-app 7'];
const d=[10.5,10.2,1.5,11.1,14.2,3.1,10.3,24.8,8.7,10.9,18.4,10.8,8.1,11.2,14,1,1,.5,13.3,14.7,11.3,.5,3.3,.3,.3,1.5,3.9,.9,.8,0,0];
const idx=d.map((x,i)=>i).sort((a,b)=>d[b]-d[a]);const s=[[],[],[],[]],w=[0,0,0,0];
for(const i of idx){const k=w.indexOf(Math.min(...w));s[k].push(i);w[k]+=d[i]}
console.log(w.map(x=>x.toFixed(1)).join(' '));
const out=s.map((a,k)=>'node --test --test-reporter=tap '+a.map(i=>'--test-name-pattern="^'+names[i]+'"').join(' ')+' tcb/test/selftest.test.mjs > build/facts/lane-measure/shard-'+(k+1)+'.log 2>&1');
fs.writeFileSync('build/facts/lane-measure/shards.cmds',out.join('\n')+'\n');
