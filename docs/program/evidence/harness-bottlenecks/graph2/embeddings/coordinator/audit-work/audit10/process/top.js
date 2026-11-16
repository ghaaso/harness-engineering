const fs=require('fs');const o=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
console.log(Object.keys(o));
for(const k of Object.keys(o)){const v=o[k];if(v&&typeof v==='object'&&!Array.isArray(v))console.log(k,Object.keys(v).slice(0,80).join(','));}
const s=JSON.stringify(o);const m=new Set();for(const x of s.matchAll(/"(E[1-5][A-Za-z0-9_]*|PLACEBO[A-Za-z0-9_]*)"/g))m.add(x[1]);console.log([...m].join(' '));
