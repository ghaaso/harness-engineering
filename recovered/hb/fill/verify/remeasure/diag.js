const {W}=require('./agg.js');const K={a:0.3865,dt:0.4177,dx:0.4034,ov:22.5,img:1060};
const est=p=>p.c==='b'?p.out:(p.ch||0)*(p.c==='a'?K.a:(p.s||'').startsWith('tool:')?K.dt:K.dx)+K.ov+(p.img||0)*K.img;
const cw={},a0={},dsub={},bw={},aw={};let total=0;
for(const w of W){const n=w.calls.length;const suf=new Array(n+1).fill(0);for(let i=n-1;i>=0;i--)suf[i]=suf[i+1]+w.calls[i].nov;
 for(const c of w.calls)if(c.nov)total+=c.A;
 const key=w.kind+':'+w.why;cw[key]=(cw[key]||0)+w.calls[0].A*suf[0];(a0[key]=a0[key]||[]).push(w.calls[0].A);
 for(const p of w.pieces){if(p.g===0)continue;const t=est(p)*suf[p.g];
  if(p.c==='d'){const s=p.s.startsWith('att:')?p.s:p.s;dsub[s]=(dsub[s]||0)+t;if(p.s==='tool:Bash'||p.s==='tool:PowerShell')bw[p.w]=(bw[p.w]||0)+t;}
  if(p.c==='a'){const k=p.n+':'+(p.w||'');aw[k]=(aw[k]||0)+t;}}}
const pc=x=>(100*x/total).toFixed(2)+'%';
console.log('c by window type:');for(const [k,v] of Object.entries(cw).sort((x,y)=>y[1]-x[1])){const a=a0[k].sort((x,y)=>x-y);console.log(' ',k,pc(v),'windows',a.length,'A0 min/med/max',a[0],a[a.length>>1],a[a.length-1]);}
console.log('d by sub:');for(const [k,v] of Object.entries(dsub).sort((x,y)=>y[1]-x[1]).slice(0,25))console.log(' ',k,pc(v));
console.log('d shell first-command:');for(const [k,v] of Object.entries(bw).sort((x,y)=>y[1]-x[1]).slice(0,25))console.log(' ',k,pc(v));
console.log('a by tool:cmd:');for(const [k,v] of Object.entries(aw).sort((x,y)=>y[1]-x[1]).slice(0,20))console.log(' ',k,pc(v));
