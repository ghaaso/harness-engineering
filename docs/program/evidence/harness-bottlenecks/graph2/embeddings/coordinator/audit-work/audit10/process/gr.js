const fs=require('fs');const G=process.argv[2];
for(const d of ['test.old-20261114T225823Z','test.old-20261115T015132Z','test.old-20261115T162108Z','test','.']){const p=G+'/'+d+'/tune-rank.json';if(!fs.existsSync(p))continue;const o=JSON.parse(fs.readFileSync(p,'utf8'));
const s=JSON.stringify(o);const names=new Set();for(const m of s.matchAll(/"((?:E[1-5]|PLACEBO|RRF|PPR|CO|DIR)[A-Za-z0-9_]*)"/g))names.add(m[1]);
console.log(d,'test=',o.test,'split=',o.split,'tasks=',o.tasks||o.n_tasks,'handoff',(o.handoff_sha256||'').slice(0,12),[...names].slice(0,12).join(' '));
const r=o.rows||o.ranks||o.metrics; if(r){const k=Object.keys(r).filter(x=>/E1_fused_mean|PLACEBO_fused_mean|RRF/.test(x));for(const x of k)console.log('  ',x,JSON.stringify(r[x]).slice(0,160));}}
