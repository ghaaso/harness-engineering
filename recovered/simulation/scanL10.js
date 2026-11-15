const fs=require('fs'),path=require('path');
const root='C:/Users/User/.claude/projects';
const pats=[/Filename too long/,/Python was not found/,/python: command not found/];
function walk(d,o){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p,o);else if(p.endsWith('.jsonl'))o.push(p);}return o;}
const files=walk(root,[]);
for(const f of files){
 let txt;try{txt=fs.readFileSync(f,'utf8')}catch(e){continue}
 if(!pats.some(p=>p.test(txt)))continue;
 const lines=txt.split('\n');let hits={};
 lines.forEach((l,i)=>{for(const [k,p] of pats.entries()){if(p.test(l)){let ts=(l.match(/"timestamp":"([^"]+)"/)||[])[1];(hits[k]=hits[k]||[]).push([i+1,ts])}}});
 console.log(f.replace(root,''),Object.entries(hits).map(([k,v])=>k+':'+v.length+' first '+v[0].join('@')+' last '+v[v.length-1].join('@')).join(' | '));
}
