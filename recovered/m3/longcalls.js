// Read-only: top-level session JSONL files only; reports single tool calls lasting > 20 min.
const fs=require('fs'),path=require('path'),readline=require('readline');
const base='C:/Users/User/.claude/projects';
const dirs=fs.readdirSync(base).filter(d=>d.startsWith('C--Bilal-Migration-User-Downloads-20-PROJECTS-24-Clinic-Workshop'));
const out=[];
(async()=>{
 for(const d of dirs){
  const files=fs.readdirSync(path.join(base,d)).filter(f=>f.endsWith('.jsonl'));
  for(const f of files){
   const pend=new Map();
   const rl=readline.createInterface({input:fs.createReadStream(path.join(base,d,f))});
   for await(const line of rl){
    if(line.length>2e6) continue;
    let o; try{o=JSON.parse(line)}catch{continue}
    const t=Date.parse(o.timestamp); if(!t) continue;
    const c=o.message&&o.message.content; if(!Array.isArray(c)) continue;
    for(const b of c){
     if(b.type==='tool_use'){const inp=b.input||{};pend.set(b.id,{t,name:b.name,cmd:String(inp.command||inp.description||inp.prompt||'').slice(0,90).replace(/\s+/g,' '),bg:!!inp.run_in_background});}
     else if(b.type==='tool_result'&&pend.has(b.tool_use_id)){const p=pend.get(b.tool_use_id);pend.delete(b.tool_use_id);const m=(t-p.t)/60000;if(m>20)out.push({min:m.toFixed(1),at:new Date(p.t).toISOString().slice(0,16),dir:d.slice(63,90),tool:p.name,cmd:p.cmd});}
    }
   }
  }
 }
 out.sort((a,b)=>b.min-a.min);
 console.log('calls>20min:',out.length);
 for(const r of out.slice(0,25)) console.log(r.min,r.at,r.dir,r.tool,'|',r.cmd);
})();
