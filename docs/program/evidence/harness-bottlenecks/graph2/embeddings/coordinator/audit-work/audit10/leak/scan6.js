const fs=require('fs'),path=require('path');
const L=process.argv[2],OUT=process.argv[3];
const plan=JSON.parse(fs.readFileSync(L+'/train/stageB/plan.json','utf8'));
const ho=plan.heldout.checkpoints;const pref=ho.map(s=>s.slice(0,7));
const dirs=['r58c/B/tests','r58c/A','train/r58/tests'];
const files=[];const exts=new Set(['.py','.sh','.js','.mjs','.json','.txt','.jsonl','.tsv']);
const extCount={};
function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=d+'/'+e.name;if(e.isDirectory())walk(p);else{const x=path.extname(e.name);extCount[x]=(extCount[x]||0)+1;files.push(p);}}}
for(const d of dirs)walk(L+'/'+d);
const pats=[['ho_sha',null],['heldout',/held[-_ ]?out/i],['graphs',/graphs0?\b|export\//],['hinputs',/heldout_inputs|heldout-inputs/],['facts',/facts_cache|FACTS|\/facts\b/],['plan_ho',/\['heldout'\]|\.heldout\b|"heldout"/]];
const hits=[];const shaHitsData=[];
for(const f of files){const rel=f.slice(L.length+1);const x=path.extname(f);
  let st=fs.statSync(f);if(st.size>5e6)continue;
  const code=['.py','.sh','.js','.mjs'].includes(x);
  const txt=fs.readFileSync(f,'utf8');
  if(!code){ // data files: just count held-out sha mentions
    let n=0;for(const s of pref){if(txt.includes(s))n++;} if(n)shaHitsData.push([rel,n]);continue;}
  if(/r58c\/A\/(out|fixtures)\//.test(rel)&&!/\.(py|sh)$/.test(rel)){ /* harness copies */ let n=0;for(const s of pref)if(txt.includes(s))n++; if(n)shaHitsData.push([rel,n]); continue;}
  txt.split('\n').forEach((l,i)=>{const tags=[];if(pref.some(s=>l.includes(s)))tags.push('ho_sha');for(const [n,r] of pats.slice(1))if(r.test(l))tags.push(n);if(tags.length)hits.push(rel+':'+(i+1)+' ['+tags.join(',')+'] '+l.trim().slice(0,220));});
}
fs.writeFileSync(OUT,JSON.stringify({extCount,nfiles:files.length,shaHitsData,hits},null,1));
console.log('files',files.length,JSON.stringify(extCount));console.log('data files naming held-out shas:',shaHitsData.length);console.log(shaHitsData.slice(0,40).map(x=>x.join(' ')).join('\n'));
console.log('code hits',hits.length);
const byFile={};for(const h of hits){const f=h.split(':')[0];byFile[f]=(byFile[f]||0)+1}console.log(JSON.stringify(byFile,null,1));
