// Pulls every search the November clinic sessions ran (Grep, Glob, shell grep/rg/find), with a little context, and draws a fixed sample.
const fs=require('fs'),path=require('path');
const root='C:/Users/User/.claude/projects'; const files=[];
function walk(d){ for(const e of fs.readdirSync(d,{withFileTypes:true})){ const p=d+'/'+e.name; if(e.isDirectory())walk(p); else if(e.name.endsWith('.jsonl'))files.push(p); } }
for(const d of fs.readdirSync(root)) if(/clinic/i.test(d)) walk(root+'/'+d);
const cut=(s,n)=>String(s||'').replace(/\s+/g,' ').slice(0,n);
const shellRe=/(?:^|[;&|(]\s*|\bxargs\s+)(git\s+grep|grep|rg|find|findstr|Select-String|ls)\s/;
const all=[]; let nFiles=0,nTools=0;
for(const fp of files){ let txt; try{txt=fs.readFileSync(fp,'utf8');}catch(e){continue;}
  const ev=[]; const sub=/subagents|agent-/.test(fp);
  for(const line of txt.split('\n')){ if(!line)continue; let o; try{o=JSON.parse(line);}catch(e){continue;}
    if(o.type!=='assistant'||!o.message||!Array.isArray(o.message.content))continue; if(!(Date.parse(o.timestamp)>=Date.parse('2026-11-01')))continue;
    for(const c of o.message.content){ if(c.type==='text'&&c.text)ev.push({k:'text',t:cut(c.text,260)}); else if(c.type==='tool_use')ev.push({k:'tool',n:c.name,i:c.input||{}}); } }
  if(ev.length)nFiles++;
  ev.forEach((e,idx)=>{ if(e.k!=='tool')return; nTools++; let kind=null,q='';
    if(e.n==='Grep'){kind='Grep';q=cut(JSON.stringify(e.i),420);}
    else if(e.n==='Glob'){kind='Glob';q=cut(JSON.stringify(e.i),300);}
    else if((e.n==='Bash'||e.n==='PowerShell')&&e.i.command){ const m=String(e.i.command).match(shellRe); if(m){kind='shell-'+m[1].replace(/\s+/g,' ');q=cut(e.i.command,420);} }
    if(!kind)return;
    let before=''; for(let j=idx-1;j>=Math.max(0,idx-6);j--) if(ev[j].k==='text'){before=ev[j].t;break;}
    const after=[]; for(let j=idx+1;j<ev.length&&after.length<2;j++) if(ev[j].k==='tool')after.push(ev[j].n+': '+cut(ev[j].i.file_path||ev[j].i.command||ev[j].i.pattern||ev[j].i.description||'',130));
    all.push({kind,sub,q,before,after}); });
}
const by={}; for(const s of all)by[s.kind]=(by[s.kind]||0)+1;
// rough shape of each search, by pattern only
const shape=s=>{ const q=s.q; if(s.kind==='Glob'||/^shell-(find|ls)/.test(s.kind))return 'list files';
  if(/\bimport\b|require\(|from [\w.]+ import|\buse \w+::/.test(q))return 'who imports';
  if(/\b(def|class|function|interface|struct|fn|func)\b\s/.test(q))return 'where defined';
  if(/\.log|\/logs?\/|journal|stderr|stdout|\.out\b|\.txt\b|\.jsonl?\b|\.md\b|docs\//.test(q))return 'logs, data or docs';
  return 'other text'; };
const sh={}; for(const s of all){ s.shape=shape(s); sh[s.shape]=(sh[s.shape]||0)+1; }
console.log('transcripts with November activity',nFiles,'| tool calls',nTools,'| searches',all.length,'('+(100*all.length/nTools).toFixed(1)+'% of tool calls)');
console.log('by tool',JSON.stringify(by)); console.log('rough shape by pattern',JSON.stringify(sh)); console.log('in subagents',all.filter(s=>s.sub).length);
fs.writeFileSync('searches.jsonl',all.map(s=>JSON.stringify(s)).join('\n'));
const n=200,step=all.length/n,sample=[]; for(let i=0;i<n;i++){ const s=all[Math.floor(i*step+step/2)]; sample.push({id:i+1,kind:s.kind,sub:s.sub,search:s.q,said_before:s.before,next_calls:s.after}); }
fs.writeFileSync('sample.json',JSON.stringify(sample,null,1)); console.log('sample',sample.length,'bytes',fs.statSync('sample.json').size);
