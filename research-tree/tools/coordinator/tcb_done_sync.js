// the journals are the only truth: a stage is done when a journal holds its result (an agent's own early done file does not count)
// usage: node tcb_done_sync.js <build folder> <journal> [<journal> ...]
const fs=require("fs"),path=require("path");const [,,ROOT,...JS]=process.argv;const DONE=path.join(ROOT,"done");fs.mkdirSync(DONE,{recursive:true});
const fname=(l)=>l.replace(/[^A-Za-z0-9_-]/g,"-");const done={};
for(const J of JS){let L=[];try{L=fs.readFileSync(J,"utf8").split("\n").filter(Boolean).map((s)=>{try{return JSON.parse(s)}catch(e){return null}}).filter(Boolean)}catch(e){}
  const lab={};for(const o of L)if(o.type==="started")lab[o.key+":"+o.agentId]=o.label;
  for(const o of L)if(o.type==="result"&&o.result){const l=lab[o.key+":"+o.agentId];if(l)done[l]=o.result}}
for(const l of Object.keys(done)){const f=path.join(DONE,fname(l)+".json");fs.writeFileSync(f+".tmp",JSON.stringify(done[l],null,1));fs.renameSync(f+".tmp",f)}
const labels=Object.keys(done).sort();fs.writeFileSync(path.join(DONE,"ARGS.json"),JSON.stringify({done:labels}));
console.log("stages with a result in the journals ("+labels.length+"): "+labels.join(", "));
