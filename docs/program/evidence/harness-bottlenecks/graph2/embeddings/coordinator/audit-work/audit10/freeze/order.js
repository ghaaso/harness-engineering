const fs=require('fs'),crypto=require('crypto');
const L='C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const D='C:/Users/User/Documents/projects/EMS_workshop1/docs/program/evidence/harness-bottlenecks/graph2/embeddings';
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const mt=p=>{try{return fs.statSync(p).mtime.toISOString()}catch(e){return 'MISSING'}};
const files={
 freeze:L+'/orchestrator/freeze-list.txt',
 selectB_dir:L+'/train/selectB',
 tune:L+'/train/report/tune.json',
 tunerank:L+'/grader-returns/tune-rank.json',
 tuneitem24:L+'/grader-returns/tune-item24.json',
 tunehandoff:L+'/train/report/answer_level/handoff/HANDOFF.json',
 item27:L+'/train/heldout/item27.json',
 item27sha:L+'/train/heldout/item27.json.sha256',
 hprog:L+'/train/heldout/progress.jsonl',
 handoff:L+'/train/heldout/HANDOFF.json',
 launch:L+'/heldout-launch/kge-H1-launch.log',
 heldout:L+'/grader-returns/heldout.json',
 leak:L+'/train/leak_audit/leak_audit.json',
 item22:L+'/train/report/item22.json',
 route:L+'/train/report/e5_route/e5_route.json',
 result:D+'/RESULT.md', resultjson:D+'/result.json', audit:D+'/AUDIT.md', claims:D+'/CLAIMS.md',
 progress:L+'/progress.jsonl', r112:L+'/orchestrator/coordinator-rulings-112.md', trc:L+'/orchestrator/tune_rank_check.js'};
const out={};
for(const[k,p] of Object.entries(files)){let s=null;try{if(fs.statSync(p).isFile())s=sha(p)}catch(e){}out[k]={mtime:mt(p),sha:s};}
const it=JSON.parse(fs.readFileSync(files.item27));out.item27_frozen_at=it.frozen_at;out.item27_chosen=it.chosen;
const hp=fs.readFileSync(files.hprog,'utf8').trim().split('\n').map(x=>JSON.parse(x));
out.hprog_first=hp[0].t;out.hprog_last=hp[hp.length-1].t;out.hprog_lines=hp.length;
out.hprog_starts=hp.filter(x=>x.unit==='start').map(x=>({t:x.t,freeze_sha256:x.freeze_sha256}));
out.hprog_failed=hp.filter(x=>x.status&&/fail/i.test(x.status)).length;
out.hprog_units_done=hp.filter(x=>/^unit\//.test(x.unit)&&x.status==='done').length;
// any line with a freeze/record sha field
out.hprog_sha_fields=[...new Set(hp.flatMap(x=>Object.keys(x).filter(k=>/freeze|record/.test(k))))];
const hj=JSON.parse(fs.readFileSync(files.heldout));
const pick=o=>{const r={};for(const k of ['test','split','handoff_sha256','freeze_sha256','record_sha256','tasks','commits','n_tasks','n_commits']) if(k in o) r[k]=o[k]; if(o.scorer) r.scorer=o.scorer; return r};
out.heldout_fields=pick(hj); out.heldout_keys=Object.keys(hj);
const prog=fs.readFileSync(files.progress,'utf8');out.progress_lines=prog.trim().split('\n').length;
const rj=JSON.parse(fs.readFileSync(files.resultjson));
const found=[];(function walk(o,pth){if(o&&typeof o==='object'){for(const[k,v] of Object.entries(o))walk(v,pth+'.'+k)}else if(typeof o==='string'&&/progress/i.test(pth))found.push([pth,o])})(rj,'');
out.resultjson_progress=found.slice(0,20);
// any 64-hex in result.json equal to progress sha
const ps=out.progress.sha;out.resultjson_contains_progress_sha=JSON.stringify(rj).includes(ps);
// test returns
const tests={};
for(const d of fs.readdirSync(L+'/grader-returns')){const p=L+'/grader-returns/'+d;if(!fs.statSync(p).isDirectory())continue;tests[d]={};for(const f of fs.readdirSync(p)){const j=JSON.parse(fs.readFileSync(p+'/'+f));tests[d][f]={mtime:mt(p+'/'+f),test:j.test,split:j.split,handoff_sha256:j.handoff_sha256,scorer_files:j.scorer&&j.scorer.files_sha256};}}
out.tests=tests;
for(const f of ['tune-rank.json','tune-item24.json']){const j=JSON.parse(fs.readFileSync(L+'/grader-returns/'+f));out['real_'+f]={test:j.test,split:j.split,handoff_sha256:j.handoff_sha256,scorer:j.scorer&&j.scorer.files_sha256,keys:Object.keys(j)};}
// earliest/latest mtimes under the three dirs
function walkDir(d,acc){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=d+'/'+e.name;if(e.isDirectory())walkDir(p,acc);else acc.push([p.slice(L.length+1),fs.statSync(p).mtimeMs])}return acc}
const FT=Date.parse('2026-11-15T16:48:03Z');
out.dirs={};
for(const d of ['train/selectB','train/report','train/heldout']){const a=walkDir(L+'/'+d,[]);a.sort((x,y)=>x[1]-y[1]);out.dirs[d]={n:a.length,before_freeze:a.filter(x=>x[1]<FT).map(x=>[x[0],new Date(x[1]).toISOString()]),earliest:a.slice(0,3).map(x=>[x[0],new Date(x[1]).toISOString()]),latest:a.slice(-3).map(x=>[x[0],new Date(x[1]).toISOString()])};}
fs.writeFileSync('C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/coord/audit10/freeze/order-result.json',JSON.stringify(out,null,1));
console.log(JSON.stringify(out,null,1));
