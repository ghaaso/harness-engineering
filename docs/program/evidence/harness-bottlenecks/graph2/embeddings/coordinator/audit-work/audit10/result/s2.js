const {D,j}=require('./p.js');const o=j(D+'/result.json');
for(const k of Object.keys(o)){const v=o[k];console.log(k, typeof v==='object'&&v?Object.keys(v).slice(0,30).join(','):JSON.stringify(v).slice(0,100));}
console.log(JSON.stringify(o.inputs||o.sources||o.input_sha256,null,1));
