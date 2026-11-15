const fs=require('fs'),path=require('path'),rl=require('readline');
const dir=process.argv[2];
(async()=>{
for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.jsonl'))){
  const p=path.join(dir,f); const st=fs.statSync(p);
  const r=rl.createInterface({input:fs.createReadStream(p)});
  let first=null,last=null,n=0;
  for await(const line of r){n++; try{const o=JSON.parse(line); if(o.timestamp){ if(!first)first=o.timestamp; last=o.timestamp;}}catch{} }
  console.log(f.slice(0,12), (st.size/1e6).toFixed(1)+'MB', first, last, n);
}})();
