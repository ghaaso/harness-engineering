const fs=require('fs'),cr=require('crypto');const {L,D,j}=require('./p.js');
const sha=p=>cr.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const R=fs.readFileSync(D+'/RESULT.md','utf8').split('\n'); const RJ=j(D+'/result.json');
console.log('RESULT sha',sha(D+'/RESULT.md'),'result.json sha',sha(D+'/result.json'));
console.log('RESULT lines (wc semantics)',(fs.readFileSync(D+'/RESULT.md','utf8').match(/\n/g)||[]).length,'result.json lines',RJ.lines);
// line 149 sources vs result.json inputs
const src=R[148]; let ok=0,badS=[];
for(const k of Object.keys(RJ.inputs)){const i=RJ.inputs[k];const re=new RegExp(k+' `'+i.file.replace(/\./g,'\\.')+'` ([0-9a-f]{12})');const m=src.match(re); if(m&&i.sha256.startsWith(m[1]))ok++; else badS.push(k);}
const mw=src.match(/write_result\.py ([0-9a-f]{12})/); console.log('sources ok',ok,'of',Object.keys(RJ.inputs).length,'bad',badS,'write_result',mw&&RJ.write_result_sha256.startsWith(mw[1]), 'write_result on disk', sha(L+'/train/write_result.py').startsWith(mw[1]));
// CLAIMS rows
const CL=fs.readFileSync(D+'/CLAIMS.md','utf8').split('\n');
const rows=[];for(let i=0;i<CL.length;i++){const l=CL[i]; if(!/^\| \d+ \| \d+ \|/.test(l)) continue;
  // split on unescaped pipes
  const parts=l.split(/(?<!\\)\|/).slice(1,-1).map(s=>s.trim());rows.push({cl:i+1,n:+parts[0],line:+parts[1],claim:parts[2],file:parts[3],sha:parts[4],key:parts[5],value:parts[6],status:parts[7]});}
console.log('claim rows',rows.length);
const covered=new Set(rows.map(r=>r.line)); const nonEmpty=[];for(let i=1;i<=R.length;i++){ if(R[i-1].trim()) nonEmpty.push(i);}
const missing=nonEmpty.filter(i=>!covered.has(i)); console.log('non-empty RESULT lines',nonEmpty.length,'without a claim row',missing.length,missing.join(','));
const st={};for(const r of rows)st[r.status]=(st[r.status]||0)+1;console.log('statuses',JSON.stringify(st));
const files={};for(const r of rows)files[r.file]=(files[r.file]||0)+1;console.log('files',JSON.stringify(files));
// check every row's sha against disk for files under LANE
const base={'train/':L+'/train/','grader-returns/':L+'/grader-returns/','orchestrator/':L+'/orchestrator/','progress.jsonl':L+'/progress.jsonl'};
const resolvePath=f=>{ if(f==='progress.jsonl') return L+'/progress.jsonl'; if(/protocol-addendum-8\.md$/.test(f)) return 'C:/Users/User/Documents/projects/EMS_workshop1/docs/program/evidence/harness-bottlenecks/graph2/protocol-addendum-8.md'; return L+'/'+f;};
const shaCache={};let shaBad=[];for(const r of rows){const p=resolvePath(r.file); if(!fs.existsSync(p)){shaBad.push(r.file+' (no such path)');continue;} shaCache[p]=shaCache[p]||sha(p); if(shaCache[p]!==r.sha) shaBad.push(r.file);}
console.log('row sha mismatches',[...new Set(shaBad)]);
// resolve JSON pointers for 25 picked rows across sections
const ptr1=(o,k)=>{let v=o; for(const t of k.split('/').slice(1).map(s=>s.replace(/~1/g,'/').replace(/~0/g,'~'))){ if(v==null) return undefined; v=v[t];} return v;};
const ptr=(o,k)=>k.includes("; ")?k.split("; ").map(x=>ptr1(o,x)):ptr1(o,k);
const jsonRows=rows.filter(r=>r.key.startsWith('/')&&/\.json$/.test(r.file));
console.log('json-pointer rows',jsonRows.length);
const lines=[...new Set(jsonRows.map(r=>r.line))].sort((a,b)=>a-b);
// pick: spread across lines
const pick=[];const step=Math.max(1,Math.floor(jsonRows.length/25));for(let i=0;i<jsonRows.length&&pick.length<25;i+=step)pick.push(jsonRows[i]);
let pbad=0;
for(const r of pick){const o=j(resolvePath(r.file)); const v=ptr(o,r.key); const vs=String(JSON.stringify(v)); let stored; try{stored=JSON.stringify(JSON.parse(r.value.replace(/\\\|/g,'|')));}catch(e){stored=r.value;}
  // canonical compare (sorted keys)
  const canon=x=>{try{const y=typeof x==='string'?JSON.parse(x):x;return JSON.stringify(y,(k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(q=>[q,v[q]])):v);}catch(e){return String(x);}};
  const same=canon(v)===canon(stored);
  // printed consistency: does the claim text appear on that RESULT line?
  const onLine=R[r.line-1].includes(r.claim.replace(/\\\|/g,'|').replace(/\.\.\.$/,''));
  if(!same||!onLine)pbad++;
  console.log(`#${r.n} L${r.line} ${r.file} ${r.key} -> ${same?'value equal':'VALUE DIFF '+vs.slice(0,120)+' vs '+String(stored).slice(0,120)}; claim on line: ${onLine}; claim "${r.claim.slice(0,60)}"`);}
console.log('picked',pick.length,'problems',pbad);
