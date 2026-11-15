const fs=require('fs'),path=require('path');
const root='C:/Users/User/.claude/projects/C--Users-User-Documents-projects-EMS-workshop1';
function walk(d,o){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p,o);else if(p.endsWith('.jsonl'))o.push(p);}return o;}
for(const f of walk(root,[])){
 const lines=fs.readFileSync(f,'utf8').split('\n');
 let memLoaded=-1;
 lines.forEach((l,i)=>{ if(memLoaded<0 && /windows-git-longpaths|Windows git long paths/.test(l)) memLoaded=i+1;
  if(!l.includes('Python was not found'))return;
  let o;try{o=JSON.parse(l)}catch(e){return}
  if(o.type!=='user'||!o.timestamp||o.timestamp<'2026-11-04T07:10')return;
  const c=o.message&&o.message.content; if(!Array.isArray(c))return;
  for(const b of c){ if(b.type==='tool_result'){const t=typeof b.content==='string'?b.content:JSON.stringify(b.content); if(/Python was not found/.test(t)) console.log(path.relative(root,f).slice(0,110),'line',i+1,o.timestamp,'memLine',memLoaded,'| res:',t.slice(0,160).replace(/\s+/g,' '));}}
 });
}
