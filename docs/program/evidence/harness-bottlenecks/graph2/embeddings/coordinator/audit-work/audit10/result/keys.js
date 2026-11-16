const fs=require('fs');
function walk(o,p,d){ if(d>3) return; if(o&&typeof o==='object'&&!Array.isArray(o)){ for(const k of Object.keys(o)){ const v=o[k]; console.log(p+'.'+k+' : '+(Array.isArray(v)?'array['+v.length+']':typeof v==='object'&&v?'{'+Object.keys(v).length+'}':JSON.stringify(v).slice(0,80))); walk(v,p+'.'+k,d+1);} } }
const f=process.argv[2]; walk(JSON.parse(fs.readFileSync(f,'utf8')),'',+process.argv[3]||0);
