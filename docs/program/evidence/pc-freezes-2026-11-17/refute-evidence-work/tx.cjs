// own extraction of tool calls/results from all transcripts touched on 11-17 (local), 00:00-17:00 local
const fs=require('fs'),path=require('path');
const ROOT='C:/Users/User/.claude/projects';
const SINCE=new Date('2026-11-17T00:00:00+05:00').getTime();
const A='2026-11-16T19:00:00Z',Z='2026-11-17T12:00:00Z';
const files=[];(function w(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())w(p);else if(e.name.endsWith('.jsonl')&&e.name!=='journal.jsonl'&&fs.statSync(p).mtimeMs>=SINCE)files.push(p);}})(ROOT);
const out=[];
for(const f of files){const rel=path.relative(ROOT,f).split(path.sep).join('/');const sid=rel.split('/').slice(1).join('/').replace(/\.jsonl$/,'').replace('subagents/agent-','~').slice(0,30);
 for(const line of fs.readFileSync(f,'utf8').split('\n')){ if(!line) continue; let o; try{o=JSON.parse(line)}catch{continue}
  const ts=o.timestamp; if(!ts||ts<A||ts>Z) continue;
  const c=o.message&&o.message.content;
  if(Array.isArray(c)) for(const it of c){
   if(it.type==='tool_use'){const inp=it.input||{};let pv=inp.command||inp.file_path||inp.pattern||inp.url||inp.description||'';pv=String(pv).replace(/\s+/g,' ').slice(0,140);out.push([ts,sid,'U',it.id,it.name,pv]);}
   else if(it.type==='tool_result'){let t=typeof it.content==='string'?it.content:(Array.isArray(it.content)&&it.content[0]&&it.content[0].text)||'';out.push([ts,sid,'R',it.tool_use_id,!!it.is_error,String(t).replace(/\s+/g,' ').slice(0,100)]);}
  }
  if(o.type==='assistant') out.push([ts,sid,'A',(o.message&&o.message.stop_reason)||'']);
  else if(o.type&&o.type!=='user') out.push([ts,sid,'T',o.type,o.subtype||'']);
 }}
out.sort((a,b)=>a[0]<b[0]?-1:1);
fs.writeFileSync('tx.json',JSON.stringify(out));
console.log('files',files.length,'rows',out.length);
