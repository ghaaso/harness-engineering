const fs=require('fs');const L='C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings/orchestrator/';
for(const r of ['1','2']){
 const o=JSON.parse(fs.readFileSync(L+`step10-audit-round${r}.json`,'utf8'));
 const v=o.result.verified; console.log('ROUND',r,'verified',v.length);
 v.forEach((x,i)=>{const f=x.finding;console.log(`#${i} `+(typeof f==='string'?f.slice(0,150):JSON.stringify({id:f.id,agent:f.agent||f.key||f.source,title:f.title}).slice(0,200)));
  console.log('   outcome='+x.verdict.outcome+' sev='+x.verdict.severity+' corrected='+(x.verdict.corrected_claim||'').slice(0,0));});
 if(o.result.unverified) console.log('unverified', JSON.stringify(o.result.unverified).slice(0,600));
}
