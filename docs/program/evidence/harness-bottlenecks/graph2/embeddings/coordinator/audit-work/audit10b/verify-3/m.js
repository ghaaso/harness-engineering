const fs=require('fs');const L='C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const m=JSON.parse(fs.readFileSync(L+'/eval/comparators/metrics.json','utf8'));
const out={};for(const k of Object.keys(m)){out[k]={};for(const w of Object.keys(m[k]))out[k][w]=m[k][w]['P@10'];}
const t=fs.readFileSync(L+'/eval/tune_tasks.jsonl','utf8').split('\n').filter(Boolean).map(JSON.parse);
const c=new Map();for(const x of t)c.set(x.commit,{d:x.date_order,l:!!x.late50,p:!!x.late50_pilot,po:x.pilot_order});
const arr=[...c.entries()];
const res={p10:out,keys:Object.keys(t[0]),ncommits:arr.length,late50:arr.filter(a=>a[1].l).length,pilot:arr.filter(a=>a[1].p).length,
pilotOnly:arr.filter(a=>a[1].p&&!a[1].l).map(a=>[a[0].slice(0,8),a[1].d,a[1].po]),dateOnly:arr.filter(a=>!a[1].p&&a[1].l).map(a=>[a[0].slice(0,8),a[1].d,a[1].po]),
tasksLate50:t.filter(x=>x.late50).length,tasksPilot:t.filter(x=>x.late50_pilot).length,tasksShared:t.filter(x=>x.late50&&x.late50_pilot).length};
fs.writeFileSync('m-result.json',JSON.stringify(res,null,1));console.log(JSON.stringify(res,null,1));
