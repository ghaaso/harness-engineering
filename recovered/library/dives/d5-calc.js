// D5 arithmetic: binomial power, kill-rule odds, release gaps, payback scenarios
function lnC(n,k){let s=0;for(let i=1;i<=k;i++)s+=Math.log(n-k+i)-Math.log(i);return s;}
function pmf(n,k,p){return Math.exp(lnC(n,k)+k*Math.log(p)+(n-k)*Math.log(1-p));}
function cdf(n,k,p){let s=0;for(let i=0;i<=k;i++)s+=pmf(n,i,p);return s;}
console.log("Kill rule P(hits<3 | n=20, h):");
for(const h of [0.05,0.10,0.15,0.20,0.25]) console.log(" h="+h+" -> "+cdf(20,2,h).toFixed(3));
// smallest n where a one-sided exact test at alpha<=0.05 vs h0=0.05 has power>=0.8 at h1=0.15
function nNeeded(p0,p1,alpha,power){for(let n=5;n<400;n++){let c=0;while(1-cdf(n,c-1,p0)>alpha)c++; // reject if hits>=c
 const pw=1-cdf(n,c-1,p1); if(pw>=power) return {n,c,pw:pw.toFixed(3),size:(1-cdf(n,c-1,p0)).toFixed(3)};}}
console.log("n to tell 5% from 15% (alpha .05, power .8):",JSON.stringify(nNeeded(0.05,0.15,0.05,0.8)));
console.log("n to tell 15% (break-even) from 5% with power .9:",JSON.stringify(nNeeded(0.05,0.15,0.05,0.9)));
console.log("n to tell 10% from 20%:",JSON.stringify(nNeeded(0.10,0.20,0.05,0.8)));
// release gaps (vendor dates from F6)
const d=s=>new Date(s+"T00:00:00Z").getTime()/864e5;
const mid=["2025-09-29","2026-02-17","2026-06-30","2026-09-28"];
console.log("Mid-tier gaps (days):",mid.slice(1).map((x,i)=>d(x)-d(mid[i])));
const top=["2025-08-05","2025-11-24","2026-05-28","2026-09-22"];
console.log("Top-tier (opened) gaps (days):",top.slice(1).map((x,i)=>d(x)-d(top[i])));
// authoring models in this repo (git trailers): first-seen dates
const auth=[["Opus 4.8","2026-05-31"],["Opus 4.7","2026-06-01"],["Fable 5","2026-06-10"],["Opus 5","2026-07-27"],["Opus 5.5","2026-09-23"],["Fable 5.1","2026-10-31"]];
console.log("Span first..last first-seen:",d("2026-10-31")-d("2026-05-31"),"days for",auth.length,"models; to 2026-11-09:",d("2026-11-09")-d("2026-05-31"));
// repeat intervals (hours) from git
const pairs=[["mypy re-export","2026-07-07T15:53:54+05:00","2026-07-08T23:27:30+05:00",36],
["NoReferencedTableError","2026-07-08T10:07:09+05:00","2026-07-08T17:58:52+05:00",21],
["press-race guard","2026-07-12T22:43:26+05:00","2026-07-19T09:22:02+05:00",25],
["SDK-52 pin drift","2026-06-03T22:45:13+05:00","2026-06-26T16:31:40+05:00",192],
["expo-audio stop","2026-06-08T15:07:11+05:00","2026-06-08T20:20:43+05:00",8],
["ex8 Sentry plugin","2026-06-10T16:04:27+05:00","2026-06-26T16:31:40+05:00",64]];
const hrs=pairs.map(p=>[p[0],((new Date(p[2])-new Date(p[1]))/36e5).toFixed(1),p[3]]);
console.log("Repeat intervals (h, commits between):",JSON.stringify(hrs));
const sorted=hrs.map(x=>+x[1]).sort((a,b)=>a-b);console.log("sorted h:",sorted,"median h:",((sorted[2]+sorted[3])/2).toFixed(1));
// Payback scenarios. Units: millions of context tokens (cache reads dominate both sides).
function scen(name,o){const save=o.hitsPerMonth*(o.S-o.Lhit);const missCost=o.missPerMonth*o.Lmiss;const write=o.entriesPerMonth*o.writeCost;const over=o.phasesPerMonth*o.phaseOverhead;
 const net=save-missCost-write-over; const pb=net>0?o.W/net:Infinity; console.log(name.padEnd(28),"save",save.toFixed(1),"cost",(missCost+write+over).toFixed(1),"net/mo",net.toFixed(1),"W",o.W,"payback mo",pb===Infinity?"never":pb.toFixed(1));}
// best form: lookups via hook (no extra turn), diff arm in CI (0 model tokens), entry written in solving session
const base={Lhit:0.35,Lmiss:0.0,writeCost:0.4,phaseOverhead:0,phasesPerMonth:6,missPerMonth:6,entriesPerMonth:7};
scen("best: all 6 pairs hit,S=20",{...base,hitsPerMonth:6/2.2,S:20,W:200});
scen("best: all 6 pairs hit,S=20,W=500",{...base,hitsPerMonth:6/2.2,S:20,W:500});
scen("mid: 2 store-only hits,S=5",{...base,hitsPerMonth:2/2.2,S:5,W:200});
scen("mid: 2 hits,S=10,W=500",{...base,hitsPerMonth:2/2.2,S:10,W:500});
scen("low: 1 hit,S=3",{...base,hitsPerMonth:1/2.2,S:3,W:200});
// as designed (pull turn per lookup, 3 diff turns/phase + reviewer)
const des={Lhit:0.8,Lmiss:0.25,writeCost:0.8,phaseOverhead:1.0,phasesPerMonth:6,missPerMonth:6,entriesPerMonth:7};
scen("as designed: 6 hits,S=20",{...des,hitsPerMonth:6/2.2,S:20,W:500});
scen("as designed: 2 hits,S=5",{...des,hitsPerMonth:2/2.2,S:5,W:500});
// E3 sample sizes: detect a difference, or show equivalence, in success rates (normal approx, per arm)
const za=1.96, zb=0.8416, za1=1.645;
function nDiff(p1,p2){return Math.ceil((za+zb)**2*(p1*(1-p1)+p2*(1-p2))/((p1-p2)**2));}
function nEquiv(p,margin){return Math.ceil(2*(za1+1.2816)**2*p*(1-p)/(margin**2));} // TOST, true diff 0, power .9 approx (z_{beta/2}=1.2816 for .8.. conservative)
console.log("E3: tasks per arm to detect 60% vs 70%:",nDiff(0.6,0.7),"; 70% vs 75%:",nDiff(0.7,0.75));
console.log("E3: tasks per arm to show equivalence within +/-5 pts at 70%:",nEquiv(0.7,0.05),"; within +/-10 pts:",nEquiv(0.7,0.10));
// lifetime value under decay of the per-hit saving (half-life T months) vs build cost
for (const T of [3,6,12]) { const tau=T/Math.LN2; for (const net of [50.8,6.0,1.4]) console.log("half-life",T,"mo, net0",net,"M/mo -> lifetime",(net*tau).toFixed(0),"M vs W 200-500M"); }
// CLAUDE.md durable-fact share
const durableChars=10321+932+920, total=29605; console.log("CLAUDE.md durable-fact sections share:",(durableChars/total*100).toFixed(1),"% ->",Math.round(7500*durableChars/total),"tokens per call");
console.log("FixFlow calls x durable tokens / FixFlow context:",(14647*Math.round(7500*durableChars/total)/2.13e9*100).toFixed(2),"%");
