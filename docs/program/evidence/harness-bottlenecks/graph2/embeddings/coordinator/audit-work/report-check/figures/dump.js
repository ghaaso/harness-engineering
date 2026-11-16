const fs=require('fs');const L='C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings/orchestrator/';
for(const r of ['1','2']){
 const o=JSON.parse(fs.readFileSync(L+`step10-audit-round${r}.json`,'utf8'));
 let out='';
 out+='TOPKEYS '+Object.keys(o).join(',')+'\nRESULTKEYS '+Object.keys(o.result).join(',')+'\n';
 for(const [k,a] of Object.entries(o.result.agents)){
  out+=`\n===== AGENT ${k} verdict=${a.verdict}\nSUMMARY: ${a.summary}\n`;
  for(const f of a.findings||[]) out+=`-- FINDING ${f.id} [${f.severity}] ${f.title}\n CLAIM: ${f.claim}\n EVIDENCE: ${f.evidence}\n`;
  out+=`CHECKS: ${JSON.stringify(a.checks)}\nNOT_CHECKED: ${JSON.stringify(a.not_checked)}\n`;
 }
 out+='\n===== VERIFIED\n';
 for(const v of o.result.verified||[]) out+=`-- ${JSON.stringify(v.finding).slice(0,400)}\n => ${JSON.stringify(v.verdict)}\n`;
 if(o.result.unverified) out+='\n===== UNVERIFIED\n'+JSON.stringify(o.result.unverified)+'\n';
 if(o.result.critic) out+='\n===== CRITIC\n'+JSON.stringify(o.result.critic)+'\n';
 fs.writeFileSync(`r${r}.txt`,out);
 console.log(r, out.length);
}
