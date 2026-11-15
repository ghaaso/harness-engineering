const fs=require('fs');
let j=JSON.parse(fs.readFileSync('tasks/'+(process.env.TASK||'w0su8ajqd')+'.output','utf8'));
if(j.result) j=j.result;
const want=process.argv.slice(2);
function pr(o){ if(typeof o==='string') return o; return JSON.stringify(o,null,1); }
for(const w of want){ const [a,b]=w.split('.'); const v=b?j[a][b]:j[a]; console.log('=== '+w+' ==='); if(Array.isArray(v)) v.forEach((x,i)=>console.log('['+i+'] '+pr(x))); else console.log(pr(v)); console.log(''); }
