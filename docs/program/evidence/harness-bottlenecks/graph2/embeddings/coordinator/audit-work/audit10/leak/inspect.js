const fs=require('fs');const L=process.argv[2];
const p=JSON.parse(fs.readFileSync(L+'/train/stageB/plan.json','utf8'));
function shape(o,d){if(d>2)return typeof o;if(Array.isArray(o))return ['arr'+o.length, shape(o[0],d+1)];if(o&&typeof o==='object'){const r={};for(const k of Object.keys(o).slice(0,12))r[k]=shape(o[k],d+1);r._n=Object.keys(o).length;return r;}return typeof o==='string'?o.slice(0,60):o;}
console.log(JSON.stringify(shape(p,0),null,1).slice(0,4000));
