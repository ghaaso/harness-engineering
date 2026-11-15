'use strict';
// For every facts-cache checkpoint: T1 task commits that git says are ancestors-or-equal vs those in its commits.jsonl.
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const B=process.argv[2],REPO='C:/Users/User/Documents/projects/EMS_workshop1';
const T=[...new Set(fs.readFileSync(path.join(__dirname,'aud_truth.jsonl'),'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l).commit))];
let caches=0,gitPairs=0,listPairs=0,missed=0,extra=0;const kinds={};
for(const d of fs.readdirSync(path.join(B,'facts/cache'))){const f=path.join(B,'facts/cache',d,'commits.jsonl');if(!fs.existsSync(f))continue;caches++;
 const L=new Set(fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l).sha));
 const G=new Set(execFileSync('git',['-C',REPO,'rev-list',d],{encoding:'utf8',maxBuffer:1<<26}).split('\n').filter(Boolean));
 for(const c of T){const g=G.has(c),l=L.has(c);gitPairs+=g;listPairs+=l;if(g&&!l)missed++;if(l&&!g)extra++;}
 const fp=new Set(execFileSync('git',['-C',REPO,'rev-list','--first-parent',d],{encoding:'utf8'}).split('\n').filter(Boolean));
 const k=[...L].every(x=>fp.has(x))&&L.size===fp.size?'first_parent':'other';kinds[k]=(kinds[k]||0)+1;}
console.log(JSON.stringify({caches,task_commits:T.length,ancestor_pairs_git:gitPairs,pairs_in_list:listPairs,ancestor_missed_by_list:missed,in_list_not_ancestor:extra,list_kind:kinds}));
