const fs=require('fs');const o=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
let v=o; for(const k of (process.argv[3]||'').split('.').filter(Boolean)) v=v[k];
console.log(JSON.stringify(v,null,1).slice(0,+process.argv[4]||4000));
