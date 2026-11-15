// node usage.js <file> <from> <to> : prints assistant lines with usage and tool names/short text
const fs=require('fs');const rl=require('readline');
const [file,fromS,toS]=process.argv.slice(2);const from=+fromS,to=+toS;let n=0;
const r=rl.createInterface({input:fs.createReadStream(file),crlfDelay:Infinity});
r.on('line',l=>{n++;if(n<from||n>to)return;let o;try{o=JSON.parse(l)}catch(e){return}
 const m=o.message||{};const u=m.usage;let desc='';
 const c=m.content; if(Array.isArray(c))desc=c.map(b=>b.type==='tool_use'?('TU:'+b.name+' '+JSON.stringify(b.input).slice(0,160)):b.type==='text'?('TX:'+b.text.slice(0,200)):b.type==='tool_result'?('TR:'+JSON.stringify(b.content).slice(0,160)):b.type).join(' | '); else if(typeof c==='string')desc='S:'+c.slice(0,200);
 console.log(`L${n} ${o.timestamp||''} ${o.type} ${m.model||''} ${u?('in='+u.input_tokens+' cr='+u.cache_read_input_tokens+' cc='+u.cache_creation_input_tokens+' out='+u.output_tokens):''} ${desc.replace(/\s+/g,' ')}`)});
