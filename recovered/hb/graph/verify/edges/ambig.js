// For every resolved doc mention, list every tracked file the token could name (suffix match) — ambiguity check.
const fs=require('fs'),cp=require('child_process'); const repo='C:/Users/User/Documents/projects/EMS_workshop1';
const files=cp.execSync('git -C '+repo+' ls-files',{encoding:'utf8'}).split('\n').filter(Boolean);
const lines=fs.readFileSync('print.txt','utf8').split('\n'); const res=lines.filter(l=>l.startsWith('RES-DOC')); const unres=lines.filter(l=>l.startsWith('UNRES-DOC'));
const amb={}; let nAmb=0;
for(const l of res){ const [_,doc,ln,tok,hit]=l.split(' '); const c=tok.replace(/^\.\//,'').replace(/^(\.\.\/)+/,''); const cands=files.filter(f=>f===c||f.endsWith('/'+c));
  if(cands.length>1){ nAmb++; const key=tok+' -> '+hit+' | candidates: '+cands.join(', '); (amb[key]=amb[key]||[]).push(doc+':'+ln); } }
console.log('resolved',res.length,'ambiguous mentions',nAmb,'distinct',Object.keys(amb).length);
for(const [k,v] of Object.entries(amb))console.log(v.length,k,'\n    e.g.',v.slice(0,4).join(' '));
