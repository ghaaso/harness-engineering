// Builds a connection graph of a repo by script: imports (file and named symbol), test mocks, and doc citations of files.
const fs=require('fs'),P=require('path').posix,cp=require('child_process');
const repo=process.argv[2],out=process.argv[3];
const T=()=>Number(process.hrtime.bigint())/1e6; const t0=T();
const files=cp.execSync('git -C '+repo+' ls-files',{encoding:'utf8'}).split('\n').filter(Boolean);
const set=new Set(files); const BS=String.fromCharCode(92);
const rd=f=>{try{return fs.readFileSync(repo+'/'+f,'utf8');}catch(e){return '';}};
const seen=new Set(),edges=[],sym={},stats={external:0,unresolved:0,docTokens:0,docResolved:0};
const add=(a,b,k,d)=>{ if(a===b)return; const key=a+'|'+b+'|'+k+'|'+(d||''); if(seen.has(key))return; seen.add(key); edges.push([a,b,k,d||'']); };
const names=s=>s.split('\n').map(l=>l.split('#')[0]).join(' ').split(',').map(x=>x.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
// ---------- python
function pyMod(mod){ const p='backend/'+mod.split('.').join('/'); if(set.has(p+'.py'))return p+'.py'; if(set.has(p+'/__init__.py'))return p+'/__init__.py'; return null; }
function pyRel(file,dots,mod){ let d=P.dirname(file); for(let i=1;i<dots;i++)d=P.dirname(d); const p=mod?d+'/'+mod.split('.').join('/'):d; if(set.has(p+'.py'))return p+'.py'; if(set.has(p+'/__init__.py'))return p+'/__init__.py'; return null; }
function py(file){ const src=rd(file).split(BS+'\n').join(' '); let m;
  const reF=/^[ \t]*from[ \t]+(\.*)([\w.]*)[ \t]+import[ \t]+(?:\(([^)]*)\)|([^\n]+))/gm;
  while((m=reF.exec(src))){ const dots=m[1].length,mod=m[2]; const base=dots?pyRel(file,dots,mod):pyMod(mod);
    for(const n of names(m[3]||m[4])){ const full=(mod?mod+'.':'')+n; const sub=n==='*'?null:(dots?pyRel(file,dots,full):pyMod(full));
      if(sub)add(file,sub,'import'); else if(base)add(file,base,'import',n==='*'?'':n);
      else if(dots||/^(app|tests|scripts|alembic)(\.|$)/.test(mod)){stats.unresolved++;console.error('UNRES-PY',file,'.'.repeat(dots)+mod,n);} else {stats.external++;console.error('EXT-PY',file,mod,n);} } }
  const reI=/^[ \t]*import[ \t]+([^\n]+)/gm;
  while((m=reI.exec(src))){ for(const n of names(m[1])){ const t=pyMod(n); if(t)add(file,t,'import'); else {stats.external++;console.error('EXTI-PY',file,n);} } }
  sym[file]=(src.match(/^[ \t]*(?:async[ \t]+)?def[ \t]+\w+|^[ \t]*class[ \t]+\w+/gm)||[]).length; }
// ---------- js / ts
const exts=['','.ts','.tsx','.js','.jsx','.mjs','.json','/index.ts','/index.tsx','/index.js','/index.jsx'];
const web={'@app':'src/app','@ops':'src/ops','@shared':'src/shared','@features':'src/features'};
function jsRes(file,spec){ let p=null; const mob=file.startsWith('technician-app/');
  if(spec[0]==='.')p=P.normalize(P.dirname(file)+'/'+spec);
  else if(mob){ if(spec.startsWith('@/'))p='technician-app/src/'+spec.slice(2); }
  else for(const k in web){ if(spec===k)p=web[k]; else if(spec.startsWith(k+'/'))p=web[k]+spec.slice(k.length); }
  if(!p){stats.external++;console.error('EXT-JS',file,spec);return null;}
  for(const e of exts)if(set.has(p+e))return p+e; stats.unresolved++; console.error("UNRES-JS",file,spec,p); return null; }
