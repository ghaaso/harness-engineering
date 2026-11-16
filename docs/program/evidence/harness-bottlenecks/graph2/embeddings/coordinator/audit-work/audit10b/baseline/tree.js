const fs=require('fs'),cp=require('child_process');
const LANE='C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const FC='C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build/facts/cache';
const code=/^(backend|src|technician-app)\/.*\.(py|ts|tsx|js|jsx|mjs|cjs)$/;
const tasks=fs.readFileSync(LANE+'/eval/tune_tasks.jsonl','utf8').split('\n').filter(Boolean).map(JSON.parse);
const parents=[...new Set(tasks.map(t=>t.parent))];
const res=[];let tot={git:0,ent:0,onlyGit:0,onlyEnt:0,facts_onlyEnt:0,facts_onlyFacts:0};const ex=[];
for(const p of parents){
 const g=new Set(cp.execFileSync('git',['-C','C:/Users/User/Documents/projects/EMS_workshop1','ls-tree','-r','--name-only',p],{maxBuffer:1<<26}).toString().split('\n').filter(x=>code.test(x)));
 const e=new Set();for(const l of fs.readFileSync(LANE+'/export/graphs/'+p+'/entities.tsv','utf8').split('\n').slice(1)){if(!l)continue;const q=l.split('\t');if(q[3]==='1')e.add(q[2]);}
 let f=null;const nf=FC+'/'+p+'/nodes.jsonl';if(fs.existsSync(nf)){f=new Set();for(const l of fs.readFileSync(nf,'utf8').split('\n')){if(!l.trim())continue;const n=JSON.parse(l);if(n.kind==='file'&&n.path&&code.test(n.path))f.add(n.path);}}
 const og=[...g].filter(x=>!e.has(x)),oe=[...e].filter(x=>!g.has(x));
 tot.git+=g.size;tot.ent+=e.size;tot.onlyGit+=og.length;tot.onlyEnt+=oe.length;
 if(f){tot.facts_onlyEnt+=[...e].filter(x=>!f.has(x)).length;tot.facts_onlyFacts+=[...f].filter(x=>!e.has(x)).length;}
 if(og.length||oe.length)ex.push({p:p.slice(0,8),onlyGit:og.slice(0,5),nOnlyGit:og.length,onlyEnt:oe.slice(0,5)});
 // truth/seed files in git tree at parent?
 for(const t of tasks.filter(t=>t.parent===p)){for(const x of [t.seed,...t.truth])if(!g.has(x))ex.push({missingAtParent:x,t:t.task_id});}
}
const out={parents:parents.length,tot,ex:ex.slice(0,40),nEx:ex.length};
fs.writeFileSync(__dirname+'/tree-result.json',JSON.stringify(out,null,1));console.log(JSON.stringify(out,null,1));
