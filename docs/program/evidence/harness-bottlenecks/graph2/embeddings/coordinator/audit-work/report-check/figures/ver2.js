const fs=require('fs');const L='C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings/orchestrator/';
const [r,...idx]=process.argv.slice(2);
const o=JSON.parse(fs.readFileSync(L+`step10-audit-round${r}.json`,'utf8'));
for(const i of idx){const x=o.result.verified[+i];console.log(`== #${i} ${x.finding.id}`);console.log('REASON: '+x.verdict.reason);console.log('CORRECTED: '+x.verdict.corrected_claim);}
