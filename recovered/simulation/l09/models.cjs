// For each main transcript in clinic worktree folders: models used (by assistant message count), first and last timestamp, git branch, first user text
const fs=require('fs'),path=require('path');
const root='C:/Users/User/.claude/projects';
for(const d of fs.readdirSync(root).filter(x=>x.includes('Clinic-Workshop--claude-worktrees'))){
  for(const f of fs.readdirSync(path.join(root,d)).filter(x=>x.endsWith('.jsonl'))){
    const models={};let first='',t0='',t1='',branch='';
    const data=fs.readFileSync(path.join(root,d,f),'utf8');
    for(const l of data.split('\n')){ if(!l) continue; let o; try{o=JSON.parse(l)}catch{continue}
      if(o.timestamp){ if(!t0) t0=o.timestamp; t1=o.timestamp;}
      if(o.gitBranch&&!branch) branch=o.gitBranch;
      const m=o.message; if(!m) continue;
      if(m.role==='assistant'&&m.model) models[m.model]=(models[m.model]||0)+1;
      if(!first&&m.role==='user'){ const t=typeof m.content==='string'?m.content:(Array.isArray(m.content)?(m.content.find(c=>c.type==='text')||{}).text||'':''); if(t&&!t.startsWith('<')) first=t.slice(0,110).replace(/\s+/g,' ');}
    }
    console.log(d.replace(/.*worktrees-/,''), f.slice(0,8), branch, (t0||'').slice(0,10), (t1||'').slice(0,10), JSON.stringify(models), '|', first);
  }
}
