const fs=require('fs');const W=fs.readFileSync('windows.ndjson','utf8').trim().split('\n').map(JSON.parse);
const COEF={fit:{a:0.3865,dt:0.4177,dx:0.4034,ov:22.5,img:1060},c4:{a:0.25,dt:0.25,dx:0.25,ov:0,img:1060},c3:{a:1/3,dt:1/3,dx:1/3,ov:0,img:1060}};
function cls(p,mode){if(p.c==='b')return 'b';if(p.c==='a'){if(mode==='strict'&&p.n!=='Read'&&p.n!=='Grep'&&p.n!=='Glob')return 'd';return 'a';}
 if(mode==='broad'&&(p.s==='tool:Bash'||p.s==='tool:PowerShell'))return 'a';return 'd';}
function est(p,K){if(p.c==='b')return p.out;const k=p.c==='a'?K.a:(p.s||'').startsWith('tool:')?K.dt:K.dx;return (p.ch||0)*k+K.ov+(p.img||0)*K.img;}
function compute(o){o=Object.assign({est:'fit',scale:true,mode:'listed',carry:false},o);const K=COEF[o.est];
 const R={};const G=k=>R[k]=R[k]||{A:0,calls:0,a:0,b:0,c:0,d:0,a_first:0,a_reopen:0,a_dup:0,a_rest:0,b_think:0,files:{},nkeys:new Set(),rkeys:new Set(),est:0};
 let prevComp=null;
 for(const w of W){const n=w.calls.length;const suf=new Array(n+1).fill(0);for(let i=n-1;i>=0;i--)suf[i]=suf[i+1]+w.calls[i].nov;
  const by={};for(const p of w.pieces)(by[p.g]=by[p.g]||[]).push(p);
  const kinds=[G(w.kind),G('all')];
  // window start
  const A0=w.calls[0].A;let start={c:A0};
  if(o.carry&&w.why==='nobase'&&prevComp&&w.prevA&&A0>=0.7*w.prevA){const tot=prevComp.a+prevComp.b+prevComp.c+prevComp.d;start={};for(const k of ['a','b','c','d'])start[k]=A0*prevComp[k]/tot;}
  for(const g of kinds){g.calls+=suf[0];for(const k in start)g[k]+=start[k]*suf[0];for(let i=0;i<n;i++)if(w.calls[i].nov)g.A+=w.calls[i].A;}
  const seen=(o.carry&&w.why==='nobase'&&prevComp)?new Set(prevComp.seen):new Set(),seenR=new Set();
  const comp={a:start.a||0,b:start.b||0,c:start.c||0,d:start.d||0};
  // pieces in gap 0 belong to start; register their keys
  for(const p of by[0]||[])if(p.c==='a'&&p.s==='file'&&p.k){seen.add(p.k);seenR.add(p.k+'|'+p.g2);}
  let estSum=A0*suf[0];
  for(let k=1;k<n;k++){const ps=by[k]||[];const d=w.calls[k].A-w.calls[k-1].A;const e=ps.map(p=>est(p,K));const E=e.reduce((s,v)=>s+v,0);
   const s=o.scale?(E>0?d/E:0):1;const cnt=suf[k];
   if(o.scale&&E<=0&&d!==0)for(const g of kinds)g.d+=d*cnt;
   ps.forEach((p,i)=>{const t=e[i]*s;const c=cls(p,o.mode);comp[c]+=t;estSum+=e[i]*cnt;
    let sub='';if(c==='a'){if(p.c==='a'&&p.s==='file'&&p.k){const rk=p.k+'|'+p.g2;sub=seen.has(p.k)?(seenR.has(rk)?'dup':'reopen'):'first';seen.add(p.k);seenR.add(rk);}else sub='rest';}
    if(!cnt)return;
    for(const g of kinds){g[c]+=t*cnt;if(c==='b')g.b_think+=(p.out?t*p.th/p.out:0)*cnt;
     if(c==='a'){g['a_'+(sub==='dup'?'reopen':sub)]+=t*cnt;if(sub==='dup')g.a_dup+=t*cnt;
      if(p.c==='a'&&p.s==='file'&&p.k){g.files[p.k]=(g.files[p.k]||0)+t*cnt;g.rkeys.add(p.k);g.nkeys.add(p.nk);}}}});}
  for(const g of kinds)g.est+=estSum;
  comp.seen=[...seen];prevComp=comp;}
 return R;}
module.exports={compute,W};
