// tool calls/results on 2026-11-06 12:30-15:15 local (07:30-10:15Z), all transcripts modified since then
const fs=require('fs'),path=require('path');
const ROOT='C:/Users/User/.claude/projects';
const SINCE=new Date('2026-11-06T07:30:00Z').getTime();
const A='2026-11-06T07:30:00Z',Z='2026-11-06T10:15:00Z';
const files=[];(function w(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())w(p);else if(e.name.endsWith('.jsonl')&&e.name!=='journal.jsonl'){const st=fs.statSync(p);if(st.mtimeMs>=SINCE&&st.size<200e6)files.push(p);}}})(ROOT);
const out=[];let scanned=0;
for(const f of files){
 const txt=fs.readFileSync(f,'utf8'); scanned++;
 if(txt.indexOf('"2026-11-06T0')<0&&txt.indexOf('"2026-11-06T10')<0) continue;
 const sid=path.relative(ROOT,f).split(path.sep).slice(1).join('/').replace(/\.jsonl$/,'').replace('subagents/agent-','~').slice(0,30);
 for(const line of txt.split('\n')){ if(line.indexOf('2026-11-06T')<0) continue; let o; try{o=JSON.parse(line)}catch{continue}
  const ts=o.timestamp; if(!ts||ts<A||ts>Z) continue;
  const c=o.message&&o.message.content;
  if(Array.isArray(c)) for(const it of c){
   if(it.type==='tool_use'){const inp=it.input||{};let pv=inp.command||inp.file_path||inp.pattern||inp.description||'';out.push([ts,sid,'U',it.id,it.name,String(pv).replace(/\s+/g,' ').slice(0,100)]);}
   else if(it.type==='tool_result'){let t=typeof it.content==='string'?it.content:(Array.isArray(it.content)&&it.content[0]&&it.content[0].text)||'';out.push([ts,sid,'R',it.tool_use_id,!!it.is_error,String(t).replace(/\s+/g,' ').slice(0,80)]);}
  }
  if(o.type==='assistant') out.push([ts,sid,'A']);
 }}
out.sort((a,b)=>a[0]<b[0]?-1:1);
fs.writeFileSync('tx06.json',JSON.stringify(out));
console.log('files',files.length,'scanned',scanned,'rows',out.length);
