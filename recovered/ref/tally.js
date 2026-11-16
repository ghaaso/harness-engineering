const fs=require('fs'),path=require('path'),readline=require('readline');
const root='C:/Users/User/.claude/projects';
const dirs=fs.readdirSync(root).filter(d=>d.startsWith('C--Bilal-Migration-User-Downloads-20-PROJECTS-24-Clinic-Workshop'));
function walk(d){let out=[];for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())out=out.concat(walk(p));else if(e.name.endsWith('.jsonl'))out.push(p);}return out;}
(async()=>{const res={};for(const d of dirs){const isRoot=d==='C--Bilal-Migration-User-Downloads-20-PROJECTS-24-Clinic-Workshop';
 for(const f of walk(path.join(root,d))){const sub=/subagents|agent-/.test(f);const key=(isRoot?'ROOTDIR':'WORKTREES')+(sub?'/sub':'/main');
  res[key]=res[key]||{calls:0,cr:0,cc:0,out:0,inp:0};const seen=new Set();
  const rl=readline.createInterface({input:fs.createReadStream(f),crlfDelay:Infinity});
  for await(const line of rl){if(line.indexOf('"usage"')<0)continue;let j;try{j=JSON.parse(line)}catch{continue}
   if(!j.timestamp||j.timestamp<'2026-11-01')continue;const m=j.message;if(!m||!m.usage||!m.id)continue;if(seen.has(m.id))continue;seen.add(m.id);
   const u=m.usage;const r=res[key];r.calls++;r.cr+=u.cache_read_input_tokens||0;r.cc+=u.cache_creation_input_tokens||0;r.out+=u.output_tokens||0;r.inp+=u.input_tokens||0;}
 }}
 for(const k in res){const r=res[k];console.log(k,'calls',r.calls,'cacheRead(M)',(r.cr/1e6).toFixed(1),'cacheCreate(M)',(r.cc/1e6).toFixed(1),'out(M)',(r.out/1e6).toFixed(2),'in(M)',(r.inp/1e6).toFixed(2));}
})();
