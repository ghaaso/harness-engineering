import fs from 'node:fs';
const l=fs.readFileSync(process.argv[2],'utf8').trim().split('\n').slice(1).map(r=>r.replace(/"/g,'').split(',')).map(a=>[+a[1],+a[2]]).filter(a=>a[0]===a[0]);
const c=l.map(a=>a[0]);console.log(l.length,'mean',(c.reduce((a,b)=>a+b)/c.length).toFixed(1),'peak',Math.max(...c).toFixed(1),'minfreeMB',Math.min(...l.map(a=>a[1])));
