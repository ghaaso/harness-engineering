const fs=require('fs');
const rows=fs.readFileSync('errors.jsonl','utf8').trim().split('\n').map(JSON.parse).filter(r=>new RegExp(process.argv[2]).test(r.t)&&r.ts&&r.ts>=process.argv[3]);
const byFile={};for(const r of rows)(byFile[r.f]=byFile[r.f]||[]).push(r.id);
const out=[];
for(const [f,ids] of Object.entries(byFile)){
  const L=fs.readFileSync(f,'utf8').split('\n');
  let uses=[];
  L.forEach((l,i)=>{if(!l)return;let o;try{o=JSON.parse(l)}catch{return}const c=o.message&&o.message.content;if(!Array.isArray(c))return;
    for(const b of c)if(b.type==='tool_use')uses.push({i,id:b.id,name:b.name,len:(b.input.command||'').length,model:o.message.model});});
  for(const id of ids){const k=uses.findIndex(u=>u.id===id);if(k<0)continue;
    const nxt=uses.slice(k+1,k+4).map(u=>u.name+':'+u.len);
    out.push({f:f.split('.claude\\projects\\')[1].slice(-70),id,len:uses[k].len,model:uses[k].model,next:nxt});}
}
out.forEach(o=>console.log(o.len,o.model,o.id,o.f,JSON.stringify(o.next)));
const lens=out.map(o=>o.len).sort((a,b)=>a-b);console.log('min',lens[0],'median',lens[lens.length>>1],'max',lens[lens.length-1],'n',lens.length);
