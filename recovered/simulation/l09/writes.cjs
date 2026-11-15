// Scan subagent transcripts for Write tool uses and their results
const fs=require('fs'),path=require('path');
const dir=process.argv[2];
for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.jsonl'))){
  const lines=fs.readFileSync(path.join(dir,f),'utf8').split('\n');
  let model='',first='';const ids={};
  for(const l of lines){ if(!l) continue; let o; try{o=JSON.parse(l)}catch{continue}
    const m=o.message; if(!m) continue;
    if(m.model&&!model) model=m.model;
    if(!first && m.role==='user' && typeof m.content==='string') first=m.content.slice(0,160).replace(/\s+/g,' ');
    if(Array.isArray(m.content)) for(const c of m.content){
      if(c.type==='tool_use' && (c.name==='Write'||c.name==='Edit')) ids[c.id]={name:c.name,path:(c.input&&c.input.file_path)||'',ts:o.timestamp};
      if(c.type==='tool_result' && ids[c.tool_use_id]){ let t=typeof c.content==='string'?c.content:JSON.stringify(c.content); ids[c.tool_use_id].res=t.slice(0,240).replace(/\s+/g,' '); ids[c.tool_use_id].err=!!c.is_error;}
    }
  }
  const w=Object.values(ids);
  console.log(f, model, 'writes='+w.length, '|', first);
  for(const x of w) console.log('   ',x.ts,x.name,x.path.slice(-70),'err='+x.err,'|',(x.res||'').slice(0,200));
}
