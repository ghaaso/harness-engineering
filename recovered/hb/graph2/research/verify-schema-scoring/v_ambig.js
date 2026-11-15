// Re-check URL->route ambiguity on the lane's extracted URL sites, without the preferServer slice.
const fs=require('fs');
const L='C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/research/schema/';
const ROOT='C:/Users/User/Documents/projects/EMS_workshop1';
const py=require(L+'py_graph.json'),ts=require(L+'ts_graph.json');
const routes=py.routes.map(r=>({...r,server:'backend'}));
const ops=fs.readFileSync(ROOT+'/ops-server.mjs','utf8');
for(const m of ops.matchAll(/pathname === "(\/api\/[^"]+)"(?:\s*&&\s*req\.method === "(\w+)")?/g))routes.push({method:m[2]||'GET',path:m[1],server:'ops-server'});
const rx=p=>new RegExp('^'+p.replace(/\{[^}]+\}/g,'[^/]+')+'/?$');
let amb=[],methodDefaulted=0,total=0;
for(const u of ts.urls.filter(u=>!u.test)){total++;const x=u.url.replace(/\{\}/g,'X');
 const c=routes.filter(r=>rx(r.path).test(x)&&r.method===u.method);
 if(c.length>1)amb.push(u.file+':'+u.line+' '+u.method+' '+u.url+' -> '+c.map(r=>r.server+' '+r.path).join(' , '));
 const anyM=routes.filter(r=>rx(r.path).test(x));
 if(anyM.length&&!c.length)console.log('method miss',u.file,u.line,u.method,u.url,anyM.map(r=>r.method).join(','));}
console.log('prod url sites',total,'matching >1 route by method+path:',amb.length);console.log(amb.join('\n'));
// pytest side
let pamb=[];for(const e of py.edges.filter(e=>e[0]==='calls_url')){const [m,...rest]=e[2].slice(4).split(' ');const x=rest.join(' ').replace(/\{\}/g,'X');const c=routes.filter(r=>r.server==='backend'&&rx(r.path).test(x)&&r.method===m);if(c.length>1)pamb.push(e[2]+' -> '+c.map(r=>r.path).join(' , '));}
console.log('pytest calls matching >1 route',pamb.length);console.log([...new Set(pamb)].join('\n'));
