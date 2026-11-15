// my own calculation, not from a source
const zA=1.959964, zB=0.841621; // two-sided 5%, 80% power
const sw=Math.log(1.34); // within-cell log-SD of one run's tokens, from arXiv 2608.25399 (median geometric SD 1.34)
function nTasks(delta, k, tau){ // tasks needed, paired, log scale
  const v = 2*sw*sw/k + 2*tau*tau; // var of per-task mean log-ratio: run noise in both arms + task-by-arm interaction in both arms... interaction sd tau applies to the difference once
  return Math.ceil(Math.pow((zA+zB),2)*v/(delta*delta));
}
function nTasks2(delta,k,tau){ const v=2*sw*sw/k + tau*tau; return Math.ceil(Math.pow(zA+zB,2)*v/(delta*delta)); }
console.log('within-run log sd',sw.toFixed(3));
for (const red of [0.10,0.20,0.30]) {
  const d=-Math.log(1-red);
  for (const tau of [0,0.15,0.30,0.45]) {
    const row=[1,2,3,5].map(k=>nTasks2(d,k,tau));
    console.log(`reduction ${red*100}% tau=${tau} tasks needed for k=1,2,3,5 runs/arm: ${row.join(', ')}`);
  }
}
// MDE for tokens at n tasks
function mde(n,k,tau){ const v=2*sw*sw/k+tau*tau; const d=(zA+zB)*Math.sqrt(v/n); return 1-Math.exp(-d);}
for (const n of [20,30,40,60]) for (const tau of [0.15,0.30]) console.log(`n=${n} tau=${tau} k=3 min detectable token reduction ${(mde(n,3,tau)*100).toFixed(1)}%`);
// success-rate simulation
function rnorm(){let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
const sig=x=>1/(1+Math.exp(-x));
function simPower(n,k,sdTask,shift,reps=3000){
  let hit=0;
  for(let r=0;r<reps;r++){
    const d=[];
    for(let i=0;i<n;i++){
      const a=sdTask*rnorm();
      const pA=sig(a), pB=sig(a+shift);
      let sa=0,sb=0; for(let j=0;j<k;j++){sa+=Math.random()<pA;sb+=Math.random()<pB;}
      d.push((sb-sa)/k);
    }
    const m=d.reduce((x,y)=>x+y,0)/n; const s=Math.sqrt(d.reduce((x,y)=>x+(y-m)**2,0)/(n-1));
    const t=m/(s/Math.sqrt(n)); // normal-approx two-sided
    if(Math.abs(t)>2.0 && m>0) hit++;
  }
  return hit/reps;
}
// find shift giving +10 points at mean ~0.5 with sdTask 1.5
function meanDiff(sdTask,shift){let s=0,N=200000;for(let i=0;i<N;i++){const a=sdTask*rnorm();s+=sig(a+shift)-sig(a);}return s/N;}
for (const sd of [1.0,2.0]) {
  let lo=0,hi=3; for(let it=0;it<30;it++){const mid=(lo+hi)/2; if(meanDiff(sd,mid)<0.10) lo=mid; else hi=mid;}
  const shift=(lo+hi)/2;
  console.log(`task logit sd ${sd}: shift ${shift.toFixed(2)} gives +10 points`);
  for (const n of [30,50,80,120]) for (const k of [1,3]) console.log(`  n=${n} k=${k} power ${simPower(n,k,sd,shift).toFixed(2)}`);
}
