// usage: node scan.js <rootDir> <regex> [maxFiles]
const fs=require('fs'),path=require('path'),rl=require('readline');
const root=process.argv[2], re=new RegExp(process.argv[3],'i');
function walk(d,out){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name); if(e.isDirectory())walk(p,out); else if(e.name.endsWith('.jsonl'))out.push(p);} return out;}
(async()=>{
 const dirs=fs.readdirSync(root).filter(x=>x.startsWith(process.argv[4]||'C--Bilal'));
 for(const dd of dirs){ for(const p of walk(path.join(root,dd),[])){
  const r=rl.createInterface({input:fs.createReadStream(p)}); let hits=0,first=null,firstTs=null,minTs=null;
  for await(const line of r){ let o; try{o=JSON.parse(line)}catch{continue}
    if(o.timestamp&&!minTs)minTs=o.timestamp;
    if(re.test(line)){hits++; if(!first){firstTs=o.timestamp; const m=line.match(re); const i=line.search(re); first=line.slice(Math.max(0,i-150),i+150).replace(/\n/g,' ');}}
  }
  if(hits) console.log(hits, minTs, firstTs, p.replace(root,''),'\n   ',first);
 }}
})();
