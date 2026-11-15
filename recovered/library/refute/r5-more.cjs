// R5 refuter: role split of model time, within-model interaction fits, output per call by model and role. Read-only.
const fs=require('fs');
function load(f){return fs.readFileSync(f,'utf8').trim().split('\n').map(l=>JSON.parse(l));}
function wls(X,y){const k=X[0].length;const A=Array.from({length:k},()=>Array(k).fill(0));const b=Array(k).fill(0);for(let i=0;i<X.length;i++)for(let p=0;p<k;p++){b[p]+=X[i][p]*y[i];for(let q=0;q<k;q++)A[p][q]+=X[i][p]*X[i][q];}
 for(let i=0;i<k;i++){let mx=i;for(let r=i+1;r<k;r++)if(Math.abs(A[r][i])>Math.abs(A[mx][i]))mx=r;[A[i],A[mx]]=[A[mx],A[i]];[b[i],b[mx]]=[b[mx],b[i]];for(let r=0;r<k;r++){if(r===i)continue;const f=A[r][i]/A[i][i];for(let c=i;c<k;c++)A[r][c]-=f*A[i][c];b[r]-=f*b[i];}}return b.map((v,i)=>v/A[i][i]);}
const fam=m=>/opus/.test(m)?'opus':/sonnet/.test(m)?'sonnet':/fable/.test(m)?'fable':'other';
const sum=a=>a.reduce((s,v)=>s+v,0);
for(const g of ['ff','cl']){const C=load(g+'-r5.jsonl').filter(r=>r.k==='call'&&r.lat>0&&r.lat<900);
 const T=sum(C.map(r=>r.lat));const byRole={};for(const r of C){byRole[r.role]=byRole[r.role]||{t:0,tok:0,n:0};byRole[r.role].t+=r.lat;byRole[r.role].tok+=r.ctx;byRole[r.role].n++;}
 const K=sum(C.map(r=>r.ctx));
 console.log(g,'model time by role:',Object.entries(byRole).map(([k,v])=>k+' time '+(100*v.t/T).toFixed(1)+'% tokens '+(100*v.tok/K).toFixed(1)+'% calls '+v.n).join(' | '));
 for(const m of ['opus','sonnet','fable']){const s=C.filter(r=>fam(r.model)===m);if(s.length<100)continue;
  const b=wls(s.map(r=>[1,r.out/1e3,r.ctx/1e5,(r.out/1e3)*(r.ctx/1e5),r.cw/1e4]),s.map(r=>r.lat));
  const meanCtx=sum(s.map(r=>r.ctx))/s.length;
  // contribution of all context terms to this model's time
  const ctxPart=sum(s.map(r=>b[2]*r.ctx/1e5+b[3]*(r.out/1e3)*(r.ctx/1e5)+b[4]*r.cw/1e4));const tm=sum(s.map(r=>r.lat));
  const roles={};for(const r of s){roles[r.role]=roles[r.role]||[0,0];roles[r.role][0]+=r.out;roles[r.role][1]++;}
  console.log('  ',m,'n',s.length,'interaction fit [1,out1k,ctx100k,outXctx,cw10k]',b.map(v=>v.toFixed(2)).join(' '),'| ctx terms share of time',(100*ctxPart/tm).toFixed(1)+'%','| s/1k at 100k',(b[1]+b[3]).toFixed(2),'at 400k',(b[1]+4*b[3]).toFixed(2),'| out/call by role',Object.entries(roles).map(([k,v])=>k+' '+Math.round(v[0]/v[1])+' (n'+v[1]+')').join(', '));}
}
