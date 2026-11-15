function rnorm(){let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
const sig=x=>1/(1+Math.exp(-x));
for (const sd of [1,2]) for (const [n,k] of [[40,3],[40,1],[100,3]]) {
  const ses=[];
  for(let r=0;r<2000;r++){
    const d=[]; for(let i=0;i<n;i++){const a=sd*rnorm();const p=sig(a);let x=0,y=0;for(let j=0;j<k;j++){x+=Math.random()<p;y+=Math.random()<p;}d.push((y-x)/k);}
    const m=d.reduce((a,b)=>a+b,0)/n; ses.push(Math.sqrt(d.reduce((a,b)=>a+(b-m)**2,0)/(n-1)/n));
  }
  const se=ses.reduce((a,b)=>a+b,0)/ses.length;
  console.log(`sd ${sd} n=${n} k=${k} SE of success diff ${(se*100).toFixed(1)} pts; one-sided 95% non-inferiority margin ~${(1.645*se*100).toFixed(1)} pts`);
}
