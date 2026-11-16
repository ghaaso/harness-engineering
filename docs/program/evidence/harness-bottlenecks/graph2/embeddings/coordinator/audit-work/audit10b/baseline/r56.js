const r=require('C:/Users/User/Documents/projects/EMS_workshop1/docs/program/evidence/harness-bottlenecks/graph2/embeddings/result.json');
const hits=[];(function walk(o,p){if(o&&typeof o==='object'){for(const k of Object.keys(o)){const q=p+'.'+k;if(/pilot/i.test(k))hits.push([q,JSON.stringify(o[k]).slice(0,700)]);walk(o[k],q);}}})(r,'');
for(const h of hits.slice(0,30))console.log(h[0],'=>',h[1]);
