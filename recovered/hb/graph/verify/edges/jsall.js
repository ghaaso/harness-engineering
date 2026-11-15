// Independent JS/TS importer finder: scan every quoted string literal in every tracked js-like file,
// resolve those that look like in-repo specifiers, record source, line and the line text.
const fs=require('fs'),path=require('path').posix,cp=require('child_process');
const repo='C:/Users/User/Documents/projects/EMS_workshop1';
const files=cp.execSync('git -C '+repo+' ls-files',{encoding:'utf8'}).split('\n').filter(Boolean); const set=new Set(files);
const sample=JSON.parse(fs.readFileSync('sample30.json','utf8')); const targets=new Set([...sample.web,...sample.mob]);
const alias={'@app':'src/app','@ops':'src/ops','@shared':'src/shared','@features':'src/features'};
const EXT=['.ts','.tsx','.js','.jsx','.mjs','.json'];
function resolve(from,spec){ let base;
  if(spec.startsWith('./')||spec.startsWith('../'))base=path.join(path.dirname(from),spec);
  else { const k=Object.keys(alias).find(a=>spec===a||spec.startsWith(a+'/')); if(k&&!from.startsWith('technician-app/'))base=alias[k]+spec.slice(k.length); else if(spec.startsWith('@/'))base='technician-app/src/'+spec.slice(2); else return null; }
  if(set.has(base))return base; for(const e of EXT)if(set.has(base+e))return base+e; for(const e of EXT)if(set.has(base+'/index'+e))return base+'/index'+e; return 'UNRESOLVED:'+base; }
const hits=[];
for(const f of files){ if(!/\.(js|jsx|ts|tsx|mjs|cjs)$/.test(f))continue; const src=fs.readFileSync(repo+'/'+f,'utf8'); const lines=src.split('\n');
  lines.forEach((l,i)=>{ const re=/(['"`])((?:\.{1,2}\/|@app|@ops|@shared|@features|@\/)[^'"`\s]*)\1/g; let m;
    while((m=re.exec(l))){ const r=resolve(f,m[2]); if(!r)continue; if(!r.startsWith('UNRESOLVED'))hits.push({src:f,line:i+1,spec:m[2],to:r,text:l.trim().slice(0,140)}); } });
  // template literal dynamic imports
  const t=src.match(/import\(\s*`[^`]*\$\{/g); if(t)hits.push({src:f,to:'DYNAMIC-TEMPLATE',text:t.join(' | ')}); }
fs.writeFileSync('jsall.json',JSON.stringify(hits,null,1));
const unres=hits.filter(h=>String(h.to).startsWith('UNRES')); console.log('unresolved-looking literals',unres.length); unres.slice(0,30).forEach(h=>console.log(' ',h.src+':'+h.line,h.spec,'|',h.text));
console.log('dynamic template imports',hits.filter(h=>h.to==='DYNAMIC-TEMPLATE').length);
console.log('hits on targets',hits.filter(h=>targets.has(h.to)).length);
