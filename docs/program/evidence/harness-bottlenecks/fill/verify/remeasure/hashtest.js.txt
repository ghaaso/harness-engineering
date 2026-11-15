const fs=require('fs'),rl=require('readline'),cr=require('crypto');
const f=process.argv[2];const H=s=>cr.createHash('sha256').update(s).digest('hex');
const r=rl.createInterface({input:fs.createReadStream(f)});let n=0;const lines=[];
r.on('line',l=>{let o;try{o=JSON.parse(l)}catch(e){return}
 if(o.type==='api-request-blob'&&n<3){n++;const m=o.message;
  console.log(o.hash.slice(0,12),H(JSON.stringify(m)).slice(0,12),H(JSON.stringify(m.content)).slice(0,12),Object.keys(o).join(','));}
 if(o.type==='assistant'||o.type==='user')lines.push(o);
});
r.on('close',()=>{// try assistant grouped by id
 const want=new Set(fs.readFileSync('miss.txt','utf8').trim().split(/\s+/));
 const byId={};for(const o of lines)if(o.type==='assistant'){(byId[o.message.id]=byId[o.message.id]||[]).push(...o.message.content);}
 let hit=0;for(const id in byId){const c=byId[id];const cands=[{role:'assistant',content:c},{role:'assistant',content:c.map(x=>{const y=Object.assign({},x);delete y.caller;return y})}];for(const m of cands){const h=H(JSON.stringify(m));if(want.has(h)){hit++;console.log('HIT assistant',id);}}}
 for(const o of lines)if(o.type==='user'){for(const m of [o.message,{role:'user',content:o.message.content}]){if(want.has(H(JSON.stringify(m)))){hit++;console.log('HIT user');}}}
 console.log('hits',hit);
 });
