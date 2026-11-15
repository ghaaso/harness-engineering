const fs=require('fs');
const rows=fs.readFileSync('errors.jsonl','utf8').trim().split('\n').map(JSON.parse);
const pat=new RegExp(process.argv[2]);const m=rows.filter(r=>pat.test(r.t));
const sess=new Set(),proj={},day={};
for(const r of m){
  const rel=r.f.split('\\.claude\\projects\\')[1].split('\\');
  const top=rel[0]+'/'+(rel[1]||'').replace('.jsonl','');
  sess.add(top);
  const pk=rel[0].slice(-40);proj[pk]=(proj[pk]||0)+1;
  const d=(r.ts||"none").slice(0,10);day[d]=(day[d]||0)+1;
}
console.log('errors',m.length,'top-level sessions',sess.size);console.log(proj);console.log(day);
