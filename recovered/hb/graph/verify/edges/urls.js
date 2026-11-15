// Feasibility probe: link client URL literals (web + mobile) to backend route handlers by script.
const fs=require('fs'),cp=require('child_process'); const repo='C:/Users/User/Documents/projects/EMS_workshop1';
const files=cp.execSync('git -C '+repo+' ls-files',{encoding:'utf8'}).split('\n').filter(Boolean); const rd=f=>fs.readFileSync(repo+'/'+f,'utf8');
// 1. route table
const routes=[];
for(const f of files.filter(f=>/^backend\/app\/.*router\.py$/.test(f))){ const s=rd(f);
  const pref={}; let m; const reR=/^(\w+)\s*=\s*APIRouter\(([\s\S]*?)\)\s*$/gm; while((m=reR.exec(s))){ const p=m[2].match(/prefix\s*=\s*"([^"]*)"/); pref[m[1]]=p?p[1]:''; }
  const reD=/@(\w+)\.(get|post|put|patch|delete)\(\s*"([^"]*)"/g; while((m=reD.exec(s))){ routes.push({file:f,method:m[2].toUpperCase(),path:'/api'+(pref[m[1]]||'')+m[3]}); } }
const norm=p=>p.replace(/\{[^}]+\}/g,'{}').replace(/\/$/,'');
const table=new Map(); for(const r of routes){ const k=norm(r.path); (table.get(k)||table.set(k,[]).get(k)).push(r); }
// 2. client literals
const lits=[]; for(const f of files.filter(f=>/^(src|technician-app\/src)\/.*\.(js|jsx|ts|tsx)$/.test(f)&&!/\.test\./.test(f))){ const s=rd(f); let m;
  const re=/[`"'](\/api\/[^`"'\s]*)[`"']/g; while((m=re.exec(s)))lits.push({file:f,raw:m[1]}); }
let hit=0,miss=[]; const pairs=new Set();
for(const l of lits){ let p=l.raw.replace(/\$\{qs\([^)]*\)\}|\?.*$/g,'').replace(/\$\{[^}]*\}/g,'{}').replace(/\/$/,'');
  const r=table.get(p); if(r){hit++; for(const x of r)pairs.add(l.file+' -> '+x.file);} else miss.push(l.file+' '+l.raw); }
console.log('routes',routes.length,'distinct normalised paths',table.size,'| client /api literals',lits.length,'matched',hit,'unmatched',miss.length,'| client-file -> router-file links',pairs.size);
miss.forEach(x=>console.log('  unmatched',x));
