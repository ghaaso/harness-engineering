// Read-only: list the longest tool intervals (by duration) per group, with the command head, to see what non-model time is.
const fs=require('fs'),path=require('path'),readline=require('readline');
const [group,...stores]=process.argv.slice(2);
function walk(d,acc){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p,acc);else if(e.name.endsWith('.jsonl'))acc.push(p);}return acc;}
const rows=[];const byName={};
async function one(f){const rl=readline.createInterface({input:fs.createReadStream(f),crlfDelay:Infinity});const st=new Map();
 for await(const line of rl){if(line.startsWith('{"type":"api-request-blob"')||line.startsWith('{"type":"file-history'))continue;let o;try{o=JSON.parse(line)}catch{continue}
  const ts=o.timestamp?Date.parse(o.timestamp):null;if(!ts)continue;
  if(o.type==='assistant'&&o.message&&Array.isArray(o.message.content))for(const b of o.message.content)if(b.type==='tool_use')st.set(b.id,{ts,n:b.name,cmd:String((b.input&&(b.input.command||b.input.description||b.input.prompt))||'').replace(/\s+/g,' ').slice(0,110),bg:!!(b.input&&b.input.run_in_background)});
  if(o.type==='user'&&o.message&&Array.isArray(o.message.content))for(const b of o.message.content)if(b.type==='tool_result'&&st.has(b.tool_use_id)){const s=st.get(b.tool_use_id);const d=(ts-s.ts)/1000;if(d>0&&d<3600){rows.push({d,n:s.n,cmd:s.cmd,bg:s.bg});byName[s.n]=(byName[s.n]||0)+d;}st.delete(b.tool_use_id);}
 }}
(async()=>{for(const s of stores){for(const mf of fs.readdirSync(s).filter(n=>n.endsWith('.jsonl'))){await one(path.join(s,mf));const sd=path.join(s,mf.replace(/\.jsonl$/,''),'subagents');if(fs.existsSync(sd))for(const sf of walk(sd,[]))await one(sf);}}
 console.log(group,'tool time by name (h, raw, overlapping):',Object.entries(byName).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([k,v])=>k+' '+(v/3600).toFixed(1)).join(', '));
 // bucket shell commands by first meaningful word
 const buck={};for(const r of rows){if(r.n!=='Bash'&&r.n!=='PowerShell')continue;let c=r.cmd.replace(/^cd\s+("[^"]*"|'[^']*'|\S+)\s*(&&|;)\s*/,'');const w=(c.match(/^(\S+(\s+\S+)?)/)||['?'])[0].slice(0,30);buck[w]=(buck[w]||0)+r.d;}
 console.log(' shell time by leading words (h):',Object.entries(buck).sort((a,b)=>b[1]-a[1]).slice(0,25).map(([k,v])=>JSON.stringify(k)+' '+(v/3600).toFixed(2)).join(', '));
 rows.sort((a,b)=>b.d-a.d);console.log(' longest 25:');for(const r of rows.slice(0,25))console.log('  ',r.d.toFixed(0)+'s',r.n,r.bg?'[bg]':'',r.cmd);
})();
