// R6 refuter: independent re-derivation of the sample-size and payback arithmetic.
// Method differs from d5-calc.js / d3-power.js: exact tail sums via log-gamma,
// the "stable" n (power stays >= target for every larger n), a Wald SPRT by
// simulation, a Bayesian stopping rule, paired TOST by simulation, and payback
// recast as "hits needed" = W / (S - L).

function lgamma(x){ // Lanczos
  const g=7,c=[0.99999999999980993,676.5203681218851,-1259.1392167224028,771.32342877765313,-176.61563921696381,12.507343278686905,-0.13857109526572012,9.9843695780195716e-6,1.5056327351493116e-7];
  if(x<0.5) return Math.log(Math.PI/Math.sin(Math.PI*x))-lgamma(1-x);
  x-=1; let a=c[0]; const t=x+g+0.5; for(let i=1;i<9;i++) a+=c[i]/(x+i);
  return 0.5*Math.log(2*Math.PI)+(x+0.5)*Math.log(t)-t+Math.log(a);
}
const lchoose=(n,k)=>lgamma(n+1)-lgamma(k+1)-lgamma(n-k+1);
const pmf=(n,k,p)=>Math.exp(lchoose(n,k)+k*Math.log(p)+(n-k)*Math.log(1-p));
const upper=(n,c,p)=>{let s=0;for(let k=c;k<=n;k++)s+=pmf(n,k,p);return s;}; // P(X>=c)

function exactOneSample(p0,p1,alpha,power,nmax=400){
  const res=[];
  for(let n=1;n<=nmax;n++){
    let c=0; while(upper(n,c,p0)>alpha) c++;
    res.push({n,c,size:upper(n,c,p0),pow:upper(n,c,p1)});
  }
  const first=res.find(r=>r.pow>=power);
  let stable=null; for(let i=res.length-1;i>=0;i--){ if(res[i].pow<power){ stable=res[i+1]; break; } }
  return {first,stable};
}
const fmt=o=>o?`n=${o.n} (reject if hits>=${o.c}; size ${o.size.toFixed(3)}, power ${o.pow.toFixed(3)})`:"none";
console.log("== Hit-rate test, exact one-sided binomial, alpha 0.05 ==");
for (const [p0,p1,pw] of [[0.05,0.15,0.8],[0.05,0.15,0.9],[0.10,0.20,0.8],[0.05,0.25,0.8]]){
  const r=exactOneSample(p0,p1,0.05,pw);
  console.log(` ${p0} vs ${p1}, power ${pw}: first ${fmt(r.first)} | stable ${fmt(r.stable)}`);
}
// Kill rule: fewer than 3 hits in 20
const cdf=(n,k,p)=>{let s=0;for(let i=0;i<=k;i++)s+=pmf(n,i,p);return s;};
console.log("Kill rule P(<3 hits in 20):", [0.05,0.10,0.15,0.20,0.25].map(h=>`h=${h}:${cdf(20,2,h).toFixed(3)}`).join("  "));

// Wald SPRT p0=0.05 vs p1=0.15, alpha .05 beta .2, by simulation (truncated at 300)
function sprt(p0,p1,alpha,beta,ptrue,trials=200000,seed=7){
  let s=seed; const rnd=()=>{s=(s*1103515245+12345)%2147483648; return s/2147483648;};
  const A=Math.log((1-beta)/alpha), B=Math.log(beta/(1-alpha));
  const up=Math.log(p1/p0), dn=Math.log((1-p1)/(1-p0));
  let tot=0, accH1=0; const ns=[];
  for(let t=0;t<trials;t++){ let L=0,n=0; while(n<300){ n++; L+= rnd()<ptrue?up:dn; if(L>=A){accH1++;break;} if(L<=B)break; } tot+=n; ns.push(n);}
  ns.sort((a,b)=>a-b);
  return {mean:(tot/trials).toFixed(1), median:ns[trials>>1], p90:ns[Math.floor(trials*0.9)], acceptH1:(accH1/trials).toFixed(3)};
}
console.log("== Wald SPRT 0.05 vs 0.15 (alpha .05, beta .2) ==");
for(const h of [0.05,0.10,0.15]) console.log(` true h=${h}:`,JSON.stringify(sprt(0.05,0.15,0.05,0.2,h)));

