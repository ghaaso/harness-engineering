// usage: node grepuse.cjs <regex over tool_use input> ; scans all transcripts since 2026-10-01
const fs=require('fs'),path=require('path'),readline=require('readline');
const root='C:/Users/User/.claude/projects';const skip=/house-expenses|lecture-stuff|compiler-construction/;const RE=new RegExp(process.argv[2],'i');
function walk(d,o){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p,o);else if(p.endsWith('.jsonl'))o.push(p);}}
(async()=>{const files=[];for(const d of fs.readdirSync(root)){if(skip.test(d))continue;walk(path.join(root,d),files);}
for(const f of files){const rl=readline.createInterface({input:fs.createReadStream(f),crlfDelay:Infinity});
 for await(const line of rl){if(line.length>3e6||!RE.test(line))continue;let o;try{o=JSON.parse(line)}catch{continue};const c=o.message&&o.message.content;if(!Array.isArray(c)||!o.timestamp)continue;
  for(const b of c)if(b.type==='tool_use'){const s=JSON.stringify(b.input);if(RE.test(s)){const i=s.search(RE);console.log(o.timestamp.slice(0,16),o.message.model,b.name,f.replace(/.*projects./,'').slice(0,45),'..',f.slice(-30),'|',s.slice(Math.max(0,i-80),i+100));}}}}})();
