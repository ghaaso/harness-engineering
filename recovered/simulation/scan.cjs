const fs=require('fs'),path=require('path'),readline=require('readline');
const root='C:/Users/User/.claude/projects';
const skip=/house-expenses|lecture-stuff|compiler-construction/;
function walk(d,o){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p,o);else if(p.endsWith('.jsonl'))o.push(p);}}
(async()=>{
const files=[];for(const d of fs.readdirSync(root)){if(skip.test(d))continue;walk(path.join(root,d),files);}
const out=fs.createWriteStream('errors.jsonl');
let n=0;
for(const f of files){
 const rl=readline.createInterface({input:fs.createReadStream(f),crlfDelay:Infinity});
 const calls={};
 for await(const line of rl){
  if(line.length>3e6)continue;
  let o;try{o=JSON.parse(line)}catch{continue}
  const c=o.message&&o.message.content;if(!Array.isArray(c))continue;
  for(const b of c){
   if(b.type==='tool_use')calls[b.id]={name:b.name,input:JSON.stringify(b.input).slice(0,300)};
   if(b.type==='tool_result'&&b.is_error){
    let t=typeof b.content==='string'?b.content:(Array.isArray(b.content)?b.content.map(x=>x.text||'').join(''):'');
    out.write(JSON.stringify({f,ts:o.timestamp,id:b.tool_use_id,call:calls[b.tool_use_id]||null,t:t.slice(0,400)})+'\n');n++;
   }}
 }
}
out.end();console.log(files.length,n);
})();
