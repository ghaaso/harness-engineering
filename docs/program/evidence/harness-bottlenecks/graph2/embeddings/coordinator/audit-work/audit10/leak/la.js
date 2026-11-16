const fs=require('fs');const j=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
function shape(o,d){if(d>3)return Array.isArray(o)?'arr'+o.length:typeof o;if(Array.isArray(o))return ['arr'+o.length, shape(o[0],d+1)];if(o&&typeof o==='object'){const r={};for(const k of Object.keys(o).slice(0,25))r[k]=shape(o[k],d+1);r._n=Object.keys(o).length;return r;}return typeof o==='string'?o.slice(0,120):o;}
console.log(JSON.stringify(shape(j,0),null,1).slice(0,7000));
for(const k of (process.argv.slice(3)))console.log(k,JSON.stringify(k.split('.').reduce((a,x)=>a&&a[x],j),null,1).slice(0,5000));
