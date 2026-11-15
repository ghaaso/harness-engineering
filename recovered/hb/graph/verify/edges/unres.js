const fs=require('fs'),cp=require('child_process'),P=require('path').posix; const repo='C:/Users/User/Documents/projects/EMS_workshop1';
const files=cp.execSync('git -C '+repo+' ls-files',{encoding:'utf8'}).split('\n').filter(Boolean); const set=new Set(files);
const U=fs.readFileSync('print.txt','utf8').split('\n').filter(l=>l.startsWith('UNRES-DOC')).map(l=>{const [_,doc,ln,tok]=l.split(' ');return {doc,ln,tok};});
const cat={},ex={}; const put=(k,u)=>{cat[k]=(cat[k]||0)+1;(ex[k]=ex[k]||[]).push(u.doc+':'+u.ln+' '+u.tok);};
for(const u of U){ const t=u.tok;
  if(/^\.\.?\//.test(t)&&set.has(P.normalize(P.dirname(u.doc)+'/'+t))){put('A relative ../ link, resolves after path normalise',u);continue;}
  const c=t.replace(/^(\.\.?\/)+/,''); const cands=files.filter(f=>f===c||f.endsWith('/'+c));
  if(cands.length===1){put('B partial path, unique suffix match to a tracked file (prefix list too short)',u);continue;}
  if(cands.length>1){put('C bare/short name matching several tracked files',u);continue;}
  if(fs.existsSync(repo+'/'+c)||fs.existsSync(repo+'/'+P.dirname(u.doc)+'/'+c)){put('D exists on disk but untracked',u);continue;}
  const anywhere=cp.execSync('git -C '+repo+' log --all --format=%H -1 -- "*'+c.split('/').pop()+'"',{encoding:'utf8'}).trim();
  if(/^(https?:|www\.)/.test(t)||/\.(com|org|io)\//.test(t)){put('E URL',u);continue;}
  if(anywhere){put('F file name existed in git history (deleted/renamed) or planned path',u);continue;}
  put('G never a file in this repo (planned name, outside package, prose like Node.js)',u); }
for(const k of Object.keys(cat).sort())console.log(cat[k],k,'\n   e.g.',ex[k].slice(0,8).join(' ; '));
console.log('total',U.length);
// lost edges: A and B mentions whose (doc,target) at that line is not already a cites edge
const g=JSON.parse(fs.readFileSync('../../graph.json','utf8')); const have=new Set(g.edges.filter(e=>e[2]==='cites').map(e=>g.files[e[0]]+'|'+g.files[e[1]]+'|'+e[3].split('|')[0]));
const haveDocTarget=new Set(g.edges.filter(e=>e[2]==='cites').map(e=>g.files[e[0]]+'|'+g.files[e[1]]));
let lostLine=new Set(),lostPair=new Set();
for(const u of U){ const t=u.tok; let tgt=null;
  if(/^\.\.?\//.test(t)&&set.has(P.normalize(P.dirname(u.doc)+'/'+t)))tgt=P.normalize(P.dirname(u.doc)+'/'+t);
  else { const c=t.replace(/^(\.\.?\/)+/,''); const cands=files.filter(f=>f===c||f.endsWith('/'+c)); if(cands.length===1)tgt=cands[0]; }
  if(!tgt)continue; const k=u.doc+'|'+tgt+'|'+u.ln; if(!have.has(k))lostLine.add(k); if(!haveDocTarget.has(u.doc+'|'+tgt))lostPair.add(u.doc+'|'+tgt); }
console.log('A+B lost (doc,target,line) citations',lostLine.size,'| lost distinct (doc,target) pairs',lostPair.size,'| graph distinct (doc,target) pairs',haveDocTarget.size);
const G=U.filter(u=>true); 
