const fs=require('fs'),path=require('path'),cp=require('child_process');
const L=process.argv[2], R=process.argv[3], TASKS=process.argv[4], OUT=process.argv[5];
const git=(...a)=>cp.execFileSync('git',['-C',R,...a],{encoding:'utf8',maxBuffer:1<<28});
const isAnc=(a,b)=>{try{cp.execFileSync('git',['-C',R,'merge-base','--is-ancestor',a,b]);return true}catch(e){if(e.status===1)return false;throw e}};
const out={errors:[],info:{}};const E=m=>out.errors.push(m);
const plan=JSON.parse(fs.readFileSync(L+'/train/stageB/plan.json','utf8'));
const tuneCk=new Set(plan.checkpoints), hoCk=new Set(plan.heldout.checkpoints);
out.info.n_tune_ck=tuneCk.size; out.info.n_ho_ck=hoCk.size; out.info.s=plan.s;
out.info.tune_assign_n=Object.keys(plan.assignment).length;
out.info.tune_assign_nonself=Object.entries(plan.assignment).filter(([p,c])=>p!==c).length;
out.info.ho_assign_n=Object.keys(plan.heldout.assignment).length;
out.info.ho_assign_nonself=Object.entries(plan.heldout.assignment).filter(([p,c])=>p!==c).length;
out.info.tune_ho_overlap=[...tuneCk].filter(c=>hoCk.has(c));
const tune=fs.readFileSync(L+'/eval/tune_tasks.jsonl','utf8').trim().split('\n').map(JSON.parse);
const tuneById=Object.fromEntries(tune.map(t=>[t.task_id,t]));
out.info.n_tune=tune.length;
const revs={};const rl=c=>revs[c]||(revs[c]=new Set(git('rev-list',c).trim().split('\n')));
const ancCache={};const anc=c=>ancCache[c]||(ancCache[c]=fs.readFileSync(L+'/export/graphs/'+c+'/ancestors.txt','utf8').trim().split(/\r?\n/).filter(Boolean));
const tdir=L+'/train/stageB/tables';const pairs=new Set();let nrows=0;const tabCks=new Set();const ntaskPer={};
for(const f of fs.readdirSync(tdir).filter(f=>f.endsWith('_counts.json'))){
  const c=JSON.parse(fs.readFileSync(tdir+'/'+f,'utf8'));
  for(const [tid,r] of Object.entries(c)){nrows++;tabCks.add(r.checkpoint);pairs.add(r.checkpoint+' '+r.parent);
    const t=tuneById[tid]; if(!t){E('table task not in tune '+f+' '+tid);continue}
    if(t.parent!==r.parent)E('parent mismatch '+f+' '+tid);
    if(plan.assignment[r.parent]!==r.checkpoint)E('assign mismatch '+f+' '+tid);
    if(!tuneCk.has(r.checkpoint))E('table ck not tune '+f+' '+tid);}
  ntaskPer[Object.keys(c).length]=(ntaskPer[Object.keys(c).length]||0)+1;
}
out.info.table_files_by_ntask=ntaskPer;
out.info.table_rows=nrows; out.info.table_ck_distinct=tabCks.size; out.info.table_ck_outside=[...tabCks].filter(c=>!tuneCk.has(c));
for(const t of tune){const C=plan.assignment[t.parent]; if(!C){E('no assign '+t.task_id);continue} pairs.add(C+' '+t.parent);}
function walk(d,acc){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=d+'/'+e.name;if(e.isDirectory())walk(p,acc);else if(e.name==='meta.json')acc.push(p);}return acc}
const parts=walk(L+'/train/stageB/parts',[]);out.info.n_parts=parts.length;const partCks=new Set();const hoNamed=[];let partCountRows=0;
for(const p of parts){const m=JSON.parse(fs.readFileSync(p,'utf8'));partCks.add(m.checkpoint);const dn=path.basename(path.dirname(p));
 if(dn!==m.checkpoint)E('part dir/meta mismatch '+p); if(!tuneCk.has(m.checkpoint))E('part ck not tune '+p); if(hoCk.has(m.checkpoint))hoNamed.push(p);
 const cf=path.dirname(p)+'/counts.json'; if(fs.existsSync(cf)){const c=JSON.parse(fs.readFileSync(cf,'utf8'));for(const [tid,r] of Object.entries(c)){partCountRows++;if(r.checkpoint!==m.checkpoint)E('part counts ck mismatch '+p+' '+tid);const t=tuneById[tid];if(!t)E('part task not tune '+tid);else if(plan.assignment[t.parent]!==m.checkpoint)E('part task assign mismatch '+tid);}}}
