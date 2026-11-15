// Second pass: damping by production in-degree, and string-dispatch (outbox kind) aware metapaths.
const fs=require("fs"),path=require("path");const L=process.argv[2];
const src=fs.readFileSync(path.join(L,"join.js"),"utf8").split("// ---------- traversal ----------")[0].replace("const fs = require(\"fs\");","").replace("const path = require(\"path\");","").replace("const ROOT = process.argv[2];","const ROOT=\"C:/Users/User/Documents/projects/EMS_workshop1\";").replace("const L = process.argv[3];","");
const body=fs.readFileSync(__filename,"utf8").split("//BODY"+"START")[1];
eval(src+body);
//BODYSTART
const prodIn=(id)=>(rev.get(id)||[]).filter(([v,t])=>!isTest(v)&&t!=="registers_route").length;
function bfs(start,adj,maxHop,o={}){const seen=new Map([[start,0]]);let fr=[start];const per=[];
 for(let h=1;h<=maxHop;h++){const nx=[];for(const u of fr){if(o.stop&&u!==start&&o.stop(u))continue;
  for(const [v,t] of adj.get(u)||[]){if(o.types&&!o.types.has(t))continue;if(o.skip&&o.skip(u,v,t))continue;if(o.noTests&&isTest(v))continue;if(!seen.has(v)){seen.set(v,h);nx.push(v);}}}
  per.push(`h${h}:+${nx.length}=${seen.size-1}`);fr=nx;if(!nx.length)break;}return {seen,per};}
const out={};
const tgt="sym:app.features.jobs.service:JobService.submit_completion";
for(const k of [5,10,15]) out["impact submit_completion, no tests, stop if prodIn>"+k]=bfs(tgt,rev,8,{noTests:true,stop:u=>prodIn(u)>k}).per;
const gs="sym:app.core.db:get_session";
for(const k of [5,10,15]) out["reverse get_session stop prodIn>"+k]=bfs(gs,rev,6,{noTests:true,stop:u=>prodIn(u)>k}).per;
// screen -> routes, with and without the string-dispatch hub
const screen="technician-app/src/features/jobs/arrival-job/ArrivalJobBillScreen.tsx#ArrivalJobBillScreen";
const SEND="technician-app/src/lib/outboxSync.ts#send";
const routesOf=(seen)=>[...seen.keys()].filter(k=>k.startsWith("route:")).map(k=>k.slice(6)).sort();
const callsT=new Set(["calls","calls_url","enqueues_kind","kind_handled_by"]);
const a=bfs(screen,fwd,8,{noTests:true,types:callsT});
const b=bfs(screen,fwd,8,{noTests:true,types:callsT,stop:u=>u===SEND||/outboxSync\.ts#flushOutbox/.test(u)});
out.screen_routes_through_send_hub=routesOf(a.seen);
out.screen_routes_kind_aware=routesOf(b.seen);
// who calls send / flushOutbox
out.send_out=(fwd.get(SEND)||[]).map(x=>x[0]);
// tables by route handler: average tables written per mutating route (1 metapath)
const mut=[...N.keys()].filter(k=>k.startsWith("route:POST")||k.startsWith("route:PUT")||k.startsWith("route:DELETE")||k.startsWith("route:PATCH"));
const tw=mut.map(r=>{const s=bfs(r,fwd,6,{noTests:true,types:new Set(["registers_route","calls","writes_table"])}).seen;return [r,[...s.keys()].filter(k=>k.startsWith("table:")).length];}).sort((x,y)=>y[1]-x[1]);
out.mutating_routes=mut.length;out.tables_written_per_mutating_route_top=tw.slice(0,8).map(x=>x.join(" "));out.zero_table_routes=tw.filter(x=>x[1]===0).map(x=>x[0]);
console.log(JSON.stringify(out,null,1));
// cross-runtime co-change pairs: are they connected by the typed graph within k hops (file level, undirected)?
{
const cp2=require("child_process");
const fp=(id)=>id.startsWith("sym:")?((N.get(id)||{}).path):id.startsWith("route:")?id:id.includes("#")?id.split("#")[0]:null;
const U=new Map();const ad=(a,b)=>{if(!a||!b||a===b)return;if(!U.has(a))U.set(a,new Set());U.get(a).add(b);};
for(const [t,s,d] of E){if(!["calls","calls_url","registers_route","depends_injects"].includes(t))continue;const a=fp(s),b=fp(d);ad(a,b);ad(b,a);}
const log=cp2.execFileSync("git",["-C",ROOT,"log","--all","--no-merges","--name-only","--format=@@%h"],{encoding:"utf8",maxBuffer:1<<28});
const code=(f)=>!f.includes("/venv/")&&/\.(py|ts|tsx|js|jsx|mjs)$/.test(f)&&/^(backend|src|technician-app\/src)/.test(f);
const pair=new Map();for(const blk of log.split("@@").slice(1)){const fs_=[...new Set(blk.split("\n").filter(code))];if(fs_.length<2||fs_.length>30)continue;for(let i=0;i<fs_.length;i++)for(let j=i+1;j<fs_.length;j++){const k=[fs_[i],fs_[j]].sort().join(" | ");pair.set(k,(pair.get(k)||0)+1);}}
const rt=f=>f.startsWith("backend/")?"B":f.startsWith("technician-app/")?"M":"W";
const cross=[...pair.entries()].filter(([k,v])=>v>=3&&new Set(k.split(" | ").map(rt)).size>1).map(([k])=>k.split(" | "));
const dist=(a,b,max)=>{let fr=[a];const seen=new Set([a]);for(let h=1;h<=max;h++){const nx=[];for(const u of fr)for(const v of U.get(u)||[]){if(v===b)return h;if(!seen.has(v)){seen.add(v);nx.push(v);}}fr=nx;}return null;};
const hist={};for(const [a,b] of cross){const d=dist(a,b,8);hist[d===null?"none<=8":"h"+d]=(hist[d===null?"none<=8":"h"+d]||0)+1;}
console.log(JSON.stringify({cross_runtime_cochange_pairs_ge3:cross.length,graph_distance_hist:hist}));
}
{
const r=bfs("sym:app.features.jobs.service:JobService.submit_completion",rev,6,{});
const tests=[...r.seen.entries()].filter(([k])=>isTest(k)&&/:test_/.test(k));
const files={};for(const [k,h] of tests){const p=(N.get(k)||{}).path;(files[p]=files[p]||[]).push(h);}
const out2=[];for(const [p,hs] of Object.entries(files)){const t=require("fs").readFileSync(ROOT+"/"+p,"utf8");const ov=/dependency_overrides\[(get_jobs_service|get_service)\]/.test(t);out2.push(`${p.replace("backend/","")} tests=${hs.length} hops=${[...new Set(hs)].join("/")} overrides_jobs_service=${ov}`);}
console.log(out2.join("\n"));
}
process.exit(0);
