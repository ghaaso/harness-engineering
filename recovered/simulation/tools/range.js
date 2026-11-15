// usage: node range.js <file> <from> <to> <maxChars>
const fs=require('fs'),readline=require('readline');
const [f,a,b,mc]=process.argv.slice(2);const from=+a,to=+b,max=+(mc||400);
(async()=>{const rl=readline.createInterface({input:fs.createReadStream(f),crlfDelay:Infinity});let n=0;
for await(const line of rl){n++;if(n<from)continue;if(n>to)break;let o;try{o=JSON.parse(line)}catch{continue}
const ts=o.timestamp||'';const msg=o.message;let parts=[];
if(msg&&Array.isArray(msg.content)){for(const c of msg.content){if(c.type==='text')parts.push('TEXT: '+c.text);else if(c.type==='tool_use')parts.push('TOOL_USE '+c.name+': '+JSON.stringify(c.input));else if(c.type==='tool_result'){let t=typeof c.content==='string'?c.content:JSON.stringify(c.content);parts.push('RESULT: '+t);}else if(c.type==='thinking')parts.push('THINK: '+(c.thinking||''));}}
else if(msg&&typeof msg.content==='string')parts.push('STR: '+msg.content);
const model=msg&&msg.model?msg.model:'';
for(const p of parts)console.log(`${n} ${ts} ${o.type} ${model} | ${p.slice(0,max).replace(/\n/g,' ')}`);}})();
