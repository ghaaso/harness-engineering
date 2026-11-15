// Co-change pairs (support>=3, code files) vs the earlier naive import graph + this lane's call/DI/URL pairs.
const fs=require("fs"),path=require("path"),cp=require("child_process");const ROOT=process.argv[2],L=process.argv[3];
const g=JSON.parse(fs.readFileSync(path.join(ROOT,"docs/program/evidence/harness-bottlenecks/graph/graph.json"),"utf8"));
const imp=new Set();for(const [a,b,t] of g.edges) if(t==="import"||t==="mock") imp.add([g.files[a],g.files[b]].sort().join(" | "));
const log=cp.execFileSync("git",["-C",ROOT,"log","--all","--no-merges","--name-only","--format=@@%h"],{encoding:"utf8",maxBuffer:1<<28});
const code=(f)=>!f.includes("/venv/")&&/\.(py|ts|tsx|js|jsx|mjs)$/.test(f)&&/^(backend|src|technician-app\/src|ops-server)/.test(f);
const pair=new Map();for(const blk of log.split("@@").slice(1)){const fs_=[...new Set(blk.split("\n").filter(code))];if(fs_.length<2||fs_.length>30)continue;for(let i=0;i<fs_.length;i++)for(let j=i+1;j<fs_.length;j++){const k=[fs_[i],fs_[j]].sort().join(" | ");pair.set(k,(pair.get(k)||0)+1);}}
const now=new Set(cp.execFileSync("git",["-C",ROOT,"ls-files"],{encoding:"utf8"}).split("\n"));
const rt=f=>f.startsWith("backend/")?"B":f.startsWith("technician-app/")?"M":"W";
const sameSlice=k=>{const [a,b]=k.split(" | ");const s=f=>(f.match(/features\/([^/]+)\//)||[])[1];return s(a)&&s(a)===s(b);};
for(const n of [3,5]){const s=[...pair.entries()].filter(([k,v])=>v>=n&&k.split(" | ").every(f=>now.has(f)));
 const ni=s.filter(([k])=>!imp.has(k));const cross=ni.filter(([k])=>new Set(k.split(" | ").map(rt)).size>1);
 const test=ni.filter(([k])=>/test/.test(k));
 console.log(`support>=${n}: ${s.length} pairs among current files; not import/mock-linked ${ni.length}; of those cross-runtime ${cross.length}, same capability folder ${ni.filter(([k])=>sameSlice(k)).length}, involving a test file ${test.length}`);}