let dirNamesOutside=[];const PB=L+'/train/stageB/parts';for(const a of fs.readdirSync(PB))for(const c of fs.readdirSync(PB+'/'+a))for(const s of fs.readdirSync(PB+'/'+a+'/'+c))for(const k of fs.readdirSync(PB+'/'+a+'/'+c+'/'+s))if(!tuneCk.has(k))dirNamesOutside.push([a,c,s,k].join('/'));
out.info.parts_ck_distinct=partCks.size;out.info.parts_naming_heldout=hoNamed.length;out.info.parts_dirs_outside_tune=dirNamesOutside;out.info.part_count_rows=partCountRows;
out.info.distinct_CP_pairs=pairs.size;let pf=0,pself=0;for(const pr of pairs){const [C,P]=pr.split(' ');if(C===P)pself++;if(!isAnc(C,P)){pf++;E('not ancestor '+pr)}}
out.info.pairs_self=pself;out.info.pairs_failed=pf;
const histRes={};
for(const C of [...tuneCk,...hoCk]){const a=anc(C);const r=rl(C);const bad=a.filter(x=>!r.has(x));
 histRes[C]={split:tuneCk.has(C)?'tune':'heldout',n_listed:a.length,n_revlist:r.size,lists_self:a.includes(C),not_ancestor:bad.length,dups:a.length-new Set(a).size}; if(bad.length)E('history non-ancestor '+C+' '+bad.slice(0,3));}
out.info.histories=histRes;
let tc=0;for(const t of tune){const C=plan.assignment[t.parent];if(new Set(anc(C)).has(t.commit))E('task commit in history '+t.task_id);if(rl(C).has(t.commit))E('task commit is ancestor of C '+t.task_id);
 const ps=git('rev-list','--parents','-n','1',t.commit).trim().split(' ').slice(1); if(!ps.includes(t.parent))E('parent not git parent '+t.task_id);tc++;}
out.info.tune_task_commit_checked=tc;
// tuning commits named in tune graphs where commit is a later tuning commit (sanity)
const all=fs.readFileSync(TASKS,'utf8').trim().split('\n').map(JSON.parse);
const ho=all.filter(r=>r.split==='heldout'&&r.set==='T1');out.info.n_ho_T1=ho.length;
const hoById=Object.fromEntries(ho.map(h=>[h.id,h]));
out.info.ho_row_keys=[...new Set(ho.flatMap(r=>Object.keys(r)))];
out.info.ho_row_mentions_commit_key=ho.filter(r=>JSON.stringify(r).includes('commit')).length;
const hoParents=new Set(ho.map(r=>r.parent));out.info.ho_parents=hoParents.size;
out.info.ho_parents_eq_plan=[...hoParents].every(p=>hoCk.has(p))&&hoParents.size===hoCk.size;
const used=fs.readFileSync(L+'/train/heldout/tasks_used.jsonl','utf8').trim().split('\n').map(JSON.parse);
out.info.tasks_used_n=used.length;out.info.tasks_used_eq_T1=used.length===ho.length&&used.every(u=>JSON.stringify(u)===JSON.stringify(hoById[u.id]));
const hp=walk(L+'/train/heldout/parts',[]);out.info.ho_parts=hp.length;let hocounts=0;const hoTasks=new Set();let folded=0;
for(const p of hp){const m=JSON.parse(fs.readFileSync(p,'utf8'));const dn=path.basename(path.dirname(p));if(dn!==m.checkpoint)E('ho dir mismatch '+p);if(!hoCk.has(m.checkpoint))E('ho part ck not ho '+p);
 const c=JSON.parse(fs.readFileSync(path.dirname(p)+'/counts.json','utf8'));for(const [tid,r] of Object.entries(c)){hocounts++;hoTasks.add(tid);if(r.parent!==r.checkpoint||r.checkpoint!==m.checkpoint)E('ho ck!=parent '+tid);
  const t=hoById[tid];if(!t)E('ho counts task not T1 heldout '+tid);else if(t.parent!==r.parent)E('ho parent mismatch '+tid);
  for(const k of ['pool','unrestricted'])if(r[k]&&(r[k].seeds_folded||r[k].cands_folded))folded++;}}
out.info.ho_count_rows=hocounts;out.info.ho_tasks_in_counts=hoTasks.size;out.info.ho_folded_nonzero=folded;
// held-out: other held-out parents named in histories
let nameOther=0;for(const C of hoCk){if(anc(C).some(x=>x!==C&&hoCk.has(x)))nameOther++;}out.info.ho_histories_naming_other_ho_parent=nameOther;
let tuneNameHo=0;for(const C of tuneCk){if(anc(C).some(x=>hoCk.has(x)))tuneNameHo++;}out.info.tune_histories_naming_ho_parent=tuneNameHo;
fs.writeFileSync(OUT,JSON.stringify(out,null,1));
console.log(JSON.stringify({errors:out.errors.length,first:out.errors.slice(0,10),info:Object.fromEntries(Object.entries(out.info).filter(([k])=>k!=='histories'))},null,1));
const h=Object.values(histRes);console.log('hist',h.length,'lists_self',h.filter(x=>x.lists_self).length,'nonanc',h.reduce((a,x)=>a+x.not_ancestor,0),'dups',h.reduce((a,x)=>a+x.dups,0),'listed_total',h.reduce((a,x)=>a+x.n_listed,0));
