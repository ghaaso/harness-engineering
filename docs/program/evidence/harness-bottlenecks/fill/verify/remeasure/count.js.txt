const fs=require('fs'),rl=require('readline'),path=require('path');
const root='C:/Users/User/.claude/projects/';
const dirs=fs.readdirSync(root).filter(d=>d.startsWith('C--Bilal-Migration-User-Downloads-20-PROJECTS-24-Clinic-Workshop'));
function walk(d,depth,out){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p,depth+1,out);else if(e.name.endsWith('.jsonl'))out.push({p,depth});}return out;}
const files=[];for(const d of dirs){for(const f of walk(root+d,0,[])){f.kind=f.depth===0?(d.includes('worktrees')?'slice':'root'):'sub';files.push(f);}}
fs.writeFileSync('files.json',JSON.stringify(files));
(async()=>{const tot={};for(const f of files){const ids=new Set();let req=0,blob=0,nov=0,syn=0,cs=0;
const r=rl.createInterface({input:fs.createReadStream(f.p)});
for await(const l of r){if(l.includes('"api-request"'))req++;if(l.includes('"api-request-blob"'))blob++;if(l.includes('isCompactSummary'))cs++;
 if(!l.includes('"assistant"'))continue;let o;try{o=JSON.parse(l)}catch(e){continue}
 if(o.type!=='assistant')continue;if(o.message.model==='<synthetic>'){syn++;continue}if(!(o.timestamp||'').startsWith('2026-11'))continue;ids.add(o.message.id);}
const k=f.kind;tot[k]=tot[k]||{files:0,calls:0,req:0,blob:0,cs:0,withreq:0};const t=tot[k];t.files++;t.calls+=ids.size;t.req+=req;t.blob+=blob;t.cs+=cs;if(req)t.withreq++;}
console.log(JSON.stringify(tot,null,1));})();
