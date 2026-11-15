const fs=require('fs'); const f='C:/Users/User/Documents/projects/EMS_workshop1/docs/program/HARNESS-BOTTLENECKS-2026-11.md';
let s=fs.readFileSync(f,'utf8'); const add=fs.readFileSync('sec6-status.md','utf8'); let n=0;
const rep=(a,b)=>{ if(!s.includes(a)){console.log('MISSING: '+a.slice(0,70));return;} s=s.replace(a,b); n++; };
rep('**What "self-evolving" can honestly mean:**', add+'**What "self-evolving" can honestly mean:**');
rep('So no graph database and no traversal cache; the part worth testing is a scripted map of cross-runtime contracts as an input to review.', 'The owner rejected that test the same day and a research round confirmed its defects (the weakest query, no real graph engine, no ranking or hop tuning), so its verdict is withdrawn; a replacement test is frozen in the evidence folder and under way (§6).');
rep('a graph database, server or embedded (nothing to gain at this size; a server adds 1 to 2 GB); a cache over graph traversal;', 'a graph database server on a memory-short PC (an embedded graph engine is under test, §6);');
rep('| `manifest.sha256` | Digests of every file above |', '| `graph2/protocol.md`, `graph2/brief.md` | §6: the frozen protocol of the replacement test, and the brief the research agents worked from |\n| `graph2/research/` | §6: the research round (six lanes, three verifiers, a critic): `result.json` raw, `lane-*.txt`, `verify.txt` and `critic.txt` rendered, and the lanes\' scripts and outputs |\n| `manifest.sha256` | Digests of every file above |');
fs.writeFileSync(f,s); console.log('replacements',n);
