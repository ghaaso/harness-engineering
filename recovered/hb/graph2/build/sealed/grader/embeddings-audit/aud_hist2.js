'use strict';
// Missed (checkpoint, task commit) ancestor pairs by split; and whether a missed task commit's file stats look special.
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const B=process.argv[2],REPO='C:/Users/User/Documents/projects/EMS_workshop1';
const rows=fs.readFileSync(path.join(__dirname,'aud_truth.jsonl'),'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
const sp=new Map(rows.map(r=>[r.commit,r.split]));const parents=new Set(rows.map(r=>r.parent));
const out={missed_heldout_commit:0,missed_tune_commit:0,missed_where_checkpoint_is_a_task_parent:0,distinct_missed_commits:new Set(),missed_commit_in_some_list:0};
const lists={};
for(const d of fs.readdirSync(path.join(B,'facts/cache'))){const f=path.join(B,'facts/cache',d,'commits.jsonl');if(!fs.existsSync(f))continue;
 lists[d]=new Set(fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l).sha));}
for(const [d,L] of Object.entries(lists)){
 const G=new Set(execFileSync('git',['-C',REPO,'rev-list',d],{encoding:'utf8',maxBuffer:1<<26}).split('\n').filter(Boolean));
 for(const [c,s] of sp){if(G.has(c)&&!L.has(c)){out['missed_'+s+'_commit']++;out.distinct_missed_commits.add(c);if(parents.has(d))out.missed_where_checkpoint_is_a_task_parent++;}}}
const dm=[...out.distinct_missed_commits];out.distinct_missed_commits=dm.length;
out.distinct_missed_by_split={tune:dm.filter(c=>sp.get(c)==='tune').length,heldout:dm.filter(c=>sp.get(c)==='heldout').length};
const R=JSON.parse(fs.readFileSync(path.join(B,'facts/cache',Object.keys(lists)[0],'commits.jsonl'),'utf8').split('\n')[0]);out.list_row_keys=Object.keys(R);
console.log(JSON.stringify(out));
