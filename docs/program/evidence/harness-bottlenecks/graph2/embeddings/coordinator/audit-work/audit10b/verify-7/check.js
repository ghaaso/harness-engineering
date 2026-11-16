const fs=require('fs'),path=require('path');
const L='C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const D='C:/Users/User/Documents/projects/EMS_workshop1/docs/program/evidence/harness-bottlenecks/graph2/embeddings';
let out=[];
for(const f of fs.readdirSync(L+'/r58c/mounts')){const j=JSON.parse(fs.readFileSync(L+'/r58c/mounts/'+f));const o=Array.isArray(j)?j[0]:j;const h=o.HostConfig||{};out.push(f+' mem='+h.Memory+' net='+h.NetworkMode+' start='+(o.State&&o.State.StartedAt)+' exit='+(o.State&&o.State.ExitCode));}
const a=fs.readFileSync(D+'/AUDIT.md','utf8');const lines=a.split('\n');
const re=/6442450944|4294967296|2684354560|6 ?GB|6 ?GiB|\b6g\b|ruling 108|Ruling 108|108\b/;
lines.forEach((l,i)=>{let m;const r=new RegExp(re.source,'g');while((m=r.exec(l))){out.push('AUDIT:'+(i+1)+': ...'+l.slice(Math.max(0,m.index-150),m.index+150).replace(/\n/g,' ')+'...');if(out.length>200)break;}});
const p=fs.readFileSync(L+'/progress.jsonl','utf8').split('\n');
p.forEach((l,i)=>{if(/6g|6 GB|cap/.test(l)&&/heldout|H1|108/.test(l))out.push('PROG:'+(i+1)+': '+l.slice(0,400));});
for(const f of ['RESULT.md','result.json','CLAIMS.md','INSTALL.md','INSTALL-GPU.md']){const t=fs.readFileSync(D+'/'+f,'utf8').split('\n');t.forEach((l,i)=>{if(/6442450944|6 ?GB|6 ?GiB|\b6g\b|108/.test(l))out.push(f+':'+(i+1)+': '+l.slice(0,300));});}
fs.writeFileSync(__dirname+'/out.txt',out.join('\n'));
