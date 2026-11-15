const fs=require('fs'),z=require('zlib'),p=process.argv[2];
const tasks=fs.readFileSync(p+'/eval/tune_tasks.jsonl','utf8').trim().split('\n').map(JSON.parse);
console.log(Object.keys(tasks[0]));
const ids=new Set(tasks.filter(t=>t.late50).map(t=>t.task_id));console.log('late50',ids.size);
for(const sc of ['pool','unrestricted']){const L=z.gunzipSync(fs.readFileSync(p+'/eval/comparators/CO_'+sc+'.tsv.gz')).toString().split('\n');const s=new Set(L.slice(1).map(l=>l.split('\t')[0]));let a=0;for(const i of ids)if(!s.has(i))a++;console.log(sc,'absent',a,'header',L[0]);}
