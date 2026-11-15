// Sampling rule (fixed before looking at recall results):
// groups = non-test code files: py under backend/, js/jsx/ts/tsx/mjs under src/, ts/tsx/js/jsx under technician-app/.
// sorted by path; N=floor(len/7); take indices N*k+floor(N/2), k=0..6; then add the 3 files with most distinct
// incoming import/mock sources in the graph that are not already picked.
const fs=require('fs'); const g=JSON.parse(fs.readFileSync('../../graph.json','utf8')); const F=g.files;
const isTest=f=>/(^|\/)(tests?|__tests__)\/|\.test\.|(^|\/)test_|conftest/.test(f);
const inc={}; for(const [s,d,k] of g.edges){ if(k==='cites')continue; (inc[F[d]]=inc[F[d]]||new Set()).add(F[s]); }
const groups={py:f=>f.startsWith('backend/')&&/\.py$/.test(f), web:f=>f.startsWith('src/')&&/\.(js|jsx|ts|tsx|mjs)$/.test(f), mob:f=>f.startsWith('technician-app/')&&/\.(js|jsx|ts|tsx)$/.test(f)};
const out={};
for(const [k,fn] of Object.entries(groups)){ const L=F.filter(f=>fn(f)&&!isTest(f)).sort(); const N=Math.floor(L.length/7); const pick=[];
  for(let i=0;i<7;i++)pick.push(L[N*i+Math.floor(N/2)]);
  const top=L.slice().sort((a,b)=>((inc[b]||new Set()).size-(inc[a]||new Set()).size)||a.localeCompare(b)); let added=0;
  for(const f of top){ if(added===3)break; if(!pick.includes(f)){pick.push(f);added++;} }
  out[k]=pick; console.log(k,'group size',L.length,'N',N); pick.forEach(f=>console.log('  ',f,(inc[f]||new Set()).size)); }
fs.writeFileSync('sample30.json',JSON.stringify(out,null,1));
