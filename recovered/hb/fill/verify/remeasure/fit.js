const fs=require('fs');const W=fs.readFileSync('windows.ndjson','utf8').trim().split('\n').map(JSON.parse);
const rows=[];let neg=0,negSum=0,nopiece=0,tot=0;
for(const w of W){const by={};for(const p of w.pieces)(by[p.g]=by[p.g]||[]).push(p);
 for(let k=1;k<w.calls.length;k++){const c=w.calls[k];if(!c.nov)continue;const d=c.A-w.calls[k-1].A;tot++;
  const ps=by[k]||[];if(!ps.length){nopiece++;}
  const x=[0,0,0,0,0,0,0];for(const p of ps){if(p.c==='b'){x[0]+=p.out-p.th;x[1]+=p.th;}else if(p.c==='a')x[2]+=p.ch;else if((p.s||'').startsWith('tool:'))x[3]+=p.ch;else x[4]+=p.ch;x[5]+=p.img||0;x[6]++;}
  if(d<0){neg++;negSum+=d;}rows.push([x,d]);}}
console.log({pairs:tot,neg,negSum,nopiece});
function fit(rows,cols){const n=cols.length;const M=Array.from({length:n},()=>new Array(n+1).fill(0));
 for(const [x,y] of rows){const v=cols.map(i=>x[i]);for(let i=0;i<n;i++){for(let j=0;j<n;j++)M[i][j]+=v[i]*v[j];M[i][n]+=v[i]*y;}}
 for(let i=0;i<n;i++){let p=i;for(let r=i+1;r<n;r++)if(Math.abs(M[r][i])>Math.abs(M[p][i]))p=r;[M[i],M[p]]=[M[p],M[i]];for(let r=0;r<n;r++){if(r===i)continue;const f=M[r][i]/M[i][i];for(let c=i;c<=n;c++)M[r][c]-=f*M[i][c];}}
 const b=M.map((r,i)=>r[n]/r[i]);let sse=0,sst=0,my=rows.reduce((s,r)=>s+r[1],0)/rows.length;for(const [x,y] of rows){const e=y-cols.reduce((s,c,i)=>s+b[i]*x[c],0);sse+=e*e;sst+=(y-my)**2;}
 return {b:b.map(v=>+v.toFixed(4)),r2:+(1-sse/sst).toFixed(4)};}
const names=['out-th','th','aCh','dToolCh','dTextCh','img','n'];
const good=rows.filter(r=>r[1]>=0);
for(const cols of [[0,1,2,3,4,5,6],[0,1,2,3,4,6],[0,2,3,4,6]]){const r=fit(good,cols);console.log(cols.map(c=>names[c]).join(','),JSON.stringify(r),'chars/token:',cols.map((c,i)=>c>=2&&c<=4?names[c]+'='+(1/r.b[i]).toFixed(2):'').filter(Boolean).join(' '));}
// totals of X over pairs
const S=[0,0,0,0,0,0,0];for(const [x] of rows)for(let i=0;i<7;i++)S[i]+=x[i];console.log('sums',S.map(v=>Math.round(v)).join(' '),'sumDelta',rows.reduce((s,r)=>s+r[1],0));
