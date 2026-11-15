// How much of the scoring lane's ground truth (other files changed in the same commit) is even reachable
// from the seed in the schema lane's typed file graph (built at HEAD: an optimistic upper bound),
// and how big the k-hop neighbourhood is (the precision / token side).
const L='C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/research/';
const py=require(L+'schema/py_graph.json'),ts=require(L+'schema/ts_graph.json');
const pool=require(L+'scoring/task_pool_commits.json').pool.filter(u=>u.n_existing>=2&&u.n_existing<=30);
const routes=py.routes;const rx=p=>new RegExp('^'+p.replace(/\{[^}]+\}/g,'[^/]+')+'/?$');
const E=[];for(const [t,s,d] of py.edges)E.push([t,s,d]);for(const c of ts.calls)E.push(['calls',c.src,c.dst]);
for(const u of ts.urls){const x=u.url.replace(/\{\}/g,'X');const c=routes.filter(r=>rx(r.path).test(x)&&r.method===u.method);if(c.length)E.push(['calls_url',u.site,c[0].id]);}
const fp=id=>id.startsWith('sym:')?((py.nodes[id]||{}).path):id.startsWith('file:')?id.slice(5):id.startsWith('route:')||id.startsWith('table:')?id:id.includes('#')?id.split('#')[0]:null;
function build(types){const U=new Map();const ad=(a,b)=>{if(!a||!b||a===b)return;(U.get(a)||U.set(a,new Set()).get(a)).add(b)};for(const [t,s,d] of E){if(!types.includes(t))continue;const a=fp(s),b=fp(d);ad(a,b);ad(b,a);}return U;}
function ball(U,a,max){const seen=new Map([[a,0]]);let fr=[a];for(let h=1;h<=max;h++){const nx=[];for(const u of fr)for(const v of U.get(u)||[])if(!seen.has(v)){seen.set(v,h);nx.push(v)}fr=nx;}return seen;}
for(const [lab,types] of [['calls+url+route+DI',['calls','calls_url','registers_route','depends_injects']],['+tables',['calls','calls_url','registers_route','depends_injects','writes_table','reads_table']]]){
 const U=build(types);
 for(const H of [1,2,3,4]){let pairs=0,inGraph=0,hit=0;const sizes=[];
  for(const t of pool){for(const seed of t.existing_ctm){if(!U.has(seed))continue;const B=ball(U,seed,H);const files=[...B.keys()].filter(k=>!k.startsWith('route:')&&!k.startsWith('table:')&&k!==seed);sizes.push(files.length);
    for(const tg of t.existing_ctm){if(tg===seed)continue;pairs++;if(U.has(tg))inGraph++;if(B.has(tg))hit++;}}}
  sizes.sort((a,b)=>a-b);
  console.log(lab,'hop',H,'seed-target pairs (seed in graph)',pairs,'target in graph',inGraph,'reached',hit,(hit/pairs).toFixed(3),'| neighbourhood files median',sizes[sizes.length>>1],'p90',sizes[Math.floor(sizes.length*0.9)]);}
}
// how many task files are not in the graph at all (configs, migrations, docs-less files)
let all=0,miss=0;const U=build(['calls','calls_url','registers_route','depends_injects']);const missK={};
for(const t of pool)for(const f of t.existing_ctm){all++;if(!U.has(f)){miss++;const k=/alembic\/versions/.test(f)?'migration':/test/.test(f)?'test':f.split('/')[0];missK[k]=(missK[k]||0)+1}}
console.log('task file mentions',all,'not in file graph',miss,JSON.stringify(missK));
