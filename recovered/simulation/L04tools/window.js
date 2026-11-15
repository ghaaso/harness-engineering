// usage: node window.js <file> <fromISO> <toISO> [maxlen]
const fs=require('fs');
const [f,from,to,ml]=process.argv.slice(2); const max=+ml||300;
for(const ln of fs.readFileSync(f,'utf8').split('\n')){
  if(!ln) continue; let o; try{o=JSON.parse(ln)}catch(e){continue}
  const ts=o.timestamp; if(!ts||ts<from||ts>to) continue;
  const m=o.message; if(!m||!m.content) continue;
  const c=Array.isArray(m.content)?m.content:[{type:'text',text:m.content}];
  for(const b of c){
    let s='';
    if(b.type==='text') s='TEXT: '+b.text;
    else if(b.type==='thinking') s='THINK: '+b.thinking;
    else if(b.type==='tool_use') s='CALL: '+JSON.stringify(b.input);
    else if(b.type==='tool_result') s='RESULT: '+(typeof b.content==='string'?b.content:JSON.stringify(b.content));
    else continue;
    const u=o.message.usage; const tok=u?` [cr ${u.cache_read_input_tokens} cc ${u.cache_creation_input_tokens} out ${u.output_tokens}]`:'';
    console.log(ts.slice(0,19)+' '+m.role+tok+' '+s.replace(/\s+/g,' ').slice(0,max));
  }
}
