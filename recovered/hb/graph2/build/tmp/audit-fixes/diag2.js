const path=require('path');const B='/build';const H=require(B+'/arms/common/harness');const {graphFor,openArm}=require(B+'/arms/common/arms');
const ex=require(B+'/audit/fixes/c7_crosscheck.json').examples;const tasks=new Map(H.loadTasks(['T1','T2'],'tune').map(t=>[t.id,t]));
(async()=>{for(const e of ex){const t=tasks.get(e.task);const G=graphFor(t.parent);const rel=await openArm('relational',G);const ref=await openArm('reference',G);const sm=H.mapSeed(G,t.seed);
for(const dn of [{...e.cfg,rank:{mode:'degnorm'}}]){const a=H.normRank(await rel.rank(sm.ids,dn,t.seed)).ranked;const b=H.normRank(await ref.rank(sm.ids,dn,t.seed)).ranked;const mb=new Map(b.map(x=>[x.i,x]));
let nonfin=0,diff=0,ex2=[];for(const x of a){const y=mb.get(x.i);if(y.score===null)nonfin++;if(x.score!==y.score){diff++;if(ex2.length<3)ex2.push({i:x.i,kind:G.nodes[x.i-1].kind,rel:x.score,ref:y.score,hop:x.hop,via:x.via})}}
console.log(e.task,'degnorm alone: nodes',a.length,'score diffs',diff,'ref null scores',nonfin,'rel null',a.filter(x=>x.score===null).length,JSON.stringify(ex2));}
await rel.close();await ref.close();}})();