function js(file){ const src=rd(file); let m;
  const re1=/(?:import|export)\s+(?:type\s+)?([^'"`;]*?)\s*from\s*['"]([^'"]+)['"]/g;
  while((m=re1.exec(src))){ const t=jsRes(file,m[2]); if(!t)continue; const b=m[1].match(/\{([^}]*)\}/);
    const ns=b?b[1].split(',').map(x=>x.trim().replace(/^type\s+/,'').split(/\s+as\s+/)[0].trim()).filter(Boolean):[];
    if(ns.length)for(const n of ns)add(file,t,'import',n); else add(file,t,'import'); }
  const re2=/(?:\bimport|\brequire)\s*\(?\s*['"]([^'"]+)['"]/g;
  while((m=re2.exec(src))){ const t=jsRes(file,m[1]); if(t)add(file,t,'import'); }
  const re3=/(?:jest|vi)\.(?:mock|doMock|requireActual|importActual)\(\s*['"]([^'"]+)['"]/g;
  while((m=re3.exec(src))){ const t=jsRes(file,m[1]); if(t)add(file,t,'mock'); }
  sym[file]=(src.match(/^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*\w+|^(?:export\s+)?(?:const|let)\s+\w+\s*=\s*(?:async\s*)?(?:\([^)]*\)|\w+)\s*(?::[^=\n]+)?=>|^(?:export\s+)?(?:abstract\s+)?class\s+\w+/gm)||[]).length; }
// ---------- docs citing files
function doc(file){ let head=''; const re=/[A-Za-z0-9_.@\-\/]+\.(?:py|tsx|ts|jsx|js|mjs|json|md|yml|toml|sh)\b/g;
  const pre=['','backend/','backend/app/','backend/app/features/','technician-app/','technician-app/src/','src/','docs/',P.dirname(file)+'/'];
  rd(file).split('\n').forEach((l,i)=>{ if(/^#+\s/.test(l))head=l.replace(/^#+\s*/,'').slice(0,60);
    for(const tok of (l.match(re)||[])){ stats.docTokens++; const c=tok.replace(/^\.\//,''); let hit=null; for(const p of pre){ if(set.has(p+c)){hit=p+c;break;} }
      if(!hit)console.error("UNRES-DOC",file,i+1,tok); if(hit){ stats.docResolved++; console.error("RES-DOC",file,i+1,tok,hit); add(file,hit,'cites',(i+1)+'|'+head); } } }); }
let nPy=0,nJs=0,nDoc=0,bytes=0;
for(const f of files){ if(/\.py$/.test(f)){py(f);nPy++;} else if(/\.(ts|tsx|js|jsx|mjs)$/.test(f)){js(f);nJs++;} else if(/\.md$/.test(f)){doc(f);nDoc++;} else continue; bytes+=fs.statSync(repo+'/'+f).size; }
const ms=T()-t0; const idx={}; files.forEach((f,i)=>idx[f]=i);
const g={files,edges:edges.map(e=>[idx[e[0]],idx[e[1]],e[2],e[3]]),sym};
fs.writeFileSync(out,JSON.stringify(g));
const kinds={}; for(const e of edges)kinds[e[2]]=(kinds[e[2]]||0)+1;
const pairs=new Set(edges.filter(e=>e[2]!=='cites').map(e=>e[0]+'|'+e[1])).size;
console.log('tracked files',files.length,'| python',nPy,'| js/ts',nJs,'| docs',nDoc,'| bytes read',bytes);
console.log('edges',edges.length,JSON.stringify(kinds),'| distinct file-to-file code links',pairs,'| edges naming a symbol',edges.filter(e=>e[2]==='import'&&e[3]).length);
console.log('functions and classes counted',Object.values(sym).reduce((a,b)=>a+b,0),'| imports of outside packages',stats.external,'| in-repo imports not resolved',stats.unresolved);
console.log('doc path mentions',stats.docTokens,'| resolved to a tracked file',stats.docResolved);
console.log('build ms',ms.toFixed(0),'| graph file bytes',fs.statSync(out).size,'| gzip bytes',require('zlib').gzipSync(fs.readFileSync(out)).length);
