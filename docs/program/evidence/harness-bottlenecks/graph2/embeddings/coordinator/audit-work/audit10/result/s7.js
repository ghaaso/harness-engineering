const {L,j}=require('./p.js');const T=j(L+'/train/report/tune.json');const h=T.holm.late50.pool.fused['P@10'];
const arr=Object.entries(h).sort((a,b)=>a[1].p_raw-b[1].p_raw);let prev=0;
arr.forEach(([a,v],i)=>{const lvl=1-0.05/(5-i);const ph=Math.max(prev,Math.min(1,v.p_raw*(5-i)));prev=ph;console.log(a,v.p_raw,'level',v.level,'expected',lvl.toFixed(4),'p_holm',v.p_holm,'expected',ph.toFixed(4), 'raw p in contrasts',T.contrasts.late50.pool[a+'_fused'].vs_RRF['P@10'].p);});
