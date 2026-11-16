'use strict';
const fs=require('fs'),zlib=require('zlib');
const H='C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings/train/heldout';
function rr(p){const m=new Map();for(const l of zlib.gunzipSync(fs.readFileSync(p)).toString().split('\n'))if(l.trim()){const r=JSON.parse(l);m.set(r.id,r.ranked);}return m;}
const out={};
for(const k of ['alone','fused']){const R=[1,2,3].map(s=>rr(`${H}/ranked/E1_${k}_s${s}_pool.jsonl.gz`));
const diff=(a,b)=>{const B=new Set(b.slice(0,10));return a.slice(0,10).filter(x=>!B.has(x)).length;};
const hist={};let outl=0,n=0;for(const id of R[0].keys()){const a=R[0].get(id),b=R[1].get(id),c=R[2].get(id);
// for each seed, its min distance to the other two
for(const [x,y,z] of [[a,b,c],[b,a,c],[c,a,b]]){const m=Math.min(diff(x,y),diff(x,z));hist[m]=(hist[m]||0)+1;n++;if(m>=6&&diff(y,z)<=1)outl++;}}
out[k]={hist_min_dist_seed_to_siblings:hist,n,count_min_ge6_with_siblings_le1:outl};}
console.log(JSON.stringify(out));
