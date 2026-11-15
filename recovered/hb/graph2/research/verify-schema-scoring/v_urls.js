// Independent regex-based check of client URL literal sites vs backend + ops-server routes.
const fs=require('fs'),path=require('path');
const R='C:/Users/User/Documents/projects/EMS_workshop1';
function walk(d,out){for(const e of fs.readdirSync(d,{withFileTypes:true})){if(e.name==='node_modules'||e.name.startsWith('.'))continue;const p=path.join(d,e.name);if(e.isDirectory())walk(p,out);else out.push(p.split(path.sep).join('/'));}return out;}
const routes=[];
for(const f of walk(R+'/backend/app',[]).filter(f=>f.endsWith('.py')&&!/\/tests\//.test(f))){
 const s=fs.readFileSync(f,'utf8');
 const rp={};for(const m of s.matchAll(/^(\w+)\s*=\s*APIRouter\(([\s\S]*?)^\)|^(\w+)\s*=\s*APIRouter\(([^\n]*)\)$/gm)){const name=m[1]||m[3];const body=m[2]||m[4]||'';const p=/prefix="([^"]*)"/.exec(body);rp[name]=p?p[1]:'';}
 for(const m of s.matchAll(/^\s*@(\w+)\.(get|post|put|patch|delete)\(\s*"([^"]*)"/gm)){if(!(m[1] in rp)){console.log('no router',f,m[1]);continue;}routes.push({m:m[2].toUpperCase(),p:'/api'+rp[m[1]]+m[3],f:f.slice(R.length+1)});}
}
const ops=fs.readFileSync(R+'/ops-server.mjs','utf8');
for(const m of ops.matchAll(/pathname === "(\/api\/[^"]+)"(?: && req\.method === "(\w+)")?/g))routes.push({m:m[2]||'GET',p:m[1],f:'ops-server.mjs'});
const be=routes.filter(r=>r.f!=='ops-server.mjs');
console.log('backend routes',be.length,'ops-server routes',routes.length-be.length);
const norm=p=>p.replace(/\{[^}]*\}/g,'{}');
const segMatch=(rp,p)=>{const a=norm(rp).split('/'),b=p.split('/');return a.length===b.length&&a.every((s,i)=>s===b[i]||s==='{}')};
const files=[...walk(R+'/technician-app/src',[]),...walk(R+'/src',[])].filter(f=>/\.(ts|tsx|js|jsx)$/.test(f)&&!/__tests__|\.test\.|\.spec\./.test(f));
const sites=[];
for(const f of files){const s=fs.readFileSync(f,'utf8');
 for(const m of s.matchAll(/([`'"])(\/api\/(?:[^`'"\\$]|\$\{[^}]*\}|\$)*)\1/g)){let p=m[2];
  p=p.replace(/\$\{[^}]*\}/g,'{X}');
  p=p.replace(/([^/])\{X\}.*$/,'$1').replace(/\?.*$/,'');
  p=p.replace(/\{X\}/g,'{}');
  sites.push({f:f.slice(R.length+1),p,raw:m[2]});}}
let matched=0;const unm=[];const hit=new Set();
for(const x of sites){const c=routes.filter(r=>segMatch(r.p,x.p));if(c.length){matched++;c.forEach(r=>hit.add(r.p))}else unm.push(x);}
console.log('client /api literal sites (prod, regex)',sites.length,'path-matched',matched,'mobile',sites.filter(s=>s.f.startsWith('technician-app')).length,'web',sites.filter(s=>!s.f.startsWith('technician-app')).length);
console.log('unmatched:',unm.map(u=>u.f+' '+u.raw).join(' | '));
const bePaths=new Set(be.map(r=>r.p));
console.log('distinct backend paths',bePaths.size,'backend paths hit by a client literal (path only, method-agnostic)',[...bePaths].filter(p=>hit.has(p)).length);
const tf=walk(R+'/backend',[]).filter(f=>f.endsWith('.py')&&/\/tests?\//.test(f)&&!/venv/.test(f));
let tcalls=0;const tr=new Set();const tunm=[];
for(const f of tf){const s=fs.readFileSync(f,'utf8');for(const m of s.matchAll(/\.(get|post|put|patch|delete)\(\s*f?"(\/api\/[^"]*)"/g)){tcalls++;const p=m[2].replace(/\{[^}]*\}/g,'{}').replace(/\?.*$/,'');
 const c=be.filter(r=>r.m===m[1].toUpperCase()&&segMatch(r.p,p));
 if(c.length){c.sort((x,y)=>norm(y.p).split('/').filter(s=>s!=='{}').length-norm(x.p).split('/').filter(s=>s!=='{}').length);tr.add(c[0].m+' '+c[0].p)}else tunm.push(f.slice(R.length+1)+' '+m[1]+' '+m[2]);}}
console.log('pytest literal http calls (regex, string-literal first arg)',tcalls,'unmatched',tunm.length,'distinct routes hit',tr.size);
console.log(tunm.slice(0,20).join('\n'));
