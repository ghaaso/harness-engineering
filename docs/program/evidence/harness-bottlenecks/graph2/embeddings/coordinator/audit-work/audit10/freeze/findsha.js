const j=require('C:/Users/User/Documents/projects/EMS_workshop1/docs/program/evidence/harness-bottlenecks/graph2/embeddings/result.json');
const t='0cce1ffba95a690aedec89a602370b8a329b6e9bf50923b8dcb88a4292b53a4e';
(function w(o,p){if(o&&typeof o==='object'){for(const[k,v] of Object.entries(o))w(v,p+'.'+k)}else if(typeof o==='string'&&o.includes(t))console.log(p,o.length>200?o.slice(0,200):o)})(j,'');
(function w(o,p){if(o&&typeof o==='object'){for(const[k,v] of Object.entries(o)){if(/progress|anchor/i.test(k))console.log('KEY',p+'.'+k,JSON.stringify(v).slice(0,300));w(v,p+'.'+k)}}})(j,'');
