import {load} from './rec.mjs';
const r=load().filter(x=>x.top);
const qv=x=>{const e=x.top.find(p=>p[0]==='QHActiveDefense');return e?e[1]:null};
// per 5-minute bucket from 04:00 to 05:05
const bk={};
for(let i=1;i<r.length;i++){const a=r[i-1],b=r[i]; if(b.t<'03:11'||b.t>'05:05') continue;
 const k=b.t.slice(0,4)+(b.t[4]<'5'?'0':'5');
 const o=bk[k]??={ps:0,node:0,procs:0,cpu:0,n:0,q0:null,q1:null,psmax:0};
 o.ps+=Math.max(0,b.ps-a.ps); o.node+=Math.max(0,b.node-a.node); o.procs+=Math.max(0,b.procs-a.procs); o.cpu+=b.cpu;o.n++; o.psmax=Math.max(o.psmax,b.ps);
 const v=qv(b); if(v!=null){ if(o.q0==null)o.q0=v; o.q1=v;}
}
console.log('bucket  psStarts(lb) nodeStarts(lb) procUp cpu% psmax  QH first->last  dQH');
for(const [k,o] of Object.entries(bk)) console.log(k, String(o.ps).padStart(5), String(o.node).padStart(6), String(o.procs).padStart(6), (o.cpu/o.n).toFixed(0).padStart(4), String(o.psmax).padStart(4), String(o.q0).padStart(6), String(o.q1).padStart(6), o.q0!=null?String(o.q1-o.q0).padStart(5):'');
