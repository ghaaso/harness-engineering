// Base rate: how often does ANY cross-runtime code-file pair connect within k hops in the lane's
// undirected file-level graph (calls, calls_url, registers_route, depends_injects)? Compare with the
// lane's 30/33 for co-change pairs.
const fs=require('fs'),cp=require('child_process');
const L='C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/research/schema/';
const ROOT='C:/Users/User/Documents/projects/EMS_workshop1';
const py=require(L+'py_graph.json'),ts=require(L+'ts_graph.json');
const routes=py.routes;const rx=p=>new RegExp('^'+p.replace(/\{[^}]+\}/g,'[^/]+')+'/?$');
const E=[];for(const [t,s,d] of py.edges)E.push([t,s,d]);for(const c of ts.calls)E.push(['calls',c.src,c.dst]);
for(const u of ts.urls){const x=u.url.replace(/\{\}/g,'X');const c=routes.filter(r=>rx(r.path).test(x)&&r.method===u.method);if(c.length)E.push(['calls_url',u.site,c[0].id]);}
const fp=id=>id.startsWith('sym:')?((py.nodes[id]||{}).path):id.startsWith('route:')?id:id.includes('#')?id.split('#')[0]:null;
function build(types){const U=new Map();const ad=(a,b)=>{if(!a||!b||a===b)return;(U.get(a)||U.set(a,new Set()).get(a)).add(b)};for(const [t,s,d] of E){if(!types.includes(t))continue;const a=fp(s),b=fp(d);ad(a,b);ad(b,a);}return U;}
function dist(U,a,b,max){if(a===b)return 0;const seen=new Set([a]);let fr=[a];for(let h=1;h<=max;h++){const nx=[];for(const u of fr)for(const v of U.get(u)||[]){if(v===b)return h;if(!seen.has(v)){seen.add(v);nx.push(v)}}fr=nx;if(!nx.length)break;}return null;}
const U=build(['calls','calls_url','registers_route','depends_injects']);
const rt=f=>f.startsWith('backend/')?'b':f.startsWith('technician-app/')?'m':f.startsWith('src/')?'w':'o';
const isTest=f=>/test|__tests__|conftest/.test(f);
const files=[...U.keys()].filter(f=>!f.startsWith('route:'));
// all cross-runtime pairs among files present in the graph
let tot=0;const hist={};
for(let i=0;i<files.length;i++)for(let j=i+1;j<files.length;j++){const a=files[i],b=files[j];const A=rt(a),B=rt(b);if(A===B||A==='o'||B==='o')continue;tot++;const d=dist(U,a,b,8);const k=d==null?'none':d<=5?'<=5':'6-8';hist[k]=(hist[k]||0)+1;}
console.log('graph files',files.length,'all cross-runtime file pairs',tot,JSON.stringify(hist),'share <=5 hops',((hist['<=5']||0)/tot).toFixed(3));
// restricted to backend<->client pairs where neither is a test
let t2=0,c2=0;for(let i=0;i<files.length;i++)for(let j=i+1;j<files.length;j++){const a=files[i],b=files[j];const A=rt(a),B=rt(b);if(A===B||A==='o'||B==='o'||isTest(a)||isTest(b))continue;if(!(A==='b'||B==='b'))continue;t2++;const d=dist(U,a,b,5);if(d!=null)c2++;}
console.log('backend<->client non-test pairs',t2,'connected <=5 hops',c2,(c2/t2).toFixed(3));
