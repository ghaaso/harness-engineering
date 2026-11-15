// print assistant text + tool calls + short tool results between two timestamps
const fs=require('fs');const [f,a,b]=process.argv.slice(2);
const rl=require('readline').createInterface({input:fs.createReadStream(f)});
rl.on('line',l=>{ let o; try{o=JSON.parse(l)}catch{return} const t=o.timestamp||''; if(t<a||t>b) return; const m=o.message; if(!m) return;
  const cs=typeof m.content==='string'?[{type:'text',text:m.content}]:(m.content||[]);
  for(const c of cs){ if(c.type==='text'&&c.text) console.log(t.slice(11,19),m.role,'TEXT',c.text.slice(0,600).replace(/\s+/g,' '));
    if(c.type==='tool_use') console.log(t.slice(11,19),'USE',c.name,JSON.stringify(c.input).slice(0,400));
    if(c.type==='tool_result'){const s=typeof c.content==='string'?c.content:JSON.stringify(c.content); console.log(t.slice(11,19),'RES',s.slice(0,700).replace(/\s+/g,' '));}
  }});
