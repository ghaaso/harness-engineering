// For each code file changed in history: its reach (all dependants, graph at HEAD), weighted by how often it changed. Compares with the plan's 15-file drop rule.
const fs=require('fs'); const g=JSON.parse(fs.readFileSync('graph.json','utf8')); const F=g.files; const idx=new Map(F.map((f,i)=>[f,i]));
const rev=F.map(()=>[]); for(const [s,d,k] of g.edges) if(k!=='cites') rev[d].push(s);
const reach=i=>{const seen=new Set([i]),q=[i];while(q.length){const n=q.pop();for(const m of rev[n])if(!seen.has(m)){seen.add(m);q.push(m);}}return seen.size-1;};
const isCode=f=>/\.(py|ts|tsx|js|jsx|mjs)$/.test(f); const isTest=f=>/(^|\/)(tests?|__tests__)\/|\.test\.|(^|\/)test_|conftest/.test(f);
let ch=0,over=0,commitsWithOver=0,commits=0;
for(const c of fs.readFileSync('gitlog.txt','utf8').split('--C--')){ const fl=c.split('\n').map(x=>x.trim()).filter(f=>isCode(f)&&!isTest(f)&&idx.has(f)); if(!fl.length)continue; commits++; let any=false;
  for(const f of fl){ ch++; if(reach(idx.get(f))>15){over++;any=true;} } if(any)commitsWithOver++; }
console.log('non-test code file changes (files still at HEAD)',ch,'| of them on files with reach over 15',over,'('+(100*over/ch).toFixed(0)+'%) | commits touching code',commits,'| commits touching at least one such file',commitsWithOver,'('+(100*commitsWithOver/commits).toFixed(0)+'%)');
