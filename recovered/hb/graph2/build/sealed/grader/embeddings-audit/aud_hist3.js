'use strict';
// Writes missed_pairs.jsonl (sealed): held-out task id + a facts-cache checkpoint that git says descends from its task commit
// while the checkpoint's commits.jsonl does not list that commit. Prints a count.
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const B=process.argv[2],REPO='C:/Users/User/Documents/projects/EMS_workshop1';
const rows=fs.readFileSync(path.join(__dirname,'aud_truth.jsonl'),'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l)).filter(r=>r.split==='heldout');
const out=[];const seen=new Set();
for(const d of fs.readdirSync(path.join(B,'facts/cache'))){const f=path.join(B,'facts/cache',d,'commits.jsonl');if(!fs.existsSync(f))continue;
 const L=new Set(fs.readFileSync(f,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l).sha));
 const G=new Set(execFileSync('git',['-C',REPO,'rev-list',d],{encoding:'utf8',maxBuffer:1<<26}).split('\n').filter(Boolean));
 for(const r of rows) if(G.has(r.commit)&&!L.has(r.commit)&&!seen.has(r.commit)){seen.add(r.commit);out.push({id:r.id,checkpoint:d});}}
fs.writeFileSync(path.join(__dirname,'missed_pairs.jsonl'),out.map(x=>JSON.stringify(x)).join('\n')+'\n');console.log(out.length);
