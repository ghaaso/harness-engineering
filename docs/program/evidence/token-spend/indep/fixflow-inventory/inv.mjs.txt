import fs from 'fs'; import path from 'path'; import readline from 'readline';
const root='C:/Users/User/.claude/projects';
const stores=fs.readdirSync(root).filter(d=>d.startsWith('C--Users-User-Documents-projects-EMS-workshop1')||d.includes('23-FixFlow'));
function countSub(d){let n=0;if(!fs.existsSync(d))return 0;for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())n+=countSub(p);else if(/^agent-.*\.jsonl$/.test(e.name))n++;}return n;}
const out=[];
for(const s of stores){for(const f of fs.readdirSync(path.join(root,s))){if(!f.endsWith('.jsonl'))continue;
const sid=f.slice(0,-6);const fp=path.join(root,s,f);
let title=null;try{title=JSON.parse(fs.readFileSync(path.join(root,s,sid,'custom-title.json'),'utf8'));}catch{}
let ncs=0,maxc=0,first=null,last=null,prompt=null,comp=0,cost=null;
const rl=readline.createInterface({input:fs.createReadStream(fp),crlfDelay:Infinity});
for await(const l of rl){
 if(l.startsWith('{"type":"api-request-blob"')||l.startsWith('{"type":"file-history'))continue;
 if(l.includes('"subtype":"compact_boundary"'))comp++;
 if(l.startsWith('{"type":"cost-state"')){try{cost=JSON.parse(l);ncs++;if(cost.totalCostUSD>maxc)maxc=cost.totalCostUSD;}catch{}continue;}
 const m=l.match(/"timestamp":"([^"]+)"/);if(m){if(!first)first=m[1];last=m[1];}
 if(!prompt&&l.includes('"type":"user"')&&!l.includes('"isMeta":true')){try{const j=JSON.parse(l);if(j.type!=="user")continue;const c=j.message?.content;let t=typeof c==="string"?c:Array.isArray(c)?c.filter(b=>b.type==="text").map(b=>b.text).join(" "):"";
  t=t.replace(new RegExp("<system-reminder>[^]*?</system-reminder>","g"),"").trim();
  if(t&&!t.startsWith("<command")&&!t.startsWith("<local-command")&&!t.startsWith("Caveat"))prompt=t.slice(0,500);}catch{}}
}
out.push({store:s.replace('C--Users-User-Documents-projects-EMS-workshop1','EMS').replace(/C--Users-User-OneDrive.*23-FixFlow/,'FixFlowOD'),sid,title,first,last,sub:countSub(path.join(root,s,sid,'subagents')),comp,ncs,maxc,cost:cost&&{total:cost.totalCostUSD,mu:cost.modelUsage},prompt});}}
fs.writeFileSync(process.argv[2],JSON.stringify(out,null,1));console.log(out.length);
