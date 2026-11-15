const fs=require('fs');
const rows=fs.readFileSync('errors.jsonl','utf8').trim().split('\n').map(JSON.parse);
const pat=new RegExp(process.argv[2]);
const from=process.argv[3]||'0';const to=process.argv[4]||'9';
const step=+process.argv[5]||1;
const m=rows.filter(r=>pat.test(r.t)&&r.ts&&r.ts>=from&&r.ts<=to);
const s=r=>r.f.split('.claude\\projects\\')[1];
console.log(m.length);
m.filter((r,i)=>i%step==0).slice(0,+process.argv[6]||15).forEach(r=>console.log(r.ts,s(r).slice(-95),r.id,'\n   CALL',(r.call&&r.call.input||'').slice(0,160),'\n   ERR',r.t.slice(0,230).replace(/\n/g,' ')));
