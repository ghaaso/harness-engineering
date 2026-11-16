const fs=require('fs');const [L,D]=process.argv.slice(2);
const r=JSON.parse(fs.readFileSync(D+'/result.json','utf8'));
const walk=(o,p)=>{if(o&&typeof o==='object')for(const k of Object.keys(o)){const q=p+'.'+k;if(/alone.*unres|unres.*alone/i.test(k))console.log('RJ',q,JSON.stringify(o[k]).slice(0,200));walk(o[k],q)}};walk(r,'r');
console.log('r.verdicts.E2 keys',Object.keys(r.verdicts.E2));
const t=JSON.parse(fs.readFileSync(L+'/train/report/tune.json','utf8'));
const w2=(o,p)=>{if(o&&typeof o==='object')for(const k of Object.keys(o)){const q=p+'.'+k;if(/(E2|E4).*alone.*unres|alone_unrestricted/i.test(q)&&/P10/i.test(q))console.log('TJ',q,JSON.stringify(o[k]).slice(0,250));w2(o[k],q)}};w2(t,'t');
