const fs=require('fs');const B='C:/Users/User/Documents/projects/EMS_workshop1/docs/program/evidence/harness-bottlenecks/graph2/embeddings/lane/';
const t=JSON.parse(fs.readFileSync(B+'train/report/tune.json','utf8'));
const c=t.choices.E1; console.log(Object.keys(c)); for(const k of Object.keys(c)) console.log(k, JSON.stringify(c[k]).slice(0,400));
