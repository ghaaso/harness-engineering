const fs=require('fs'),cr=require('crypto');
const t=fs.readFileSync('C:/Users/User/Documents/projects/EMS_workshop1/docs/program/evidence/harness-bottlenecks/graph2/protocol-addendum-8.md','utf8');
const L=t.split('\n');const want='5234d97c6908e583748fe2f8766e847521b27730d7de021e24dfb24f1a5dbf71';
console.log('full',cr.createHash('sha256').update(t).digest('hex'));
for(let i=1;i<=L.length;i++){for(const tail of ['','\n']){const s=L.slice(0,i).join('\n')+tail;const h=cr.createHash('sha256').update(s).digest('hex');if(h===want)console.log('MATCH prefix lines',i,JSON.stringify(tail));
const s2=L.slice(0,i).join('\r\n')+tail.replace('\n','\r\n');if(cr.createHash('sha256').update(s2).digest('hex')===want)console.log('MATCH crlf',i);}}
L.forEach((l,i)=>{if(/^## /.test(l))console.log(i+1,l)});
