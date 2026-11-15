// usage: node where.cjs <file> <needleRegex> <errRegex>
const fs=require('fs');
const [f,nd,er]=process.argv.slice(2);const N=new RegExp(nd),E=new RegExp(er);
const L=fs.readFileSync(f,'utf8').split('\n');const uses={};
L.forEach((l,i)=>{if(!l)return;let o;try{o=JSON.parse(l)}catch{return}
 const ts=o.timestamp||'';const m=o.message;const c=m&&m.content;
 if(N.test(l)){console.log('NEEDLE line',i+1,ts,o.type,(Array.isArray(c)?c.map(b=>b.type).join(','):typeof c));}
 if(!Array.isArray(c))return;
 for(const b of c){if(b.type==='tool_use')uses[b.id]={i:i+1,name:b.name,len:JSON.stringify(b.input).length,model:m.model,cmd:(b.input.command||b.input.file_path||'').slice(0,140)};
  if(b.type==='tool_result'&&b.is_error){const t=typeof b.content==='string'?b.content:JSON.stringify(b.content);if(E.test(t)){const u=uses[b.tool_use_id]||{};console.log('ERR line',i+1,ts,u.name,u.len,u.model,JSON.stringify(u.cmd),'|',t.slice(0,120).replace(/\n/g,' '));}}}
});
