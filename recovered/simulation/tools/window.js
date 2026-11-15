// usage: node window.js <file> <fromISO> <toISO>  -> tool calls and short text in the time window
const fs=require('fs'),rl=require('readline');
const [p,a,b]=process.argv.slice(2);
(async()=>{const r=rl.createInterface({input:fs.createReadStream(p)});
for await(const line of r){let o;try{o=JSON.parse(line)}catch{continue}
 if(!o.timestamp||o.timestamp<a||o.timestamp>b)continue;
 const c=o.message&&o.message.content; if(!Array.isArray(c))continue;
 for(const x of c){ if(x.type==='tool_use')console.log(o.timestamp,'USE',x.name,JSON.stringify(x.input).slice(0,220));
  else if(x.type==='text'&&o.type==='assistant')console.log(o.timestamp,'TXT',x.text.slice(0,240).replace(/\n/g,' '));
  else if(x.type==='tool_result'){const t=typeof x.content==='string'?x.content:JSON.stringify(x.content); console.log(o.timestamp,'RES',t.length);}
 }}})();
