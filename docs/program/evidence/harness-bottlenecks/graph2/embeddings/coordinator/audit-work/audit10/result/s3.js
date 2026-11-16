const {L,D,j}=require('./p.js');
const tr=j(L+'/grader-returns/tune-rank.json'); console.log(Object.keys(tr)); 
for(const k of Object.keys(tr)){const v=tr[k]; if(v&&typeof v==='object') {console.log(k,JSON.stringify(v).slice(0,600));}}
const la=j(L+'/train/leak_audit/leak_audit.json'); console.log(Object.keys(la));
for(const k of Object.keys(la)){const v=la[k]; console.log(k, JSON.stringify(v).length, JSON.stringify(v).slice(0,300));}
const r=j(D+'/result.json'); console.log(JSON.stringify(r.leak_audit).slice(0,3000)); console.log(JSON.stringify(r.tune_rank_check)); console.log(JSON.stringify(r.nonfinite_heldout)); console.log(JSON.stringify(r.route).slice(0,1500));
