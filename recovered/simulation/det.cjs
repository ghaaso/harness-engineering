const fs=require('fs');
const rows=fs.readFileSync('errors.jsonl','utf8').trim().split('\n').map(JSON.parse);
const pat=new RegExp(process.argv[2]);
const m=rows.filter(r=>pat.test(r.t));
const by={};
for(const r of m){const k=r.f;(by[k]=by[k]||[]).push(r)}
const arr=Object.entries(by).map(([f,v])=>[v[0].ts,f.replace(/.*projects[\/]/,'').replace(/-Users-User-AppData-Local-Claude-Data-claude-pzs8sxrjxfjjc-scratch-workspaces-/,'SW-'),v.length]).sort();
console.log(m.length,arr.length);
arr.forEach(a=>console.log(a.join(' | ')));
console.log(JSON.stringify(m[0],null,1).slice(0,1200));
