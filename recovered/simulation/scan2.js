const fs=require('fs'),path=require('path');
const root='C:/Users/User/.claude/projects/C--Users-User-Documents-projects-EMS-workshop1';
function walk(d,o){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p,o);else if(p.endsWith('.jsonl'))o.push(p);}return o;}
const pats=[/Python was not found/,/Filename too long/,/unable to open loose object/];
for(const f of walk(root,[])){
 const lines=fs.readFileSync(f,'utf8').split('\n');
 lines.forEach((l,i)=>{ if(!pats.some(p=>p.test(l)))return; let ts=(l.match(/"timestamp":"([^"]+)"/)||[])[1]; if(ts<'2026-11-04')return;
  let t=(l.match(/"type":"(\w+)"/)||[])[1]; const m=l.match(/(Python was not found|Filename too long)/); const idx=l.indexOf(m[0]);
  console.log(path.relative(root,f),i+1,ts,t,'|',l.slice(Math.max(0,idx-200),idx+120).replace(/\s+/g,' '));});
}