// Encounter clock: design expects 20 encounters per KS-9 window (8 weeks), X-05: 20 encounters = 7-20 phases
for (const n of [52,30]) console.log(`Calendar for ${n} encounters at 20 per 8 weeks: ${(n/20*56).toFixed(0)} days; at 20 per 20 phases: ${(n/20*7).toFixed(0)}-${(n/20*20).toFixed(0)} phases`);

// E3: paired equivalence (TOST) by normal approx with discordance psi, and by simulation check
const z=(p)=>{ // inverse normal (Acklam)
  const a=[-3.969683028665376e+01,2.209460984245205e+02,-2.759285104469687e+02,1.383577518672690e+02,-3.066479806614716e+01,2.506628277459239e+00];
  const b=[-5.447609879822406e+01,1.615858368580409e+02,-1.556989798598866e+02,6.680131188771972e+01,-1.328068155288572e+01];
  const c=[-7.784894002430293e-03,-3.223964580411365e-01,-2.400758277161838e+00,-2.549671635506416e+00,4.374664141464968e+00,2.938163982698783e+00];
  const d=[7.784695709041462e-03,3.224671290700398e-01,2.445134137142996e+00,3.754408661907416e+00];
  const pl=0.02425; let q,r;
  if(p<pl){q=Math.sqrt(-2*Math.log(p));return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}
  if(p>1-pl){q=Math.sqrt(-2*Math.log(1-p));return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}
  q=p-0.5;r=q*q;return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
};
const za1=z(0.95), za2=z(0.975), zb80=z(0.8), zb90h=z(0.9); // zb90h = z_{1-beta/2} for TOST at true diff 0, power .8
console.log("== E3 trial sizes (tasks) ==");
for(const psi of [0.2,0.3]) for(const m of [0.05,0.10]) console.log(` paired TOST, discordance ${psi}, margin ±${m*100} pts, true diff 0, power .8: ${Math.ceil((za1+zb90h)**2*psi/m**2)}`);
for(const m of [0.05,0.10]) console.log(` unpaired TOST at p=0.7, margin ±${m*100}: ${Math.ceil(2*(za1+zb90h)**2*0.21/m**2)} per arm`);
for(const psi of [0.2,0.3]) for(const d of [0.05,0.084]) console.log(` paired McNemar to DETECT a ${d*100}-pt gap, discordance ${psi}: ${Math.ceil((za2*Math.sqrt(psi)+zb80*Math.sqrt(psi-d*d))**2/d**2)}`);
// Smallest equivalence margin provable with 140 paired tasks
for(const psi of [0.2,0.3]) console.log(` with 140 paired tasks, discordance ${psi}: smallest provable margin ±${(100*(za1+zb90h)*Math.sqrt(psi/140)).toFixed(1)} pts`);

// Payback recast: hits needed = W / (S - Lhit) ignoring running costs; then months at a hit rate
console.log("== Payback as hits needed ==");
const sessM=[152,159]; // measured mean context tokens per session (M): FixFlow 2.13B/14; clinic slice 519x306k
for(const W of [200,500,1520,1590]) for(const S of [3,5,10,20]){ const hits=W/(S-0.35); console.log(` W=${W}M S=${S}M -> ${hits.toFixed(0)} hits; at 2.73/mo ${(hits/2.73).toFixed(1)} mo; at 0.91/mo ${(hits/0.91).toFixed(0)} mo`);}
// With per-hit value halving every T months, lifetime hits-equivalent of a constant stream r/mo = r*T/ln2
for(const T of [3,8,12]) for(const r of [2.73,0.91]) console.log(` half-life ${T} mo, ${r} hits/mo -> lifetime ${(r*T/Math.LN2).toFixed(1)} full-value hits`);
