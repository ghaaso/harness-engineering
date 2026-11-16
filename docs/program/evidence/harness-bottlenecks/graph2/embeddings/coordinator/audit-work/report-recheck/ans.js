const fs=require('fs');const B='C:/Users/User/Documents/projects/EMS_workshop1/docs/program/evidence/harness-bottlenecks/graph2/embeddings/lane/grader-returns/';
const g=JSON.parse(fs.readFileSync(B+'tune-item24.json','utf8'));
console.log(Object.keys(g)); for(const [k,v] of Object.entries(g.labels)) console.log(k, JSON.stringify(v).slice(0,400));
