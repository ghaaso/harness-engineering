const fs=require('fs');const t=JSON.parse(fs.readFileSync(process.argv[2]+'/train/report/tune.json','utf8'));
console.log(Object.keys(t));
const w=(o,p,d)=>{if(d>6||!o||typeof o!=='object')return;for(const k of Object.keys(o)){const q=p+'.'+k;const v=o[k];if(v&&typeof v==='object'&&'diff' in v&&/E[24]/.test(q)&&/alone/.test(q)&&/unres/i.test(q)&&/P10|P@10/i.test(q))console.log(q,JSON.stringify(v));w(v,q,d+1)}};w(t,'t',0);
