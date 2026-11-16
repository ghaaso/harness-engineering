const fs=require('fs');const p=process.argv[2];const j=JSON.parse(fs.readFileSync(p,'utf8'));
const out=[];for(const b of j.blocks){const c={};for(const k of Object.keys(b))if(!/commits/.test(k))c[k]=b[k];out.push(JSON.stringify(c).slice(0,600));}
for(const k of Object.keys(j))if(!['blocks','outputs','stamp'].includes(k))out.push(k+': '+JSON.stringify(j[k]).slice(0,800));
fs.writeFileSync(process.argv[3],out.join('\n'));console.log(out.join('\n'));
