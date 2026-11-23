// sessions.mjs: per main session of CL, FF, H: did the session run an executed check after its last code edit? (the "backed" test for session reports)
import fs from 'node:fs'; import path from 'node:path'; import readline from 'node:readline';
const ROOT = 'C:/Users/User/.claude/projects';
const CHECK = /(\bnpm (run )?test\b|\bvitest\b|\bjest\b|\bpytest\b|node --test|\btsc\b|\beslint\b|\bruff\b|\bmypy\b|playwright|check\.mjs|land\.mjs|\bcheck\.(sh|ps1|py)\b|scripts.check|\bmake (test|check)|gradlew|manage\.py test|\bhb\b)/i;
const FAILOUT = /(\b[1-9]\d* (failed|failing|errors?)\b|CHECK FAILED|^\s*FAIL\b|not ok \d|exit code [1-9]|# fail [1-9])/im;
function txt(c){ if(typeof c==='string')return c; if(!Array.isArray(c))return ''; return c.map(x=>x&&x.type==='text'?x.text:'').join('\n'); }
const proj = d => d.includes('harness-engineering')?'H':(d.includes('EMS-workshop1')||d.includes('23-FixFlow'))?'FF':d.includes('24-Clinic-Workshop')?'CL':null;
const out=[];
for (const d of fs.readdirSync(ROOT)) { const p=proj(d); if(!p) continue;
  for (const f of fs.readdirSync(path.join(ROOT,d))) { if(!f.endsWith('.jsonl')) continue;
    const file=path.join(ROOT,d,f); let idx=0,lastEdit=-1,edits=0; const pend=new Map(), checks=[]; let start=null,end=null,finalText='';
    const rl=readline.createInterface({input:fs.createReadStream(file,{encoding:'utf8'}),crlfDelay:Infinity});
    for await (const line of rl){ if(!line||line.length>5e6)continue; let o; try{o=JSON.parse(line)}catch{continue}
      if(o.timestamp){start=start||o.timestamp;end=o.timestamp;} const m=o.message; if(!m||!Array.isArray(m.content))continue;
      if(o.type==='assistant'){ const t=m.content.filter(c=>c.type==='text').map(c=>c.text).join('\n').trim(); if(t)finalText=t;
        for(const c of m.content){ if(c.type!=='tool_use')continue; idx++; const fp=c.input&&c.input.file_path||'';
          if(/^(Edit|Write|MultiEdit)$/.test(c.name)&&!/\.md$/i.test(fp)){edits++;lastEdit=idx;}
          if(/^(Bash|PowerShell)$/.test(c.name)&&CHECK.test(String(c.input&&c.input.command||''))) pend.set(c.id,{idx}); } }
      if(o.type==='user') for(const c of m.content){ if(c.type!=='tool_result'||!pend.has(c.tool_use_id))continue; const e=pend.get(c.tool_use_id); pend.delete(c.tool_use_id); e.err=!!c.is_error||FAILOUT.test(txt(c.content)); checks.push(e);} }
    const after=checks.filter(c=>c.idx>lastEdit);
    out.push({proj:p,dir:d.slice(-30),session:f.slice(0,8),start,end,edits,checks:checks.length,checkedAfterLastEdit:after.length>0,lastAfterOk:after.length?!after[after.length-1].err:null,final:finalText.slice(0,200)});
  } }
fs.writeFileSync('sessions.jsonl',out.map(o=>JSON.stringify(o)).join('\n')+'\n');
const s={}; for(const o of out){ if(!o.edits)continue; const k=o.proj; s[k]=s[k]||{withEdits:0,checkedAfter:0,okAfter:0}; s[k].withEdits++; if(o.checkedAfterLastEdit)s[k].checkedAfter++; if(o.lastAfterOk)s[k].okAfter++; }
console.log(JSON.stringify(s));
