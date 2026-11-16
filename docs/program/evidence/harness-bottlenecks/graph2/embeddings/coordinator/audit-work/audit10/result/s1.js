const {L,j}=require('./p.js');const o=j(L+'/train/report/tune.json');
const S=x=>JSON.stringify(x).slice(0,1800);
console.log(Object.keys(o.arms.late50), Object.keys(o.arms.late50.pool||{}));
const a=o.arms.late50; const k1=Object.keys(a)[0]; console.log(k1, Object.keys(a[k1]).slice(0,20)); const k2=Object.keys(a[k1])[0]; console.log(S(a[k1][k2]));
console.log(Object.keys(o.comparators.late50)); const c=o.comparators.late50; const c1=Object.keys(c)[0]; console.log(c1,S(c[c1]));
console.log(S(o.harness_check));console.log(S(o.lag));console.log(S(o.choices.E1));console.log(S(o.counts.E5));
