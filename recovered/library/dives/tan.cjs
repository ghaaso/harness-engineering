const fs=require('fs');
function load(f){return fs.readFileSync(f,'utf8').trim().split('\n').map(l=>JSON.parse(l));}
function ols(X,y){ // normal equations, small k
  const k=X[0].length; const A=Array.from({length:k},()=>Array(k).fill(0)); const b=Array(k).fill(0);
  for(let i=0;i<X.length;i++){for(let p=0;p<k;p++){b[p]+=X[i][p]*y[i];for(let q=0;q<k;q++)A[p][q]+=X[i][p]*X[i][q];}}
  // gaussian
  for(let i=0;i<k;i++){let mx=i;for(let r=i+1;r<k;r++)if(Math.abs(A[r][i])>Math.abs(A[mx][i]))mx=r;[A[i],A[mx]]=[A[mx],A[i]];[b[i],b[mx]]=[b[mx],b[i]];
    for(let r=0;r<k;r++){if(r===i)continue;const f=A[r][i]/A[i][i];for(let c=i;c<k;c++)A[r][c]-=f*A[i][c];b[r]-=f*b[i];}}
  return b.map((v,i)=>v/A[i][i]);
}
for(const g of ['ff','cl']){
  const R=load(g+'.jsonl');
  const ok=R.filter(r=>r.lat!=null&&r.lat>0&&r.lat<900&&(r.reqKind==='tool'));
  let sumLat=0,sumTool=0,nTool=0,sumOut=0,sumCtx=0,humanGap=0;
  for(const r of ok){sumLat+=r.lat;sumOut+=r.out;sumCtx+=r.ctx;}
  for(const r of R){ if(r.nextKind==='tool'&&r.tool!=null&&r.tool>=0&&r.tool<3600){sumTool+=r.tool;nTool++;} }
  const X=ok.map(r=>[1,r.out/1000,r.ctx/1e5]); const y=ok.map(r=>r.lat);
  const beta=ols(X,y);
  // contributions
  const cInt=beta[0]*ok.length, cOut=beta[1]*sumOut/1000, cCtx=beta[2]*sumCtx/1e5;
  // median latency, by out bucket
  const med=a=>{const s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length/2)];};
  console.log(g,{calls:R.length,okCalls:ok.length,modelH:(sumLat/3600).toFixed(1),toolH:(sumTool/3600).toFixed(1),medLat:med(ok.map(r=>r.lat)).toFixed(1),meanLat:(sumLat/ok.length).toFixed(1),meanOut:(sumOut/ok.length).toFixed(0),meanCtx:(sumCtx/ok.length).toFixed(0)});
  console.log(' fit lat = %s + %s s per 1k out + %s s per 100k ctx', beta[0].toFixed(2),beta[1].toFixed(2),beta[2].toFixed(2));
  const tot=cInt+cOut+cCtx; console.log(' share of model time: fixed %s%%, output %s%%, context %s%%',(100*cInt/tot).toFixed(1),(100*cOut/tot).toFixed(1),(100*cCtx/tot).toFixed(1));
  // per-model
  for(const m of ['opus','sonnet','fable']){const s=ok.filter(r=>(r.model||'').includes(m)); if(s.length<50)continue; const b=ols(s.map(r=>[1,r.out/1000,r.ctx/1e5]),s.map(r=>r.lat)); console.log('  ',m,s.length,'fit',b.map(v=>v.toFixed(2)).join(' '),'meanOut',(s.reduce((a,r)=>a+r.out,0)/s.length).toFixed(0),'meanLat',(s.reduce((a,r)=>a+r.lat,0)/s.length).toFixed(1));}
  // tool time distribution: top tools by time
  const byTool={}; for(const r of R){ if(r.nextKind==='tool'&&r.tool!=null&&r.tool>=0&&r.tool<3600){const k=(r.tools[0]||'none'); byTool[k]=(byTool[k]||0)+r.tool;} }
  console.log(' tool time by first tool (h):',Object.entries(byTool).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=>k+' '+(v/3600).toFixed(1)).join(', '));
}
