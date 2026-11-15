import fs from 'fs';import path from 'path';import rl from 'readline';
const root='C:/Users/User/.claude/projects';
const stores=fs.readdirSync(root).filter(d=>d.includes('Clinic-Workshop'));
const out=[];
function walk(d){let n=0;if(!fs.existsSync(d))return 0;for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())n+=walk(p);else if(/^agent-.*\.jsonl$/.test(e.name))n++;}return n;}
for(const s of stores){const sd=path.join(root,s);
for(const f of fs.readdirSync(sd).filter(x=>x.endsWith('.jsonl'))){
const sid=f.slice(0,-6);let title=null;
try{const t=JSON.parse(fs.readFileSync(path.join(sd,sid,'custom-title.json'),'utf8'));title=t.customTitle||t.title||JSON.stringify(t);}catch{}
const r=rl.createInterface({input:fs.createReadStream(path.join(sd,f)),crlfDelay:Infinity});
let first=null,last=null,prompt=null,comp=0,cost=null;
for await(const l of r){
 if(l.startsWith('{"type":"api-request-blob"')||l.startsWith('{"type":"file-history'))continue;
 if(l.includes('"subtype":"compact_boundary"'))comp++;
 if(l.startsWith('{"type":"cost-state"')){try{cost=JSON.parse(l);}catch{}continue;}
 const m=l.match(/"timestamp":"([^"]+)"/);if(m){if(!first)first=m[1];last=m[1];}
 if(!prompt&&l.includes('"type":"user"')&&l.includes('"role":"user"')&&!l.includes('"isMeta":true')&&l.length<3000000){try{const o=JSON.parse(l);const c=o.message?.content;let t=typeof c==='string'?c:Array.isArray(c)?c.filter(b=>b.type==='text').map(b=>b.text).join(' '):null;if(t&&!t.startsWith('<')&&!t.startsWith('Caveat'))prompt=t.slice(0,3000);else if(t&&!prompt)prompt=t.slice(0,3000);}catch{}}
}
const mu={};if(cost?.modelUsage)for(const[k,v]of Object.entries(cost.modelUsage))mu[k]=Math.round((v.costUSD||0)*100)/100;
out.push({sid,store:s.replace('C--Bilal-Migration-User-Downloads-20-PROJECTS-24-Clinic-Workshop','CW').replace('C--Users-User-OneDrive-Documents-Bilal-Migration-User-Downloads-20-PROJECTS-24-Clinic-Workshop','OD'),title,first,last,sub:walk(path.join(sd,sid,'subagents')),comp,usd:cost?cost.totalCostUSD:null,mu,prompt});
}}
fs.writeFileSync(path.join(path.dirname(new URL(import.meta.url).pathname.slice(1)),'inv.json'),JSON.stringify(out,null,1));
console.log(out.length);
