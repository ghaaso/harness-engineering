// Read-only: classify shell time (raw tool_use -> tool_result durations, < 1 h) by what the command waits for or runs.
const fs=require('fs'),path=require('path'),readline=require('readline');
const [group,...stores]=process.argv.slice(2);
function walk(d,acc){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p,acc);else if(e.name.endsWith('.jsonl'))acc.push(p);}return acc;}
const cat={};let tot=0;
function k(c){
 if(/CHECK|check\.sh|check\.ps1|run-check|gate|pytest|manage\.py\s+test|npm\s+(run\s+)?(test|check|build|lint)|vitest|playwright|docker/i.test(c))return 'check/test (run or poll)';
 if(/task-notification|"type":"result"|subagent|agent-|workflow|\.output/i.test(c))return 'wait on agent/background task';
 if(/\bsleep\b|until |while /.test(c))return 'other sleep/poll';
 if(/\bgit\b|\bgh\b/.test(c))return 'git/gh';
 if(/\buv\b|\bpython|\bnode\b|\bnpm\b|\bnpx\b/.test(c))return 'scripts/tools';
 return 'other';}
async function one(f){const rl=readline.createInterface({input:fs.createReadStream(f),crlfDelay:Infinity});const st=new Map();
 for await(const line of rl){if(line.startsWith('{"type":"api-request-blob"')||line.startsWith('{"type":"file-history'))continue;let o;try{o=JSON.parse(line)}catch{continue}
  const ts=o.timestamp?Date.parse(o.timestamp):null;if(!ts)continue;
  if(o.type==='assistant'&&o.message&&Array.isArray(o.message.content))for(const b of o.message.content)if(b.type==='tool_use'&&(b.name==='Bash'||b.name==='PowerShell'))st.set(b.id,{ts,cmd:String((b.input&&b.input.command)||'')});
  if(o.type==='user'&&o.message&&Array.isArray(o.message.content))for(const b of o.message.content)if(b.type==='tool_result'&&st.has(b.tool_use_id)){const s=st.get(b.tool_use_id);const d=(ts-s.ts)/1000;if(d>0&&d<3600){const c=k(s.cmd);cat[c]=(cat[c]||0)+d;tot+=d;}st.delete(b.tool_use_id);}
 }}
(async()=>{for(const s of stores){for(const mf of fs.readdirSync(s).filter(n=>n.endsWith('.jsonl'))){await one(path.join(s,mf));const sd=path.join(s,mf.replace(/\.jsonl$/,''),'subagents');if(fs.existsSync(sd))for(const sf of walk(sd,[]))await one(sf);}}
 console.log(group,'shell hours',(tot/3600).toFixed(1),Object.entries(cat).sort((a,b)=>b[1]-a[1]).map(([c,v])=>c+' '+(v/3600).toFixed(1)+'h ('+(100*v/tot).toFixed(0)+'%)').join('; '));})();
