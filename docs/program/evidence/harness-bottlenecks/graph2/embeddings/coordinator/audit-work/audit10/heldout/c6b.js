const fs=require('fs'),zlib=require('zlib');
const H='C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings/train/heldout';
const n=p=>zlib.gunzipSync(fs.readFileSync(p)).toString().split('\n').slice(1).filter(Boolean).length;
const t={};for(const f of fs.readdirSync(H+'/tables'))if(f.endsWith('.tsv.gz'))t[f]=n(H+'/tables/'+f);
const s=Object.values(t).reduce((a,b)=>a+b,0);
const g=k=>Object.entries(t).filter(([f])=>k.test(f)).reduce((a,[,v])=>a+v,0);
console.log(JSON.stringify({tables_total:s,alone:g(/^alone/),fused:g(/^fused/),comp:g(/^(PPR|CO|RRF|DIR)/),parts_plus_tables:s+564930,parts_plus_alone_fused:564930+g(/^alone|^fused/)}));
