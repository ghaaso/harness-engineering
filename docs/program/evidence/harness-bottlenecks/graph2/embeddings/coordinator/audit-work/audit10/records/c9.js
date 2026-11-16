const fs=require('fs'),crypto=require('crypto');const L='C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const D='C:/Users/User/Documents/projects/EMS_workshop1/docs/program/evidence/harness-bottlenecks/graph2/embeddings';
const lines=fs.readFileSync(D+'/AUDIT.md','utf8').split('\n');const s=lines.findIndex(l=>l.startsWith('### 9c.'));let n=0,ok=0;const seen=new Set();
for(let i=s;i<Math.min(lines.length,s+50);i++){const m=lines[i].match(/\| ((?:r58c|orchestrator)\/\S+\.json) \| (\d+) \| ([0-9a-f]{64}) \|/);if(!m)continue;n++;const b=fs.readFileSync(L+'/'+m[1]);const h=crypto.createHash('sha256').update(b).digest('hex');seen.add(m[1]);const good=h===m[3]&&b.length==m[2];if(good)ok++;else console.log('MISMATCH',m[1],h,b.length,'line',i+1);}
console.log('rows',n,'ok',ok);
const all=fs.readdirSync(L+'/r58c/mounts').map(f=>'r58c/mounts/'+f);console.log('records not listed:',all.filter(f=>!seen.has(f)));
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const fl=fs.readFileSync(L+'/orchestrator/freeze-list.txt','utf8');
for(const f of ['r58c/A/mounts-A.json','r58c/B/mounts-B.json','r58c/B/mounts.js']){const h=sha(L+'/'+f);const fr=fl.split('\n').filter(l=>l.includes(f));console.log(f,h,'freeze:',fr.map(l=>l.slice(0,140)).join(' || '));}
