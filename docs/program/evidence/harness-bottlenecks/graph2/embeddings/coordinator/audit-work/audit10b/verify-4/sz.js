const fs=require('fs'),path=require('path');
const G='C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings/export/graphs0';
const rows=[];
for(const d of fs.readdirSync(G)){const f=path.join(G,d,'sizes.json');if(!fs.existsSync(f))continue;const j=JSON.parse(fs.readFileSync(f));
// recount entities and triples from files
const tl=fs.readFileSync(path.join(G,d,'triples.tsv'),'utf8').split('\n').filter(x=>x.trim());
const el=fs.readFileSync(path.join(G,d,'entities.tsv'),'utf8').split('\n').filter(x=>x.trim());
rows.push({sha:d,split:j.splits.join('+'),E:j.entities,T:j.triples,F:j.edges_all_conf,tl:tl.length,el:el.length,t:j.commit_time});}
const med=a=>{a=a.slice().sort((x,y)=>x-y);const n=a.length;return n%2?a[(n-1)/2]:(a[n/2-1]+a[n/2])/2};
const out={n:rows.length};
for(const s of ['tune','heldout']){const r=rows.filter(x=>x.split.includes(s));const mx=r.reduce((a,b)=>b.E>a.E?b:a);
out[s]={n:r.length,medE:med(r.map(x=>x.E)),medT:med(r.map(x=>x.T)),max:mx,maxT:Math.max(...r.map(x=>x.T)),ratio2TV_max:2*mx.T/mx.E,ratio2FV_max:2*mx.F/mx.E,splitsSeen:[...new Set(r.map(x=>x.split))]};}
out.fileCountMismatch=rows.filter(x=>x.tl!==x.T&&x.tl!==x.T+1).map(x=>[x.sha,x.tl,x.T,x.el,x.E]).slice(0,5);
out.sample=rows.slice(0,2).map(x=>[x.tl,x.T,x.el,x.E]);
fs.writeFileSync(__dirname+'/sz-result.json',JSON.stringify(out,null,1));console.log(JSON.stringify(out,null,1));
