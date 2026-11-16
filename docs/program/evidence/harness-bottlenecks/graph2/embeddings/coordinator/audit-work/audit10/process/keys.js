const fs=require('fs');const o=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
function walk(x,p,d){if(d>3)return;if(Array.isArray(x)){console.log(p,'[array',x.length+']');if(x.length&&typeof x[0]==='object')walk(x[0],p+'[0]',d+1);return}
if(x&&typeof x==='object'){for(const k of Object.keys(x)){const v=x[k];if(v&&typeof v==='object')walk(v,p+'.'+k,d+1);else console.log(p+'.'+k,'=',JSON.stringify(v).slice(0,200))}}}
walk(o,'',0);
