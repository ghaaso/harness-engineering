// Independent Python importer finder: logical-line joiner + own resolver + string-reference scan.
const fs=require('fs'),path=require('path').posix,cp=require('child_process');
const repo='C:/Users/User/Documents/projects/EMS_workshop1';
const files=cp.execSync('git -C '+repo+' ls-files',{encoding:'utf8'}).split('\n').filter(Boolean); const set=new Set(files);
const sample=JSON.parse(fs.readFileSync('sample30.json','utf8')); const targets=new Set(sample.py);
const modFile=d=>{ if(set.has(d+'.py'))return d+'.py'; if(set.has(d+'/__init__.py'))return d+'/__init__.py'; return null; };
const absDir=m=>'backend/'+m.replace(/\./g,'/');
function logical(src){ // strip comments outside strings crudely, join (), [] and backslash continuations
  const out=[]; let buf='',depth=0,start=0; const L=src.split('\n');
  L.forEach((raw,i)=>{ let l=raw.replace(/#.*$/,''); if(!buf)start=i+1; buf+=' '+l; for(const c of l){ if('([{'.includes(c))depth++; else if(')]}'.includes(c))depth=Math.max(0,depth-1);} 
    if(depth===0&&!/\\s*$/.test(l)){ out.push([start,buf.trim()]); buf=''; } else buf=buf.replace(/\\s*$/,''); });
  return out; }
const hits=[];
for(const f of files){ if(!/\.py$/.test(f))continue; const src=fs.readFileSync(repo+'/'+f,'utf8');
  for(const [ln,s] of logical(src)){
    let m=s.match(/^from\s+(\.*)([\w.]*)\s+import\s+\(?([^)]*)\)?$/);
    if(m){ const dots=m[1].length; let baseDir; if(dots){ baseDir=path.dirname(f); for(let i=1;i<dots;i++)baseDir=path.dirname(baseDir); if(m[2])baseDir+='/'+m[2].replace(/\./g,'/'); } else baseDir=absDir(m[2]);
      if(!dots&&!/^(app|tests|scripts)(\.|$)/.test(m[2]))continue;
      for(let n of m[3].split(',')){ n=n.trim().split(/\s+as\s+/)[0].trim(); if(!n)continue; let t=n==='*'?null:modFile(baseDir+'/'+n); let kind='submodule'; if(!t){t=modFile(baseDir);kind='name:'+n;}
        if(t&&targets.has(t))hits.push({src:f,line:ln,to:t,kind,text:s.slice(0,150)}); if(!t)hits.push({src:f,line:ln,to:'UNRES',text:s.slice(0,150)}); }
      continue; }
    m=s.match(/^import\s+(.+)$/);
    if(m){ for(let n of m[1].split(',')){ n=n.trim().split(/\s+as\s+/)[0].trim(); if(!/^(app|tests|scripts)\./.test(n))continue; const t=modFile(absDir(n)); if(t&&targets.has(t))hits.push({src:f,line:ln,to:t,kind:'import-stmt',text:s.slice(0,150)}); } } }
  // string references to dotted module paths (mock.patch targets, importlib, alembic env)
  const re=/["'](app(?:\.\w+)+)["']/g; let m2;
  while((m2=re.exec(src))){ const parts=m2[1].split('.'); for(let k=parts.length;k>1;k--){ const t=modFile(absDir(parts.slice(0,k).join('.'))); if(t){ if(targets.has(t))hits.push({src:f,line:src.slice(0,m2.index).split('\n').length,to:t,kind:'string-ref',text:m2[1]}); break; } } }
}
fs.writeFileSync('pyfind.json',JSON.stringify(hits,null,1));
console.log('unresolved in-repo-looking',hits.filter(h=>h.to==='UNRES').length); hits.filter(h=>h.to==='UNRES').forEach(h=>console.log(' ',h.src+':'+h.line,h.text));
console.log('hits',hits.length,'string-refs',hits.filter(h=>h.kind==='string-ref').length);
