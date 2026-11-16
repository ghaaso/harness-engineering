// Read-only: gaps > 30 min between consecutive timestamped records in each top-level session file, with the last tool in flight.
const fs=require('fs'),path=require('path'),readline=require('readline');
const base='C:/Users/User/.claude/projects';
const dirs=fs.readdirSync(base).filter(d=>d.startsWith('C--Bilal-Migration-User-Downloads-20-PROJECTS-24-Clinic-Workshop'));
const out=[];
(async()=>{
 for(const d of dirs){
  for(const f of fs.readdirSync(path.join(base,d)).filter(f=>f.endsWith('.jsonl'))){
   let prev=0,last='';
   const rl=readline.createInterface({input:fs.createReadStream(path.join(base,d,f))});
   for await(const line of rl){
    if(line.length>2e6) continue;
    let o; try{o=JSON.parse(line)}catch{continue}
    const t=Date.parse(o.timestamp); if(!t) continue;
    if(prev&&t-prev>30*60000) out.push({min:((t-prev)/60000).toFixed(0),at:new Date(prev).toISOString().slice(0,16),dir:d.slice(63,85),last,next:(o.type||'')+':'+(o.message&&Array.isArray(o.message.content)&&o.message.content[0]?o.message.content[0].type:typeof (o.message&&o.message.content))});
    prev=t;
    const c=o.message&&o.message.content;
    if(Array.isArray(c)) for(const b of c){ if(b.type==='tool_use') last=b.name+':'+String((b.input&&(b.input.command||b.input.description))||'').slice(0,60).replace(/\s+/g,' '); }
   }
  }
 }
 out.sort((a,b)=>a.at<b.at?-1:1);
 console.log('gaps>30min:',out.length, ' of which 30-180 min:', out.filter(r=>r.min<=180).length);
 for(const r of out.filter(r=>r.min<=180)) console.log(r.min,r.at,r.dir,'| last tool',r.last,'| next',r.next);
})();
