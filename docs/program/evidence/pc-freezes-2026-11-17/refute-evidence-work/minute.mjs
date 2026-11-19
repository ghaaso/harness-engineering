import {load} from './rec.mjs';
const r=load(); const [a,b]=process.argv.slice(2);
const m={};
for(const x of r){ if(x.t<a||x.t>b) continue; const k=x.t.slice(0,5); const o=m[k]??={n:0,cpu:0,fmin:1e9,fmax:0,nmin:99,nmax:0,pmin:99,pmax:0,prmin:1e4,prmax:0}; o.n++;o.cpu+=x.cpu;o.fmin=Math.min(o.fmin,x.free);o.fmax=Math.max(o.fmax,x.free);o.nmin=Math.min(o.nmin,x.node);o.nmax=Math.max(o.nmax,x.node);o.pmin=Math.min(o.pmin,x.ps);o.pmax=Math.max(o.pmax,x.ps);o.prmin=Math.min(o.prmin,x.procs);o.prmax=Math.max(o.prmax,x.procs);}
console.log('min   n cpuMean freeMin-Max node ps procs');
for(const [k,o] of Object.entries(m)) console.log(k,String(o.n).padStart(2),(o.cpu/o.n).toFixed(1).padStart(6),`${o.fmin}-${o.fmax}`.padStart(12),`${o.nmin}-${o.nmax}`.padStart(6),`${o.pmin}-${o.pmax}`.padStart(6),`${o.prmin}-${o.prmax}`);
