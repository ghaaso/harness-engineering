// For each file: list Write calls with path, timestamp, model, and whether refused with the report-file message
const fs=require('fs');
for(const f of process.argv.slice(2)){
  let model='';const ids={};
  for(const l of fs.readFileSync(f,'utf8').split('\n')){ if(!l) continue; let o; try{o=JSON.parse(l)}catch{continue}
    const m=o.message; if(!m) continue; if(m.model&&!model) model=m.model;
    if(Array.isArray(m.content)) for(const c of m.content){
      if(c.type==='tool_use' && c.name==='Write') ids[c.id]={p:(c.input&&c.input.file_path)||'',ts:o.timestamp};
      if(c.type==='tool_result' && ids[c.tool_use_id]){ const t=typeof c.content==='string'?c.content:JSON.stringify(c.content); ids[c.tool_use_id].r=/return findings as text/.test(t)?'REFUSED':(/created|updated/.test(t)?'ok':t.slice(0,80));}
    }}
  const short=f.split(/[\/]/).slice(-3).join('/');
  for(const x of Object.values(ids)) console.log(short.slice(-60), model, x.ts, x.r, x.p.split(/[\/]/).slice(-2).join('/'));
}
