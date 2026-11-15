// Independent traversal over the lane's py_graph.json edges (own BFS, own test filter).
const L='C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/research/schema/';
const g=require(L+'py_graph.json');const E=g.edges;
const isT=s=>/(^|[.:/])tests?([.:/]|$)|[.:]test_|conftest/.test(s);
const types={};E.forEach(e=>types[e[0]]=(types[e[0]]||0)+1);
const rr=E.filter(e=>e[0]==='registers_route');console.log('registers_route sample',JSON.stringify(rr[0]));
function adj(filter){const f=new Map(),r=new Map();for(const e of E){if(!filter(e))continue;(f.get(e[1])||f.set(e[1],[]).get(e[1])).push(e[2]);(r.get(e[2])||r.set(e[2],[]).get(e[2])).push(e[1]);}return {f,r};}
function bfs(start,A,max){const seen=new Map([[start,0]]);let fr=[start];for(let h=1;h<=max;h++){const nx=[];for(const u of fr)for(const v of A.get(u)||[])if(!seen.has(v)){seen.set(v,h);nx.push(v);}fr=nx;if(!nx.length)break;}return seen;}
// Route nodes: find how routes connect to handlers
const routeNodes=[...new Set(rr.flatMap(e=>[e[1],e[2]]).filter(x=>x.startsWith('route:')))];
console.log('route nodes',routeNodes.length);
const mut=routeNodes.filter(r=>/^route:(POST|PUT|PATCH|DELETE)/.test(r));console.log('mutating',mut.length);
for(const withUow of [true,false]){
 const A=adj(e=>(e[0]==='registers_route'||e[0]==='calls'||e[0]==='writes_table')&&!isT(e[1])&&!isT(e[2])&&(withUow||!(e[3]&&e[3].via==='unit_of_work')));
 // registers_route direction: if route is e[2], use reverse for that hop -> make undirected for registers_route only
 const F=new Map(A.f);for(const e of rr){if(e[2].startsWith('route:')){(F.get(e[2])||F.set(e[2],[]).get(e[2])).push(e[1]);}}
 const zero=mut.filter(r=>![...bfs(r,F,6).keys()].some(k=>k.startsWith('table:')));
 console.log('withUoW',withUow,'zero-table mutating routes',zero.length,zero.join(' | '));
}
// reverse reach over production backend functions, tests excluded, all edge types except registers_route/defines? use calls + depends_injects + passes_callable
const P=adj(e=>['calls','depends_injects','passes_callable'].includes(e[0])&&!isT(e[1])&&!isT(e[2]));
const nodes=[...new Set(E.filter(e=>['calls','depends_injects','passes_callable','defines'].includes(e[0])).flatMap(e=>[e[1],e[2]]).filter(x=>x.startsWith('sym:')&&!isT(x)))];
const fnNodes=[...new Set(E.filter(e=>e[0]==='defines').map(e=>e[2]).filter(x=>x.startsWith('sym:')&&!isT(x)))];
console.log('prod sym nodes (defined)',fnNodes.length);
const q=(a,p)=>{const s=[...a].sort((x,y)=>x-y);return s[Math.min(s.length-1,Math.floor(p*s.length))]};
for(const H of [1,2,3,4,6]){const sizes=fnNodes.map(n=>bfs(n,P.r,H).size-1);let mx=0,arg='';fnNodes.forEach((n,i)=>{if(sizes[i]>mx){mx=sizes[i];arg=n}});console.log('hop',H,'median',q(sizes,0.5),'p90',q(sizes,0.9),'max',mx,arg);}
const gs='sym:app.core.db:get_session';console.log('get_session direct prod dependants',(P.r.get(gs)||[]).length, 'depends_injects only',E.filter(e=>e[0]==='depends_injects'&&e[2]===gs&&!isT(e[1])).length);
