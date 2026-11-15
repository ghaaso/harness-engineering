const fs=require('fs');
let j=JSON.parse(fs.readFileSync('tasks/'+(process.env.TASK||'w0su8ajqd')+'.output','utf8'));
if(j.result) j=j.result;
if(typeof j==='string'){ try{ j=JSON.parse(j);}catch(e){} }
function shape(o,d,pre){
  if(d>3) return;
  if(Array.isArray(o)){ console.log(pre+'[array '+o.length+']'); if(o.length&&typeof o[0]==='object') shape(o[0],d+1,pre+'  '); return; }
  if(o&&typeof o==='object'){ for(const k of Object.keys(o)){ const v=o[k]; const t=Array.isArray(v)?'array '+v.length:typeof v; const len=typeof v==='string'?v.length:JSON.stringify(v).length; console.log(pre+k+' : '+t+' ('+len+' chars)'); if(v&&typeof v==='object') shape(v,d+1,pre+'  ');} }
}
shape(j,0,'');
