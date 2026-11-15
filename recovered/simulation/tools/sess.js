// usage: node sess.js <sessionFile> <regex>  -> models, first ts, usage sums, and hits with timestamps
const fs=require('fs'),path=require('path'),rl=require('readline');
const p=process.argv[2], re=new RegExp(process.argv[3],'i');
(async()=>{
 const r=rl.createInterface({input:fs.createReadStream(p)}); const models={}; let first,last,n=0,inTok=0,cr=0,cc=0,out=0; const hits=[];
 for await(const line of r){ let o; try{o=JSON.parse(line)}catch{continue} n++;
  if(o.timestamp){if(!first)first=o.timestamp; last=o.timestamp;}
  const m=o.message&&o.message.model; if(m)models[m]=(models[m]||0)+1;
  const u=o.message&&o.message.usage; if(u){inTok+=u.input_tokens||0;cr+=u.cache_read_input_tokens||0;cc+=u.cache_creation_input_tokens||0;out+=u.output_tokens||0;}
  if(re.test(line)&&hits.length<12){const i=line.search(re); hits.push(o.timestamp+' '+(o.type||'')+' '+line.slice(Math.max(0,i-160),i+200).replace(/\n/g,' '));}
 }
 console.log(JSON.stringify({first,last,n,models,inTok,cr,cc,out}));
 const sub=path.join(path.dirname(p),path.basename(p,'.jsonl'),'subagents'); if(fs.existsSync(sub))console.log('subagents:',fs.readdirSync(sub).filter(x=>x.endsWith('.jsonl')).length);
 hits.forEach(h=>console.log('  ',h));
})();
