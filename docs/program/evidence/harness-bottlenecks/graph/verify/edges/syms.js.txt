// Check every named-symbol import edge: is the name defined in, or re-exported by, the target file? Then print 20 at a fixed interval.
const fs=require('fs'); const repo='C:/Users/User/Documents/projects/EMS_workshop1';
const g=JSON.parse(fs.readFileSync('../../graph.json','utf8')); const F=g.files; const rd=f=>fs.readFileSync(repo+'/'+f,'utf8');
const S=g.edges.map((e,i)=>[i,...e]).filter(e=>e[3]==='import'&&e[4]); console.log('symbol edges',S.length);
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function defined(t,n){ const src=rd(t); const N=esc(n);
  if(/\.py$/.test(t)){
    if(new RegExp('^[ \\t]*(async\\s+)?(def|class)\\s+'+N+'\\b','m').test(src))return 'yes(def)';
    if(new RegExp('^'+N+'\\s*(:[^=\\n]*)?=','m').test(src))return 'yes(module var)';
    if(new RegExp('^[ \\t]*(from\\s+\\S+\\s+)?import\\s[^\\n]*\\b'+N+'\\b','m').test(src)||new RegExp('^[ \\t]+'+N+',?[ \\t]*(#.*)?$','m').test(src))return 'yes(imported into target)';
    if(new RegExp('^[ \\t]*'+N+'\\s*(:[^=\\n]*)?=','m').test(src))return 'yes(indented assignment)';
    return 'NO'; }
  if(n==='default') return /export\s+default\b|export\s*\{[^}]*\bas\s+default\b/.test(src)?'yes(default)':'NO';
  if(new RegExp('export\\s+(declare\\s+)?(default\\s+)?(async\\s+)?(const|let|var|function\\*?|class|type|interface|enum|abstract\\s+class)\\s+'+N+'\\b').test(src))return 'yes(export decl)';
  if(new RegExp('export\\s*(type\\s*)?\\{[^}]*\\b'+N+'\\b[^}]*\\}','s').test(src))return 'yes(export list)';
  return 'NO'; }
const bad=[],how={}; for(const [i,s,d,k,n] of S){ const r=defined(F[d],n); how[r]=(how[r]||0)+1; if(r==='NO')bad.push([i,F[s],F[d],n]); }
console.log('automatic check:',JSON.stringify(how)); bad.slice(0,60).forEach(b=>console.log('  #'+b[0],b[1],'->',b[2],'name',JSON.stringify(b[3])));
const step=Math.floor(S.length/20); console.log('--- sample of 20 at interval',step);
for(let k=0;k<20;k++){ const [i,s,d,kd,n]=S[k*step+Math.floor(step/2)]; console.log('#'+i,F[s],'->',F[d],'name',n,'|',defined(F[d],n)); }
