const {W}=require('./agg.js');const K={a:0.3865,dt:0.4177,dx:0.4034,ov:22.5,img:1060};
const est=p=>p.c==='b'?p.out:(p.ch||0)*(p.c==='a'?K.a:(p.s||'').startsWith('tool:')?K.dt:K.dx)+K.ov+(p.img||0)*K.img;
let total=0,baseTot=0,once={a:0,b:0,d:0},many={a:0,b:0,d:0};const ratios=[];let firstA0={};
for(const w of W){const n=w.calls.length;const suf=new Array(n+1).fill(0);for(let i=n-1;i>=0;i--)suf[i]=suf[i+1]+w.calls[i].nov;
 for(const c of w.calls)if(c.nov)total+=c.A;
 if(w.why==='pre'||w.why==='first')firstA0[w.f]=w.calls[0].A;
 const b0=Math.min(firstA0[w.f]||w.calls[0].A,w.calls[0].A);for(const c of w.calls)if(c.nov)baseTot+=Math.min(b0,c.A);
 if(w.why==='nobase'&&w.prevA)ratios.push(+(w.calls[0].A/w.prevA).toFixed(2));
 for(const p of w.pieces){if(p.g===0)continue;const t=est(p);const c=p.c;if(w.calls[p.g]&&w.calls[p.g].nov)once[c]+=t;many[c]+=t*suf[p.g];}}
console.log('total',total,'static-start floor share',(100*baseTot/total).toFixed(1)+'%');
for(const c of ['a','b','d'])console.log(c,'entered once',(once[c]/1e6).toFixed(1)+'M','re-processed total',(many[c]/1e6).toFixed(1)+'M','multiplier',(many[c]/once[c]).toFixed(1));
ratios.sort((x,y)=>x-y);console.log('restart A0/prev-last ratios n=',ratios.length,'min',ratios[0],'p25',ratios[ratios.length>>2],'med',ratios[ratios.length>>1],'max',ratios[ratios.length-1]);
let calls=0,calls200=0;for(const w of W)for(const c of w.calls)if(c.nov){calls++;if(c.A>200000)calls200++;}console.log('calls',calls,'calls>200k',calls200);
